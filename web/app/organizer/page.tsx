"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/site-header";
import OrganizerShell, { authHeaders } from "@/components/organizer-shell";
import { Button } from "@/components/ui/button";
import OrganizerSidebar from "@/components/organizer-sidebar";
import type { Event } from "@/lib/types";

type CreateStatus = "idle" | "loading" | "error";

export default function OrganizerDashboardPage() {
  return (
    <OrganizerShell>
      {({ organizer, onLogout }) => (
        <DashboardContent organizer={organizer} onLogout={onLogout} />
      )}
    </OrganizerShell>
  );
}

function DashboardContent({
  organizer,
  onLogout,
}: {
  organizer: { name: string; email: string };
  onLogout: () => void;
}) {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/organizer/events", { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.events) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const recentCount = events.filter((e) => {
    const days = (Date.now() - new Date(e.created_at).getTime()) / 86_400_000;
    return days < 7;
  }).length;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <OrganizerSidebar
        selectedEventId={selectedEventId || undefined}
        onEventSelect={(id) => {
          setSelectedEventId(id);
          router.push(`/organizer/events/${id}`);
        }}
      />

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="page-bg" />
        <div className="page-content min-h-screen pb-16">
          <SiteHeader active="organizer" />

          <main className="max-w-5xl mx-auto px-4 py-10 sm:py-12 space-y-10">
            {/* ─── Header ─── */}
            <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-mono text-[var(--muted-3)] uppercase tracking-wider">
                  Organizer
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--fg)]">
                  Welcome back, {organizer.name.split(" ")[0]}.
                </h1>
                <p className="text-sm text-[var(--muted)]">
                  {events.length === 0
                    ? "Let's create your first event."
                    : `${events.length} event${events.length === 1 ? "" : "s"} · ${recentCount} created this week`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setShowCreate(true)}>
                  <PlusIcon /> New event
                </Button>
                <button
                  onClick={onLogout}
                  className="text-xs text-[var(--muted)] hover:text-[var(--fg)] transition-colors px-3 py-2 rounded-lg hover:bg-[var(--surface)]"
                >
                  Sign out
                </button>
              </div>
            </header>

            {/* ─── Stats row ─── */}
            {events.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="Events" value={events.length} />
                <Stat label="This week" value={recentCount} />
                <Stat
                  label="With sections"
                  value={events.filter((e) => e.match_scope === "section").length}
                  className="col-span-2 sm:col-span-1"
                />
              </div>
            )}

            {/* ─── Event grid / empty / loading ─── */}
            {isLoading ? (
              <SkeletonGrid />
            ) : events.length === 0 ? (
              <EmptyState onCreate={() => setShowCreate(true)} />
            ) : (
              <section>
                <h2 className="text-xs font-mono text-[var(--muted-3)] uppercase tracking-wider mb-4">
                  Your events
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                  <CreateEventCard onClick={() => setShowCreate(true)} />
                </div>
              </section>
            )}
          </main>

          {/* ─── Create modal ─── */}
          {showCreate && (
            <CreateEventModal
              organizerName={organizer.name}
              onClose={() => setShowCreate(false)}
              onCreated={() => {
                setShowCreate(false);
                fetchEvents();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={`card p-4 ${className}`}>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-2xl font-semibold text-[var(--fg)] mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  return (
    <Link
      href={`/organizer/events/${event.id}`}
      className="card p-5 hover:border-[var(--border-hover)] transition-colors group block"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 font-semibold">
          {event.code}
        </span>
        {event.match_scope === "section" && event.sections && event.sections.length > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
            {event.sections.length} section{event.sections.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <h3 className="text-sm font-semibold text-[var(--fg)] mb-1 line-clamp-1">
        {event.name}
      </h3>
      {event.match_scope === "section" && event.sections && event.sections.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {event.sections.slice(0, 4).map((s) => (
            <span
              key={s.id}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--muted-2)] border border-[var(--border)]"
            >
              {s.code}
            </span>
          ))}
          {event.sections.length > 4 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded text-[var(--muted-3)]">
              +{event.sections.length - 4}
            </span>
          )}
        </div>
      )}
      <p className="text-[11px] text-[var(--muted-2)]">
        Created {new Date(event.created_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}
      </p>
      <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>Manage →</span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
      </div>
    </Link>
  );
}

function CreateEventCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card p-5 border-dashed hover:border-[var(--border-hover)] transition-colors text-left flex flex-col items-start gap-2 min-h-[148px] justify-center"
    >
      <span className="w-9 h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
        <PlusIcon />
      </span>
      <div>
        <p className="text-sm font-semibold text-[var(--fg)]">New event</p>
        <p className="text-[11px] text-[var(--muted-2)] mt-0.5">Generate a join code</p>
      </div>
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="card p-12 text-center space-y-5 max-w-xl mx-auto">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-2xl">
        🎟️
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-[var(--fg)]">No events yet</h2>
        <p className="text-sm text-[var(--muted)] leading-relaxed max-w-sm mx-auto">
          Create your first event to get a join code, customize the questions your
          attendees answer, and watch responses roll in.
        </p>
      </div>
      <Button onClick={onCreate}>
        <PlusIcon /> Create your first event
      </Button>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card p-5 h-[148px] animate-pulse">
          <div className="h-4 w-16 bg-[var(--surface-2)] rounded mb-4" />
          <div className="h-3 w-3/4 bg-[var(--surface-2)] rounded mb-2" />
          <div className="h-3 w-1/2 bg-[var(--surface-2)] rounded" />
        </div>
      ))}
    </div>
  );
}

function CreateEventModal({
  organizerName,
  onClose,
  onCreated,
}: {
  organizerName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [hasSections, setHasSections] = useState(false);
  const [sections, setSections] = useState<Array<{ name: string; code: string }>>([]);
  const [status, setStatus] = useState<CreateStatus>("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setStatus("loading");
    setError("");

    const filledSections = sections.filter((s) => s.name.trim() && s.code.trim());
    if (hasSections) {
      const codes = filledSections.map((s) => s.code.trim().toUpperCase());
      const dup = codes.find((c, i) => codes.indexOf(c) !== i);
      if (dup) {
        setError(`Section code "${dup}" is used more than once.`);
        setStatus("error");
        return;
      }
    }

    try {
      const res = await fetch("/api/organizer/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          organizerName,
          matchScope: hasSections ? "section" : "event",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.event) {
        setError(data.error || "Failed to create event");
        setStatus("error");
        return;
      }
      if (hasSections && filledSections.length > 0) {
        for (const s of filledSections) {
          await fetch(`/api/organizer/events/${data.event.id}/sections`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({
              name: s.name.trim(),
              code: s.code.trim().toUpperCase(),
            }),
          });
        }
      }
      onCreated();
    } catch {
      setError("Could not reach the server");
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md card p-6 sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--fg)]">New event</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              You&apos;ll get a join code to share with attendees.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--fg)] -mr-1 -mt-1 p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-[var(--muted)] mb-1.5 uppercase tracking-wider">
              Event code
            </label>
            <input
              autoFocus
              className="input font-mono"
              placeholder="MINIHACK"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
              required
              maxLength={24}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[var(--muted)] mb-1.5 uppercase tracking-wider">
              Event name
            </label>
            <input
              className="input"
              placeholder="MiniHack Kenya 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface-2)] space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-[var(--fg)]">Has sections</p>
                <p className="text-[10px] text-[var(--muted-2)] mt-0.5">
                  e.g. Computer Science, Business, Design
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={hasSections}
                onClick={() => {
                  setHasSections((v) => !v);
                  if (!hasSections && sections.length === 0) {
                    setSections([{ name: "", code: "" }]);
                  }
                }}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                  hasSections ? "bg-[var(--success)]" : "bg-[var(--surface-3)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    hasSections ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </label>

            {hasSections && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2 text-[9px] font-mono text-[var(--muted-3)] uppercase tracking-wider px-1">
                  <span className="w-20 shrink-0">Code</span>
                  <span className="flex-1">Section name</span>
                  <span className="w-6" />
                </div>
                {sections.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="w-20 shrink-0">
                      <input
                        className="input font-mono"
                        placeholder="e.g. CS"
                        value={s.code}
                        onChange={(e) => {
                          const next = [...sections];
                          next[i] = {
                            ...next[i],
                            code: e.target.value.toUpperCase().replace(/\s+/g, ""),
                          };
                          setSections(next);
                        }}
                        maxLength={12}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        className="input"
                        placeholder="e.g. Computer Science"
                        value={s.name}
                        onChange={(e) => {
                          const next = [...sections];
                          next[i] = { ...next[i], name: e.target.value };
                          setSections(next);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSections(sections.filter((_, idx) => idx !== i))}
                      className="w-6 h-6 flex items-center justify-center text-[var(--muted-3)] hover:text-red-400 transition-colors shrink-0"
                      aria-label="Remove section"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSections([...sections, { name: "", code: "" }])}
                  className="text-xs text-[var(--muted)] hover:text-[var(--fg)] px-2 py-1"
                >
                  + Add section
                </button>
              </div>
            )}
          </div>

          {error && status === "error" && (
            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 whitespace-pre-wrap">
              {error}
            </div>
          )}

          <Button type="submit" fullWidth disabled={status === "loading"}>
            {status === "loading" ? "Creating…" : "Create event"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
