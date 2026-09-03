"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface EventSummary {
  id: string;
  code: string;
  name: string;
  match_scope: string;
  created_at: string;
  total_joins: number;
  section_joins: number;
  sections: Array<{ id: string; name: string; code: string; count: number }>;
}

interface OrganizerSidebarProps {
  onEventSelect?: (eventId: string) => void;
  selectedEventId?: string;
}

export default function OrganizerSidebar({ onEventSelect, selectedEventId }: OrganizerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("organizer_token") : null;
        const res = await fetch("/api/organizer/events/analytics", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleLogout() {
    await fetch("/api/organizer/logout", { method: "POST" });
    router.push("/organizer");
    router.refresh();
  }

  return (
    <aside className="hidden lg:flex w-72 shrink-0 border-r border-[var(--border)] bg-[var(--bg)]/50 flex-col">
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono text-[var(--muted-3)] uppercase tracking-wider">
            Organizer
          </h2>
          <button
            onClick={handleLogout}
            className="text-[10px] text-[var(--muted)] hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-white text-black hover:bg-[#e4e4e7] transition-colors"
        >
          + New event
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card p-3 h-[72px] animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-[var(--muted)] px-2 py-4 text-center">
            No events yet. Create your first event to get started.
          </p>
        ) : (
          <div className="space-y-1">
            {events.map((event) => {
              const isSelected = selectedEventId === event.id;
              const isEventPage = pathname?.includes(`/organizer/events/${event.id}`);
              return (
                <div key={event.id} className="space-y-1">
                  <button
                    onClick={() => {
                      if (onEventSelect) {
                        onEventSelect(event.id);
                      } else if (!isEventPage) {
                        router.push(`/organizer/events/${event.id}`);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      isSelected || isEventPage
                        ? "bg-[var(--surface-2)] text-white"
                        : "text-[var(--muted)] hover:text-white hover:bg-[var(--surface)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-semibold truncate">
                        {event.code}
                      </span>
                      <span className="text-[10px] text-[var(--muted-3)] shrink-0">
                        {event.total_joins}
                      </span>
                    </div>
                    <p className="text-xs font-medium truncate mt-0.5">{event.name}</p>
                    {event.match_scope === "section" && event.sections.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {event.sections.slice(0, 3).map((s) => (
                          <span
                            key={s.id}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--muted-2)] border border-[var(--border)]"
                          >
                            {s.code}:{s.count}
                          </span>
                        ))}
                        {event.sections.length > 3 && (
                          <span className="text-[9px] text-[var(--muted-3)]">
                            +{event.sections.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            // Refresh events list
            window.location.reload();
          }}
        />
      )}
    </aside>
  );
}

function CreateEventModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [hasSections, setHasSections] = useState(false);
  const [sections, setSections] = useState<Array<{ name: string; code: string }>>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
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
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
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
            headers: { "Content-Type": "application/json" },
            credentials: "include",
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
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
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

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 whitespace-pre-wrap">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors disabled:bg-[#27272a] disabled:text-[#52525b] disabled:cursor-not-allowed bg-white text-black hover:bg-[#e4e4e7]"
          >
            {status === "loading" ? "Creating…" : "Create event"}
          </button>
        </form>
      </div>
    </div>
  );
}
