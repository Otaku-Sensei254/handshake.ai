"use client";

import { useState, useEffect, useCallback } from "react";
import SiteHeader from "@/components/site-header";
import OrganizerAuth from "@/components/organizer-auth";
import { Button } from "@/components/ui/button";
import type { Event, EventSection, EventPrompt, UserEventResponse, Organizer } from "@/lib/types";

interface QAPair {
  prompt_id: string;
  prompt_text: string;
  response_text: string;
}

type SidebarView = "dashboard" | "create" | "events" | "customize";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("organizer_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function OrganizerDashboard() {
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Navigation
  const [activeView, setActiveView] = useState<SidebarView>("dashboard");
  
  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [sections, setSections] = useState<EventSection[]>([]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [responses, setResponses] = useState<UserEventResponse[]>([]);
  
  // Create event state
  const [newEventCode, setNewEventCode] = useState("");
  const [newEventName, setNewEventName] = useState("");
  const [newOrganizerName, setNewOrganizerName] = useState("");
  const [hasSections, setHasSections] = useState(false);
  const [newSections, setNewSections] = useState<Array<{ name: string; code: string }>>([]);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [createError, setCreateError] = useState("");
  
  // UI states
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSavingPrompts, setIsSavingPrompts] = useState(false);
  const [promptMsg, setPromptMsg] = useState({ type: "", text: "" });
  const [activeTab, setActiveTab] = useState<"prompts" | "responses" | "insights" | "sections">("prompts");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState("");

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const res = await fetch("/api/organizer/events", { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.events) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  // Fetch sections for an event
  const fetchSections = useCallback(async (eventId: string) => {
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/sections`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.sections) {
        setSections(data.sections);
      }
    } catch (err) {
      console.error("Failed to load sections", err);
    }
  }, []);

  // Select event
  const handleSelectEvent = useCallback(async (event: Event) => {
    setSelectedEvent(event);
    setIsLoadingDetails(true);
    setActiveTab("prompts");
    setPromptMsg({ type: "", text: "" });
    setInsightsError("");
    try {
      const [promptsRes, respRes] = await Promise.all([
        fetch(`/api/organizer/events/${event.id}/prompts`),
        fetch(`/api/organizer/events/${event.id}/responses`)
      ]);
      const promptsData = await promptsRes.json();
      const respData = await respRes.json();
      if (promptsRes.ok && promptsData.prompts) {
        const textPrompts = promptsData.prompts.map((p: EventPrompt) => p.prompt_text);
        setPrompts(textPrompts.length > 0 ? textPrompts : [""]);
      } else {
        setPrompts([""]);
      }
      if (respRes.ok && respData.responses) {
        setResponses(respData.responses);
      } else {
        setResponses([]);
      }
      await fetchSections(event.id);
      setActiveView("customize");
    } catch (err) {
      console.error("Error loading event details", err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [fetchSections]);

  // Session restore
  useEffect(() => {
    const token = localStorage.getItem("organizer_token");
    if (!token) return;
    fetch("/api/organizer/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(async (data) => {
        if (data.organizer) {
          setOrganizer(data.organizer);
          await fetchEvents();
        } else {
          localStorage.removeItem("organizer_token");
        }
      })
      .catch(() => localStorage.removeItem("organizer_token"))
      .finally(() => setAuthLoading(false));
  }, []);

  // Auto-select first event
  useEffect(() => {
    if (events.length > 0 && !selectedEvent && !isLoadingEvents && activeView === "dashboard") {
      // Don't auto-select, let user choose
    }
  }, [events, selectedEvent, isLoadingEvents, activeView]);

  const handleAuth = (org: Organizer, token: string) => {
    localStorage.setItem("organizer_token", token);
    setOrganizer(org);
    fetchEvents();
  };

  const handleLogout = () => {
    localStorage.removeItem("organizer_token");
    setOrganizer(null);
    setEvents([]);
    setSelectedEvent(null);
    setActiveView("dashboard");
  };

  // Create event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventCode || !newEventName) return;
    setIsCreatingEvent(true);
    setCreateError("");
    try {
      const res = await fetch("/api/organizer/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          code: newEventCode,
          name: newEventName,
          organizerName: organizer?.name || newOrganizerName,
          matchScope: hasSections ? "section" : "event"
        }),
      });
      const data = await res.json();
      if (res.ok && data.event) {
        // Create sections if any
        if (hasSections && newSections.length > 0) {
          for (const section of newSections) {
            if (section.name && section.code) {
              await fetch(`/api/organizer/events/${data.event.id}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ name: section.name, code: section.code }),
              });
            }
          }
        }
        setNewEventCode("");
        setNewEventName("");
        setNewOrganizerName("");
        setHasSections(false);
        setNewSections([]);
        await fetchEvents();
        setActiveView("events");
      } else {
        setCreateError(data.error || "Failed to create event");
      }
    } catch {
      setCreateError("Failed to connect to server");
    } finally {
      setIsCreatingEvent(false);
    }
  };

  // Prompts
  const handleAddPrompt = () => setPrompts([...prompts, ""]);
  const handleRemovePrompt = (index: number) => setPrompts(prompts.filter((_, i) => i !== index));
  const handlePromptChange = (index: number, value: string) => {
    const updated = [...prompts];
    updated[index] = value;
    setPrompts(updated);
  };

  const handleSavePrompts = async () => {
    if (!selectedEvent) return;
    setIsSavingPrompts(true);
    setPromptMsg({ type: "", text: "" });
    try {
      const cleanPrompts = prompts.filter((p) => p.trim() !== "");
      const res = await fetch(`/api/organizer/events/${selectedEvent.id}/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ prompts: cleanPrompts }),
      });
      if (res.ok) {
        setPromptMsg({ type: "success", text: "Prompts saved!" });
        setPrompts(cleanPrompts.length > 0 ? cleanPrompts : [""]);
      } else {
        const data = await res.json();
        setPromptMsg({ type: "error", text: data.error || "Failed to save prompts" });
      }
    } catch {
      setPromptMsg({ type: "error", text: "Error connecting to the server" });
    } finally {
      setIsSavingPrompts(false);
    }
  };

  // Sections
  const handleAddSection = () => setNewSections([...newSections, { name: "", code: "" }]);
  const handleRemoveSection = (index: number) => setNewSections(newSections.filter((_, i) => i !== index));
  const handleSectionChange = (index: number, field: "name" | "code", value: string) => {
    const updated = [...newSections];
    updated[index] = { ...updated[index], [field]: field === "code" ? value.toUpperCase().replace(/\s+/g, "") : value };
    setNewSections(updated);
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!selectedEvent) return;
    try {
      await fetch(`/api/organizer/events/${selectedEvent.id}/sections?sectionId=${sectionId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      await fetchSections(selectedEvent.id);
    } catch (err) {
      console.error("Failed to delete section", err);
    }
  };

  // Insights
  const handleGenerateInsights = async () => {
    if (!selectedEvent) return;
    setIsGeneratingInsights(true);
    setInsightsError("");
    try {
      const res = await fetch(`/api/organizer/events/${selectedEvent.id}/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      const data = await res.json();
      if (res.ok && data.insights) {
        setSelectedEvent({ ...selectedEvent, ai_insights: data.insights });
        setEvents(events.map(e => e.id === selectedEvent.id ? { ...e, ai_insights: data.insights } : e));
      } else {
        setInsightsError(data.error || "Failed to generate insights.");
      }
    } catch {
      setInsightsError("Error connecting to server to generate insights.");
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("### ")) {
        return <h4 key={idx} className="text-sm font-semibold text-white mt-4 mb-2">{trimmed.slice(4)}</h4>;
      }
      if (trimmed.startsWith("## ")) {
        return <h3 key={idx} className="text-base font-bold text-white mt-6 mb-3">{trimmed.slice(3)}</h3>;
      }
      if (trimmed.startsWith("# ")) {
        return <h2 key={idx} className="text-lg font-black text-white mt-6 mb-4">{trimmed.slice(2)}</h2>;
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const content = trimmed.slice(2);
        return (
          <ul key={idx} className="list-disc pl-5 text-xs text-[var(--muted)] my-1">
            <li>{parseInlineFormatting(content)}</li>
          </ul>
        );
      }
      if (trimmed === "") return <div key={idx} className="h-2" />;
      return <p key={idx} className="text-xs text-[var(--muted)] leading-relaxed my-2">{parseInlineFormatting(trimmed)}</p>;
    });
  };

  const parseInlineFormatting = (text: string) => {
    const parts = text.split(/\*\*([\s\S]+?)\*\*/g);
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part);
  };

  // Auth loading
  if (authLoading) {
    return (
      <>
        <div className="page-bg" />
        <div className="page-content min-h-screen pb-16">
          <SiteHeader active="organizer" />
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-sm text-[var(--muted)]">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  // Auth form
  if (!organizer) {
    return (
      <>
        <div className="page-bg" />
        <div className="page-content min-h-screen pb-16">
          <SiteHeader active="organizer" />
          <OrganizerAuth onAuth={handleAuth} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-bg" />
      <div className="page-content min-h-screen pb-16">
        <SiteHeader active="organizer" />

        <div className="flex h-[calc(100vh-56px)]">
          {/* Sidebar */}
          <aside className="w-64 border-r border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md flex flex-col shrink-0">
            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30 flex items-center justify-center text-[var(--success)] text-sm font-bold">
                  O
                </span>
                <div className="truncate">
                  <p className="text-sm font-medium text-white truncate">{organizer.name}</p>
                  <p className="text-[10px] text-[var(--muted)]">Organizer</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-3 space-y-1">
              <SidebarButton
                icon="📊"
                label="Dashboard"
                active={activeView === "dashboard"}
                onClick={() => setActiveView("dashboard")}
              />
              <SidebarButton
                icon="➕"
                label="Create Event"
                active={activeView === "create"}
                onClick={() => setActiveView("create")}
              />
              <SidebarButton
                icon="🎟️"
                label="Events"
                active={activeView === "events"}
                onClick={() => setActiveView("events")}
                badge={events.length}
              />
              {selectedEvent && (
                <SidebarButton
                  icon="⚙️"
                  label="Customize Event"
                  active={activeView === "customize"}
                  onClick={() => setActiveView("customize")}
                />
              )}
            </nav>

            <div className="p-3 border-t border-[var(--border)]">
              <button
                onClick={handleLogout}
                className="w-full text-left text-xs text-[var(--muted)] hover:text-[var(--error)] px-3 py-2 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {/* Dashboard View */}
            {activeView === "dashboard" && (
              <div className="p-6 space-y-6">
                <div>
                  <h1 className="text-2xl font-semibold text-white">Welcome back, {organizer.name}</h1>
                  <p className="text-sm text-[var(--muted)] mt-1">Manage your events and view participant responses.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard label="Total Events" value={events.length} icon="🎟️" />
                  <StatCard label="Total Responses" value={events.reduce((acc, e) => acc + (responses.length || 0), 0)} icon="💬" />
                  <StatCard label="Active Sections" value={sections.length} icon="📁" />
                </div>

                {events.length > 0 ? (
                  <div className="card">
                    <div className="card-header">Recent Events</div>
                    <div className="p-4 space-y-2">
                      {events.slice(0, 5).map((e) => (
                        <button
                          key={e.id}
                          onClick={() => handleSelectEvent(e)}
                          className="w-full text-left p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-hover)] transition-colors flex items-center justify-between"
                        >
                          <div className="truncate pr-2">
                            <div className="text-xs font-semibold text-white">{e.name}</div>
                            <div className="text-[10px] text-[var(--muted)] mt-0.5">{new Date(e.created_at).toLocaleDateString()}</div>
                          </div>
                          <span className="text-[10px] font-mono shrink-0 px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--success)] font-medium border border-[var(--border)]">
                            {e.code}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="card p-8 text-center">
                    <span className="text-3xl block mb-3">🎟️</span>
                    <h3 className="text-sm font-medium text-white mb-1">No Events Yet</h3>
                    <p className="text-xs text-[var(--muted)] mb-4">Create your first event to get started.</p>
                    <Button onClick={() => setActiveView("create")}>Create Event</Button>
                  </div>
                )}
              </div>
            )}

            {/* Create Event View */}
            {activeView === "create" && (
              <div className="p-6 max-w-2xl">
                <h1 className="text-2xl font-semibold text-white mb-1">Create Event</h1>
                <p className="text-sm text-[var(--muted)] mb-6">Set up a new event for participants to join.</p>

                <form onSubmit={handleCreateEvent} className="card p-6 space-y-5">
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--muted)] mb-1.5 uppercase tracking-wider">Event Code</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. MINIHACK"
                      value={newEventCode}
                      onChange={(e) => setNewEventCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                      required
                    />
                    <p className="text-[10px] text-[var(--muted)] mt-1">Unique code participants use to join: /join YOUR_CODE</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[var(--muted)] mb-1.5 uppercase tracking-wider">Event Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. MiniHack Kenya 2026"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[var(--muted)] mb-1.5 uppercase tracking-wider">Organizer Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Your Name or Organization"
                      value={newOrganizerName || organizer.name}
                      onChange={(e) => setNewOrganizerName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Department/Section Toggle */}
                  <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface-2)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">Does your event have departments or sections?</p>
                        <p className="text-[10px] text-[var(--muted)] mt-0.5">e.g. Computer Science, Business, Design</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setHasSections(!hasSections);
                          if (!hasSections && newSections.length === 0) {
                            setNewSections([{ name: "", code: "" }]);
                          }
                        }}
                        className={`relative w-11 h-6 rounded-full transition-colors ${hasSections ? "bg-[var(--success)]" : "bg-[var(--surface)]"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${hasSections ? "translate-x-5" : ""}`} />
                      </button>
                    </div>

                    {hasSections && (
                      <div className="mt-4 space-y-3">
                        {newSections.map((section, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              className="input flex-1"
                              placeholder="Section name (e.g. Computer Science)"
                              value={section.name}
                              onChange={(e) => handleSectionChange(idx, "name", e.target.value)}
                            />
                            <input
                              type="text"
                              className="input w-24"
                              placeholder="Code"
                              value={section.code}
                              onChange={(e) => handleSectionChange(idx, "code", e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(idx)}
                              className="p-2 border border-[var(--border)] rounded-lg text-[#52525b] hover:text-[var(--error)] hover:border-[var(--error)]/30 bg-[var(--surface)] transition-colors shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={handleAddSection}
                          className="text-xs text-[var(--muted)] hover:text-white flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] rounded-lg hover:border-[var(--border-hover)] bg-[var(--surface)] transition-colors"
                        >
                          ＋ Add Section
                        </button>
                      </div>
                    )}
                  </div>

                  {createError && (
                    <div className="text-xs text-[var(--error)] bg-[var(--error)]/5 border border-[var(--error)]/20 p-2.5 rounded-lg">
                      ⚠️ {createError}
                    </div>
                  )}

                  <Button type="submit" disabled={isCreatingEvent} className="w-full">
                    {isCreatingEvent ? "Creating..." : "Create Event"}
                  </Button>
                </form>
              </div>
            )}

            {/* Events List View */}
            {activeView === "events" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-semibold text-white">Events</h1>
                    <p className="text-sm text-[var(--muted)] mt-1">{events.length} event(s) created</p>
                  </div>
                  <Button onClick={() => setActiveView("create")}>Create Event</Button>
                </div>

                {isLoadingEvents ? (
                  <div className="text-center py-12 text-sm text-[var(--muted)]">Loading events...</div>
                ) : events.length === 0 ? (
                  <div className="card p-12 text-center">
                    <span className="text-3xl block mb-3">🎟️</span>
                    <h3 className="text-sm font-medium text-white mb-1">No Events Yet</h3>
                    <p className="text-xs text-[var(--muted)] mb-4">Create your first event to get started.</p>
                    <Button onClick={() => setActiveView("create")}>Create Event</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => handleSelectEvent(e)}
                        className={`card p-4 text-left hover:border-[var(--border-hover)] transition-colors ${
                          selectedEvent?.id === e.id ? "border-[var(--success)]/40 bg-[var(--success)]/5" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--success)] font-medium border border-[var(--border)]">
                            {e.code}
                          </span>
                          <span className="text-[10px] text-[var(--muted)]">{new Date(e.created_at).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-white mb-1">{e.name}</h3>
                        <p className="text-[10px] text-[var(--muted)]">By {e.organizer_name}</p>
                        {e.match_scope === "section" && (
                          <span className="inline-block mt-2 text-[9px] px-1.5 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20">
                            Sections
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Customize Event View */}
            {activeView === "customize" && selectedEvent && (
              <div className="p-6">
                {/* Event Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20 px-2 py-0.5 rounded-full font-semibold">
                        {selectedEvent.code}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]">
                        /join {selectedEvent.code}
                      </span>
                    </div>
                    <h1 className="text-2xl font-semibold text-white">{selectedEvent.name}</h1>
                  </div>
                  <Button onClick={() => setActiveView("events")} variant="secondary">Back to Events</Button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--border)] gap-2 mb-6">
                  {[
                    { id: "prompts" as const, label: "Prompts" },
                    { id: "responses" as const, label: `Responses (${responses.length})` },
                    { id: "sections" as const, label: `Sections (${sections.length})` },
                    { id: "insights" as const, label: "AI Insights" }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`text-xs font-semibold px-4 py-2.5 border-b-2 transition-colors -mb-[2px] ${
                        activeTab === tab.id
                          ? "border-[var(--success)] text-white"
                          : "border-transparent text-[var(--muted)] hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {isLoadingDetails ? (
                  <div className="card p-8 text-center text-sm text-[var(--muted)]">Loading...</div>
                ) : (
                  <>
                    {/* Prompts Tab */}
                    {activeTab === "prompts" && (
                      <div className="card">
                        <div className="card-header flex items-center justify-between">
                          <span>Custom Prompts</span>
                          <span className="text-[10px] text-[var(--muted)]">Bot asks these in order</span>
                        </div>
                        <div className="p-5 space-y-4">
                          <p className="text-xs text-[var(--muted)]">
                            When users type <span className="text-white font-mono">/join {selectedEvent.code}</span>, the bot asks these questions.
                          </p>
                          <div className="space-y-3">
                            {prompts.map((promptText, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <span className="font-mono text-xs text-[#52525b] w-6 shrink-0 text-right">Q{idx + 1}.</span>
                                <input
                                  type="text"
                                  className="input"
                                  placeholder="e.g. What is your startup project name?"
                                  value={promptText}
                                  onChange={(e) => handlePromptChange(idx, e.target.value)}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemovePrompt(idx)}
                                  className="p-2 border border-[var(--border)] rounded-lg text-[#52525b] hover:text-[var(--error)] hover:border-[var(--error)]/30 bg-[var(--surface-2)] transition-colors shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                            <button
                              type="button"
                              onClick={handleAddPrompt}
                              className="text-xs text-[var(--muted)] hover:text-white flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] rounded-lg hover:border-[var(--border-hover)] bg-[var(--surface-2)] transition-colors"
                            >
                              ＋ Add Question
                            </button>
                            <div className="flex items-center gap-3">
                              {promptMsg.text && (
                                <span className={`text-xs ${promptMsg.type === "success" ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                                  {promptMsg.text}
                                </span>
                              )}
                              <Button onClick={handleSavePrompts} disabled={isSavingPrompts}>
                                {isSavingPrompts ? "Saving..." : "Save Prompts"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Responses Tab */}
                    {activeTab === "responses" && (
                      <div className="card">
                        <div className="card-header">Participant Responses ({responses.length})</div>
                        <div className="p-5">
                          {responses.length === 0 ? (
                            <div className="text-center py-12 text-sm text-[var(--muted)] bg-[var(--surface-2)]/30 border border-dashed border-[var(--border)] rounded-xl">
                              <span className="text-2xl block mb-2">💬</span>
                              No responses yet.
                              <br />
                              <span className="text-xs opacity-75 mt-1 block">
                                Users join with <span className="font-mono text-white">/join {selectedEvent.code}</span>
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {responses.map((resp) => (
                                <div key={resp.id} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface-2)]">
                                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-3">
                                    <div>
                                      <h4 className="text-sm font-semibold text-white">{resp.user_name}</h4>
                                      {resp.user_username && <p className="text-[10px] text-[var(--muted)]">@{resp.user_username}</p>}
                                    </div>
                                    <div className="text-right">
                                      {resp.section_name && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 block mb-1">
                                          {resp.section_name}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-[var(--muted)] font-mono">
                                        {new Date(resp.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-2.5">
                                    {(() => {
                                      const parsed = typeof resp.responses === "string" ? JSON.parse(resp.responses) : resp.responses;
                                      return Array.isArray(parsed) && parsed.length > 0 ? (
                                        parsed.map((qa: QAPair, index: number) => (
                                          <div key={index} className="text-xs">
                                            <p className="text-[#71717a] font-medium mb-0.5">Q: {qa.prompt_text}</p>
                                            <p className="text-[var(--fg)] bg-[var(--surface)] p-2 rounded-lg border border-[var(--border)] leading-relaxed">
                                              {qa.response_text}
                                            </p>
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-xs text-[var(--muted)]">No details available</p>
                                      );
                                    })()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sections Tab */}
                    {activeTab === "sections" && (
                      <div className="card">
                        <div className="card-header flex items-center justify-between">
                          <span>Event Sections</span>
                          <span className="text-[10px] text-[var(--muted)]">{sections.length} section(s)</span>
                        </div>
                        <div className="p-5 space-y-4">
                          {selectedEvent.match_scope !== "section" ? (
                            <div className="text-center py-8 text-sm text-[var(--muted)]">
                              <p>This event does not use sections.</p>
                              <p className="text-xs mt-1">Enable sections when creating an event to organize participants into departments.</p>
                            </div>
                          ) : (
                            <>
                              {sections.length === 0 ? (
                                <div className="text-center py-8 text-sm text-[var(--muted)]">
                                  No sections created yet. Add sections to organize participants.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {sections.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                                      <div>
                                        <p className="text-sm font-medium text-white">{s.name}</p>
                                        <p className="text-[10px] text-[var(--muted)] font-mono">{s.code}</p>
                                      </div>
                                      <button
                                        onClick={() => handleDeleteSection(s.id)}
                                        className="text-xs text-[var(--muted)] hover:text-[var(--error)] transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Insights Tab */}
                    {activeTab === "insights" && (
                      <div className="card">
                        <div className="card-header flex items-center justify-between">
                          <span>AI Insights</span>
                          <span className="text-[10px] text-[var(--muted)]">Powered by Gemini</span>
                        </div>
                        <div className="p-5 space-y-4">
                          {selectedEvent.ai_insights ? (
                            <>
                              <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-5 overflow-hidden">
                                {renderMarkdown(selectedEvent.ai_insights)}
                              </div>
                              <div className="flex justify-end">
                                <Button onClick={handleGenerateInsights} disabled={isGeneratingInsights} variant="secondary">
                                  {isGeneratingInsights ? "Regenerating..." : "🔄 Regenerate"}
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-12 bg-[var(--surface-2)]/30 border border-dashed border-[var(--border)] rounded-xl">
                              <span className="text-3xl block mb-3">🧠</span>
                              <h3 className="text-sm font-medium text-white mb-1">Generate AI Insights</h3>
                              <p className="text-xs text-[var(--muted)] max-w-sm mb-4">
                                Analyze participant responses to identify patterns and recommend connections.
                              </p>
                              {insightsError && (
                                <div className="text-xs text-[var(--error)] bg-[var(--error)]/5 border border-[var(--error)]/20 p-2.5 rounded-lg mb-4 max-w-sm mx-auto">
                                  ⚠️ {insightsError}
                                </div>
                              )}
                              <Button onClick={handleGenerateInsights} disabled={isGeneratingInsights || responses.length === 0}>
                                {isGeneratingInsights ? "Analyzing..." : "Generate Insights"}
                              </Button>
                              {responses.length === 0 && (
                                <p className="text-[10px] text-[var(--muted)] mt-2">Requires at least 1 participant response.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

// Sidebar Button Component
function SidebarButton({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
        active
          ? "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20"
          : "text-[var(--muted)] hover:text-white hover:bg-[var(--surface)]"
      }`}
    >
      <span className="text-base">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--muted)]">
          {badge}
        </span>
      )}
    </button>
  );
}

// Stat Card Component
function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-semibold text-white mt-2">{value}</p>
    </div>
  );
}
