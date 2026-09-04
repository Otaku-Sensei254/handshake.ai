import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";

async function getMatches() {
  const base = process.env.BASE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/dashboard/matches`, { 
      cache: "no-store",
      headers: { cookie: "" }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.matches || [];
  } catch {
    return [];
  }
}

export default async function DashboardMatchesPage() {
  const matches = await getMatches();

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Matches</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            People you&apos;ve been introduced to.
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="card p-12 text-center space-y-3">
            <p className="text-sm text-[var(--muted)]">No matches yet. Your agent is working on it.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match: any) => (
              <div key={match.id} className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white">{match.matched_with_name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md border ${
                    match.status === "called" || match.status === "completed"
                      ? "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20"
                      : match.status === "declined"
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"
                  }`}>
                    {match.status}
                  </span>
                </div>
                {match.conversation_starter && (
                  <p className="text-xs text-[var(--muted)] italic">
                    &ldquo;{match.conversation_starter.slice(0, 120)}{match.conversation_starter.length > 120 ? "…" : ""}&rdquo;
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-[10px] text-[#52525b]">
                  {match.similarity_score && (
                    <span>Score: {(match.similarity_score * 100).toFixed(0)}%</span>
                  )}
                  {match.matched_with_username && (
                    <span>@{match.matched_with_username}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
