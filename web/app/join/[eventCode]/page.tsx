"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SiteHeader from "@/components/site-header";

interface EventInfo {
  id: string;
  code: string;
  name: string;
  match_scope: "event" | "section";
}

interface Section {
  id: string;
  name: string;
  code: string;
}

interface Prompt {
  id: string;
  prompt_text: string;
}

type Step = "profile" | "section" | "prompts" | "done";

export default function JoinEventPage() {
  const params = useParams<{ eventCode: string }>();
  const eventCode = params.eventCode?.toUpperCase();

  return <JoinPageContent eventCode={eventCode} />;
}

function JoinPageContent({ eventCode }: { eventCode: string | undefined }) {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("profile");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    telegram_username: "",
    phone_number: "",
  });

  const [selectedSection, setSelectedSection] = useState<string>("");
  const [promptResponses, setPromptResponses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!eventCode) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/join?code=${encodeURIComponent(eventCode)}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Event not found");
          setLoading(false);
          return;
        }
        setEvent(data.event);
        setSections(data.sections || []);
        setPrompts(data.prompts || []);
        if (data.event.match_scope === "section" && data.sections?.length > 0) {
          setStep("section");
        } else if (data.prompts?.length > 0) {
          setStep("prompts");
        }
      } catch {
        setError("Failed to load event");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventCode]);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventCode) return;
    setSubmitting(true);
    setError("");

    try {
      const responses = prompts.map((p) => ({
        prompt_id: p.id,
        prompt_text: p.prompt_text,
        response_text: promptResponses[p.id] || "",
      }));

      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCode,
          user: {
            name: form.name,
            email: form.email,
            password: form.password,
            telegram_username: form.telegram_username || undefined,
            phone_number: form.phone_number || undefined,
          },
          sectionId: selectedSection || undefined,
          responses,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to join event");
        setSubmitting(false);
        return;
      }

      setDone(true);
    } catch {
      setError("Could not reach the server");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative">
        <div className="relative z-10 min-h-screen flex flex-col">
          <SiteHeader />
          <main className="flex-1 px-4 py-10">
            <div className="max-w-xl mx-auto text-center text-sm text-[var(--muted)] py-20">
              Loading event...
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen relative">
        <div className="relative z-10 min-h-screen flex flex-col">
          <SiteHeader />
          <main className="flex-1 px-4 py-10">
            <div className="max-w-xl mx-auto card p-8 text-center space-y-4">
              <p className="text-sm text-[var(--error)]">{error || "Event not found"}</p>
              <Link href="/" className="text-xs text-[var(--muted)] hover:text-white underline">
                Go to homepage
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen relative">
        <div className="relative z-10 min-h-screen flex flex-col">
          <SiteHeader />
          <main className="flex-1 px-4 py-10">
            <div className="max-w-xl mx-auto card p-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#052e16] border border-[#166534] flex items-center justify-center text-2xl text-[#4ade80]">
                ✓
              </div>
              <h2 className="text-xl font-semibold text-white">You&apos;re registered!</h2>
              <p className="text-sm text-[#a1a1aa] max-w-sm mx-auto">
                Your agent is now active for <span className="text-white font-medium">{event.name}</span>.
                {event.match_scope === "section" && selectedSection && (
                  <span> You&apos;re in the <span className="text-white font-medium">{sections.find((s) => s.id === selectedSection)?.name}</span> section.</span>
                )}
              </p>
              <div className="mt-4 p-4 rounded-xl border border-[#27272a] bg-[#111111] text-left text-sm text-[#a1a1aa] max-w-sm mx-auto">
                <p className="text-white font-medium mb-1">What happens next</p>
                <ul className="space-y-1.5 list-none">
                  <li>→ We analyze your profile and event responses</li>
                  <li>→ When we find a strong match, you get a notification</li>
                  <li>→ Confirm and you&apos;ll be connected</li>
                </ul>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="relative z-10 min-h-screen flex flex-col">
        <SiteHeader />

        <main className="flex-1 px-4 py-10 sm:py-16">
          <div className="max-w-xl mx-auto">
            {/* Event header */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 font-semibold">
                  {event.code}
                </span>
                {event.match_scope === "section" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
                    {sections.length} sections
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-[1.15]">
                Join {event.name}
              </h1>
              <p className="text-[var(--muted)] text-sm mt-2">
                Create your profile and get matched with the right people.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Profile Section */}
              <div className="card p-6 sm:p-8 space-y-5">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">Your profile</p>
                  <p className="text-xs text-[#71717a]">
                    Tell us who you are so we can find the best matches for you.
                  </p>
                </div>

                <Divider />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full name" required>
                    <input
                      className="input"
                      placeholder="Amina Odhiambo"
                      value={form.name}
                      onChange={set("name")}
                      required
                    />
                  </Field>

                  <Field label="Email" required hint="For notifications">
                    <input
                      className="input"
                      type="email"
                      placeholder="amina@example.com"
                      value={form.email}
                      onChange={set("email")}
                      required
                    />
                  </Field>
                </div>

                <Field label="Password" required hint="To secure your account">
                  <input
                    className="input"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set("password")}
                    required
                    minLength={6}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Telegram username" hint="For match notifications">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b] text-sm select-none">
                        @
                      </span>
                      <input
                        className="input pl-7"
                        placeholder="aminaodhiambo"
                        value={form.telegram_username}
                        onChange={set("telegram_username")}
                      />
                    </div>
                  </Field>

                  <Field label="Phone number" hint="Optional — for SMS updates">
                    <input
                      className="input"
                      placeholder="+254712345678"
                      value={form.phone_number}
                      onChange={set("phone_number")}
                      type="tel"
                    />
                  </Field>
                </div>
              </div>

              {/* Section Selection */}
              {step === "section" && sections.length > 0 && (
                <div className="card p-6 sm:p-8 space-y-5">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">Select your section</p>
                    <p className="text-xs text-[#71717a]">
                      This event has multiple sections. Pick the one that matches you.
                    </p>
                  </div>

                  <Divider />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sections.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedSection(s.id);
                          setStep(prompts.length > 0 ? "prompts" : "profile");
                        }}
                        className={`p-4 rounded-xl border text-left transition-colors ${
                          selectedSection === s.id
                            ? "border-[var(--success)] bg-[var(--success)]/10"
                            : "border-[#27272a] bg-[#111111] hover:border-[#3f3f46]"
                        }`}
                      >
                        <p className="text-sm font-medium text-white">{s.name}</p>
                        <p className="text-[10px] font-mono text-[#52525b] mt-0.5">{s.code}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompts */}
              {step === "prompts" && prompts.length > 0 && (
                <div className="card p-6 sm:p-8 space-y-5">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">Quick questions</p>
                    <p className="text-xs text-[#71717a]">
                      The organizer wants to know a bit more before matching you.
                    </p>
                  </div>

                  <Divider />

                  <div className="space-y-5">
                    {prompts.map((p, i) => (
                      <div key={p.id} className="space-y-2">
                        <label className="block text-sm text-[#a1a1aa]">
                          Q{i + 1}: <span className="text-white">{p.prompt_text}</span>
                        </label>
                        <textarea
                          className="input min-h-[72px]"
                          placeholder="Your answer..."
                          value={promptResponses[p.id] || ""}
                          onChange={(e) =>
                            setPromptResponses((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-sm text-[#f87171] border border-[#7f1d1d] bg-[#450a0a] rounded-lg px-4 py-3">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || (!selectedSection && event.match_scope === "section")}
                className="w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors disabled:bg-[#27272a] disabled:text-[#52525b] disabled:cursor-not-allowed bg-white text-black hover:bg-[#e4e4e7]"
              >
                {submitting ? "Joining…" : "Join event →"}
              </button>

              <p className="text-center text-xs text-[#52525b]">
                We&apos;ll only contact you when there&apos;s a match that fits your goals.
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm text-[#a1a1aa]">
        {label}
        {required && <span className="text-[#52525b] ml-0.5">*</span>}
        {hint && <span className="text-[#52525b] ml-1.5 text-xs">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Divider() {
  return <hr className="border-[#18181b]" />;
}
