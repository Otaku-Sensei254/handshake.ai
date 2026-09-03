import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import Link from "next/link";

async function getJoinedEvents() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/dashboard/events`, { 
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

export default async function DashboardEventsPage() {
  const events = await getJoinedEvents();

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">My events</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Events you&apos;ve registered for.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="card p-12 text-center space-y-3">
            <p className="text-sm text-[var(--muted)]">You haven&apos;t joined any events yet.</p>
            <Link href="/events" className="text-xs text-white underline underline-offset-2">
              Browse events
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event: any) => (
              <div key={event.id} className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 font-semibold">
                    {event.code}
                  </span>
                  {event.section_name && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]">
                      {event.section_name} ({event.section_code})
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white">{event.name}</h3>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Organized by {event.organizer_name} · Joined {new Date(event.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
