import Link from "next/link";
import SiteHeader from "@/components/site-header";

async function getEvents() {
  const base = process.env.BASE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/events`, {
      cache: "no-store",
      headers: { cookie: "" }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch {
    return [];
  }
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="min-h-screen relative">
      <div className="relative z-10 min-h-screen flex flex-col">
        <SiteHeader />

        <main className="flex-1 px-4 py-10 sm:py-16">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-[1.1]">
                Browse events
              </h1>
              <p className="text-[var(--muted)] text-sm mt-2 max-w-lg">
                Discover events, pick your section, and get introduced to the people who matter most.
              </p>
            </div>

            {events.length === 0 ? (
              <div className="card p-16 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-2xl">
                  📅
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--fg)]">No events yet</p>
                  <p className="text-xs text-[var(--muted)] mt-1">Check back soon — new events are added regularly.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event: any) => (
                  <Link
                    key={event.id}
                    href={`/join/${event.code}`}
                    className="group card p-5 hover:border-[var(--border-hover)] transition-colors block"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 font-semibold tracking-wide">
                        {event.code}
                      </span>
                      {event.match_scope === "section" && event.sections && event.sections.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
                          {event.sections.length} sections
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-[var(--fg)] mb-1 line-clamp-1">
                      {event.name}
                    </h3>
                    <p className="text-xs text-[var(--muted-2)] mb-4">
                      By {event.organizer_name}
                    </p>

                    {/* Section pills */}
                    {event.match_scope === "section" && event.sections && event.sections.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {event.sections.slice(0, 4).map((s: any) => (
                          <span
                            key={s.id}
                            className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-[var(--surface)] text-[var(--muted-2)] border border-[var(--border)]"
                          >
                            {s.code}
                          </span>
                        ))}
                        {event.sections.length > 4 && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-md text-[var(--muted-3)]">
                            +{event.sections.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-[var(--muted)] pt-3 border-t border-[var(--border)]">
                      <span>Join event</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
