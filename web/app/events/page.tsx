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
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-[1.15]">
                Browse events
              </h1>
              <p className="text-[var(--muted)] text-sm mt-2">
                Find events to join and get matched with the right people.
              </p>
            </div>

            {events.length === 0 ? (
              <div className="card p-12 text-center space-y-3">
                <p className="text-sm text-[var(--muted)]">No events available right now. Check back soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event: any) => (
                  <Link
                    key={event.id}
                    href={`/join/${event.code}`}
                    className="card p-5 hover:border-[var(--border-hover)] transition-colors group block"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 font-semibold">
                        {event.code}
                      </span>
                      {event.match_scope === "section" && event.sections && event.sections.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
                          {event.sections.length} sections
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--fg)] mb-1 line-clamp-1">
                      {event.name}
                    </h3>
                    <p className="text-[11px] text-[var(--muted-2)]">
                      By {event.organizer_name}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted)]">
                      <span>Join →</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
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
