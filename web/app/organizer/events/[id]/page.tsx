"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import SiteHeader from "@/components/site-header";
import OrganizerShell, { authHeaders } from "@/components/organizer-shell";
import { Button } from "@/components/ui/button";
import type {
  Event,
  EventSection,
  EventPrompt,
  UserEventResponse,
} from "@/lib/types";

type TabId = "overview" | "prompts" | "responses" | "sections" | "insights";

interface QAPair {
  prompt_id: string;
  prompt_text: string;
  response_text: string;
}

export default function OrganizerEventPage() {
  return (
    <OrganizerShell>
      {({ onLogout }) => <EventDetailContent onLogout={onLogout} />}
    </OrganizerShell>
  );
}

function EventDetailContent({ onLogout }: { onLogout: () => void }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params.id;

  return (
    <div className="min-h-screen flex">
      <OrganizerSidebar />
      <div className="flex-1 min-w-0">
        <div className="page-bg" />
        <div className="page-content min-h-screen pb-16">
          <SiteHeader active="organizer" />
          <main className="max-w-5xl mx-auto px-4 py-10 sm:py-12">
            <EventDetailInner eventId={eventId} onLogout={onLogout} />
          </main>
        </div>
      </div>
    </div>
  );
}

function EventDetailInner({ eventId, onLogout }: { eventId: string; onLogout: () => void }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [sections, setSections] = useState<EventSection[]>([]);
  const [prompts, setPrompts] = useState<string[]>([""]);
  const [responses, setResponses] = useState<UserEventResponse[]>([]);
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load event + sections + responses
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [evRes, secRes, respRes] = await Promise.all([
          fetch("/api/organizer/events", { headers: authHeaders() }),
          fetch(`/api/organizer/events/${eventId}/sections`, { headers: authHeaders() }),
          fetch(`/api/organizer/events/${eventId}/responses`),
        ]);
        const evData = await evRes.json();
        const found = (evData.events ?? []).find((e: Event) => e.id === eventId);
        if (!found) {
          setError("Event not found or you don't have access.");
          setLoading(false);
          return;
        }
        setEvent(found);
        if (secRes.ok) {
          const d = await secRes.json();
          setSections(d.sections ?? []);
        }
        if (respRes.ok) {
          const d = await respRes.json();
          setResponses(d.responses ?? []);
        }
      } catch {
        setError("Failed to load event.");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  // Load prompts when event loads
  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/organizer/events/${eventId}/prompts`)
      .then((r) => r.json())
      .then((d) => {
        if (d.prompts && d.prompts.length > 0) {
          setPrompts(d.prompts.map((p: EventPrompt) => p.prompt_text));
        }
      })
      .catch(() => {});
  }, [eventId]);

  if (loading) {
    return (
      <div className="text-sm text-[var(--muted)] py-20 text-center">Loading…</div>
    );
  }

  if (error || !event) {
    return (
      <div className="card p-8 text-center space-y-3">
        <p className="text-sm text-[var(--error)]">{error || "Event not found."}</p>
        <Button onClick={() => router.push("/organizer")}>Back to events</Button>
      </div>
    );
  }

  return (
    <>
      {/* ─── Event header ─── */}
      <div className="space-y-4 mb-8">
        <Link
          href="/organizer"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
        >
          ← All events
        </Link>

        <div className="card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 font-semibold">
                  {event.code}
                </span>
                <span className="text-[10px] font-mono text-[var(--muted-2)]">
                  /join {event.code}
                </span>
                {event.match_scope === "section" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
                    Sections enabled
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--fg)] tracking-tight">
                {event.name}
              </h1>
              <p className="text-xs text-[var(--muted)]">
                By {event.organizer_name} · Created{" "}
                {new Date(event.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex border-b border-[var(--border)] gap-1 mb-6 overflow-x-auto">
        <TabButton id="overview" label="Overview" active={tab === "overview"} onClick={setTab} />
        <TabButton
          id="prompts"
          label="Prompts"
          active={tab === "prompts"}
          onClick={setTab}
        />
        <TabButton
          id="responses"
          label={`Responses · ${responses.length}`}
          active={tab === "responses"}
          onClick={setTab}
        />
        <TabButton
          id="sections"
          label={`Sections · ${sections.length}`}
          active={tab === "sections"}
          onClick={setTab}
        />
        <TabButton
          id="insights"
          label="AI Insights"
          active={tab === "insights"}
          onClick={setTab}
        />
      </div>

      {tab === "overview" && (
        <OverviewTab
          event={event}
          responses={responses}
          sections={sections}
          onJumpTab={setTab}
        />
      )}
      {tab === "prompts" && (
        <PromptsTab
          eventId={event.id}
          prompts={prompts}
          onChange={setPrompts}
        />
      )}
      {tab === "responses" && <ResponsesTab responses={responses} />}
      {tab === "sections" && (
        <SectionsTab
          eventId={event.id}
          event={event}
          sections={sections}
          onChange={setSections}
        />
      )}
      {tab === "insights" && (
        <InsightsTab
          event={event}
          responsesCount={responses.length}
          onUpdate={(insights) => setEvent({ ...event, ai_insights: insights })}
        />
      )}
    </>
  );
}

function TabButton({
  id,
  label,
  active,
  onClick,
}: {
  id: TabId;
  label: string;
  active: boolean;
  onClick: (id: TabId) => void;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`text-xs font-semibold px-4 py-2.5 border-b-2 transition-colors -mb-[2px] whitespace-nowrap ${
        active
          ? "border-[var(--success)] text-[var(--fg)]"
          : "border-transparent text-[var(--muted)] hover:text-[var(--fg)]"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────

function OverviewTab({
  event,
  responses,
  sections,
  onJumpTab,
}: {
  event: Event;
  responses: UserEventResponse[];
  sections: EventSection[];
  onJumpTab: (id: TabId) => void;
}) {
  const hasInsights = Boolean(event.ai_insights);
  const responseRate = sections.length > 0
    ? Math.round((responses.length / Math.max(sections.length * 5, 1)) * 100)
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Responses" value={responses.length} />
        <Stat label="Sections" value={sections.length} />
        <Stat
          label="Code"
          value={event.code}
          mono
        />
        <Stat
          label="Created"
          value={new Date(event.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        />
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--fg)]">Quick actions</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => onJumpTab("prompts")}
            className="text-left p-3 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <p className="text-xs font-mono text-[var(--muted-3)] uppercase tracking-wider mb-1">
              Prompts
            </p>
            <p className="text-sm text-[var(--fg)]">Customize questions</p>
          </button>
          <button
            onClick={() => onJumpTab("responses")}
            className="text-left p-3 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <p className="text-xs font-mono text-[var(--muted-3)] uppercase tracking-wider mb-1">
              Responses
            </p>
            <p className="text-sm text-[var(--fg)]">View {responses.length} answer{responses.length === 1 ? "" : "s"}</p>
          </button>
          <button
            onClick={() => onJumpTab("insights")}
            className="text-left p-3 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <p className="text-xs font-mono text-[var(--muted-3)] uppercase tracking-wider mb-1">
              Insights
            </p>
            <p className="text-sm text-[var(--fg)]">
              {hasInsights ? "View AI summary" : "Generate AI summary"}
            </p>
          </button>
        </div>
      </div>

      {responses.length > 0 && (
        <div className="card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-4">Recent responses</h3>
          <div className="space-y-2">
            {responses.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--fg)] truncate">
                    {r.user_name ?? "Anonymous"}
                  </p>
                  {r.user_username && (
                    <p className="text-[10px] text-[var(--muted-2)]">@{r.user_username}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {r.section_name && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 block mb-1">
                      {r.section_name}
                    </span>
                  )}
                  <span className="text-[10px] text-[var(--muted-2)] font-mono">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {responses.length > 5 && (
            <button
              onClick={() => onJumpTab("responses")}
              className="text-xs text-[var(--muted)] hover:text-[var(--fg)] mt-3 px-3 py-1.5"
            >
              View all {responses.length} →
            </button>
          )}
        </div>
      )}

      {responseRate !== null && responseRate > 0 && (
        <p className="text-[10px] font-mono text-[var(--muted-3)] text-center">
          Engagement estimate · {responseRate}%
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: number | string;
  mono?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-mono text-[var(--muted-3)] uppercase tracking-wider">
        {label}
      </p>
      <p
        className={`text-xl font-semibold text-[var(--fg)] mt-1 ${
          mono ? "font-mono text-[var(--success)]" : "tabular-nums"
        } truncate`}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Prompts ──────────────────────────────────────────────────────────────

function PromptsTab({
  eventId,
  prompts,
  onChange,
}: {
  eventId: string;
  prompts: string[];
  onChange: (p: string[]) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const clean = prompts.filter((p) => p.trim() !== "");
      const res = await fetch(`/api/organizer/events/${eventId}/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ prompts: clean }),
      });
      if (!res.ok) {
        const d = await res.json();
        setMsg({ type: "error", text: d.error || "Failed to save" });
      } else {
        setMsg({ type: "success", text: "Prompts saved" });
        onChange(clean.length > 0 ? clean : [""]);
      }
    } catch {
      setMsg({ type: "error", text: "Could not reach the server" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5 sm:p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--fg)] mb-1">Custom prompts</h3>
        <p className="text-xs text-[var(--muted)]">
          The bot asks these in order when someone joins your event.
        </p>
      </div>

      <div className="space-y-3">
        {prompts.map((p, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="font-mono text-xs text-[var(--muted-3)] w-6 shrink-0 text-right">
              Q{i + 1}
            </span>
            <input
              className="input"
              placeholder="e.g. What is your startup's name?"
              value={p}
              onChange={(e) => {
                const next = [...prompts];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <button
              type="button"
              onClick={() => onChange(prompts.filter((_, idx) => idx !== i))}
              className="p-2 border border-[var(--border)] rounded-lg text-[var(--muted)] hover:text-[var(--error)] hover:border-[var(--error)]/30 transition-colors shrink-0"
              aria-label="Remove prompt"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          onClick={() => onChange([...prompts, ""])}
          className="text-xs text-[var(--muted)] hover:text-[var(--fg)] px-3 py-1.5 border border-[var(--border)] rounded-lg hover:border-[var(--border-hover)] transition-colors"
        >
          + Add question
        </button>
        <div className="flex items-center gap-3">
          {msg && (
            <span
              className={`text-xs ${
                msg.type === "success" ? "text-[var(--success)]" : "text-[var(--error)]"
              }`}
            >
              {msg.text}
            </span>
          )}
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save prompts"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Responses ────────────────────────────────────────────────────────────

function ResponsesTab({ responses }: { responses: UserEventResponse[] }) {
  if (responses.length === 0) {
    return (
      <div className="card p-12 text-center space-y-3">
        <span className="text-3xl block">💬</span>
        <h3 className="text-sm font-semibold text-[var(--fg)]">No responses yet</h3>
        <p className="text-xs text-[var(--muted)] max-w-sm mx-auto leading-relaxed">
          When attendees join your event, their answers to your prompts will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {responses.map((r) => {
        const parsed =
          typeof r.responses === "string" ? JSON.parse(r.responses) : r.responses;
        return (
          <div key={r.id} className="card p-5">
            <div className="flex items-start justify-between border-b border-[var(--border)] pb-3 mb-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--fg)]">
                  {r.user_name ?? "Anonymous"}
                </h4>
                {r.user_username && (
                  <p className="text-[10px] text-[var(--muted-2)]">@{r.user_username}</p>
                )}
              </div>
              <div className="text-right">
                {r.section_name && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 block mb-1">
                    {r.section_name}
                  </span>
                )}
                <span className="text-[10px] text-[var(--muted-2)] font-mono">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="space-y-2.5">
              {Array.isArray(parsed) && parsed.length > 0 ? (
                parsed.map((qa: QAPair, idx: number) => (
                  <div key={idx} className="text-xs">
                    <p className="text-[var(--muted-2)] font-medium mb-0.5">
                      Q: {qa.prompt_text}
                    </p>
                    <p className="text-[var(--fg)] bg-[var(--surface-2)] p-2.5 rounded-lg border border-[var(--border)] leading-relaxed">
                      {qa.response_text}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--muted)]">No details available</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────

function SectionsTab({
  eventId,
  event,
  sections,
  onChange,
}: {
  eventId: string;
  event: Event;
  sections: EventSection[];
  onChange: (s: EventSection[]) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);

  if (event.match_scope !== "section") {
    return (
      <div className="card p-10 text-center space-y-2">
        <p className="text-sm text-[var(--fg)]">This event doesn&apos;t use sections.</p>
        <p className="text-xs text-[var(--muted)] max-w-sm mx-auto leading-relaxed">
          Enable sections when creating an event to group participants into departments.
        </p>
      </div>
    );
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: newName.trim(), code: newCode.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.section) {
        onChange([...sections, data.section]);
        setNewName("");
        setNewCode("");
      }
    } finally {
      setCreating(false);
    }
  }

  async function remove(sectionId: string) {
    try {
      await fetch(`/api/organizer/events/${eventId}/sections?sectionId=${sectionId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      onChange(sections.filter((s) => s.id !== sectionId));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--fg)]">Add section</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="input flex-1"
            placeholder="Section name (e.g. Computer Science)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <input
            className="input sm:w-32 font-mono"
            placeholder="CODE"
            value={newCode}
            onChange={(e) =>
              setNewCode(e.target.value.toUpperCase().replace(/\s+/g, ""))
            }
            required
            maxLength={12}
          />
          <Button type="submit" disabled={creating}>
            {creating ? "Adding…" : "Add"}
          </Button>
        </div>
      </form>

      {sections.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-[var(--muted)]">No sections yet.</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {sections.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-4"
            >
              <div>
                <p className="text-sm font-medium text-[var(--fg)]">{s.name}</p>
                <p className="text-[10px] font-mono text-[var(--muted-2)] mt-0.5">
                  /join {s.code}
                </p>
              </div>
              <button
                onClick={() => remove(s.id)}
                className="text-xs text-[var(--muted)] hover:text-[var(--error)] transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Insights ─────────────────────────────────────────────────────────────

function InsightsTab({
  event,
  responsesCount,
  onUpdate,
}: {
  event: Event;
  responsesCount: number;
  onUpdate: (insights: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/organizer/events/${event.id}/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      const data = await res.json();
      if (res.ok && data.insights) {
        onUpdate(data.insights);
      } else {
        setError(data.error || "Failed to generate insights.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--fg)]">AI Insights</h3>
        <span className="text-[10px] text-[var(--muted-3)] font-mono">
          Powered by Gemini
        </span>
      </div>

      {event.ai_insights ? (
        <>
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-5 prose-sm">
            <MarkdownLite text={event.ai_insights} />
          </div>
          <div className="flex justify-end">
            <Button onClick={generate} disabled={loading} variant="secondary">
              {loading ? "Regenerating…" : "↻ Regenerate"}
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-10 bg-[var(--surface-2)]/40 border border-dashed border-[var(--border)] rounded-xl space-y-3">
          <span className="text-3xl block">🧠</span>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[var(--fg)]">No insights yet</h4>
            <p className="text-xs text-[var(--muted)] max-w-sm mx-auto leading-relaxed">
              Analyze participant responses to identify patterns and recommend
              connections.
            </p>
          </div>
          {error && (
            <p className="text-xs text-[var(--error)] bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg px-3 py-2 max-w-sm mx-auto">
              {error}
            </p>
          )}
          <Button onClick={generate} disabled={loading || responsesCount === 0}>
            {loading ? "Analyzing…" : "Generate insights"}
          </Button>
          {responsesCount === 0 && (
            <p className="text-[10px] text-[var(--muted-3)]">
              Requires at least 1 participant response.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MarkdownLite({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").map((line, idx) => {
        const t = line.trim();
        if (t.startsWith("### "))
          return (
            <h4 key={idx} className="text-sm font-semibold text-[var(--fg)] mt-3">
              {t.slice(4)}
            </h4>
          );
        if (t.startsWith("## "))
          return (
            <h3 key={idx} className="text-base font-bold text-[var(--fg)] mt-4">
              {t.slice(3)}
            </h3>
          );
        if (t.startsWith("# "))
          return (
            <h2 key={idx} className="text-lg font-black text-[var(--fg)] mt-4">
              {t.slice(2)}
            </h2>
          );
        if (t.startsWith("- ") || t.startsWith("* ")) {
          return (
            <ul key={idx} className="list-disc pl-5 text-xs text-[var(--muted)]">
              <li>{inline(t.slice(2))}</li>
            </ul>
          );
        }
        if (t === "") return <div key={idx} className="h-2" />;
        return (
          <p key={idx} className="text-xs text-[var(--muted)] leading-relaxed">
            {inline(t)}
          </p>
        );
      })}
    </div>
  );
}

function inline(text: string): React.ReactNode {
  const parts = text.split(/\*\*([\s\S]+?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-[var(--fg)] font-semibold">
        {p}
      </strong>
    ) : (
      p
    )
  );
}
