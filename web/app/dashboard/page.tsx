import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/dashboard-shell";

export default function DashboardPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Your events, matches, and progress.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Events joined" value="—" href="/dashboard/events" />
          <StatCard label="Matches" value="—" href="/dashboard/matches" />
          <StatCard label="Profile strength" value="—" href="/dashboard/profile" />
        </div>

        <div className="card p-6 space-y-3">
          <h2 className="text-sm font-semibold text-white">Quick actions</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/dashboard/profile" className="text-xs px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--muted)] hover:text-white transition-colors">
              Complete your profile
            </Link>
            <Link href="/events" className="text-xs px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--muted)] hover:text-white transition-colors">
              Browse events
            </Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function StatCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="card p-5 hover:border-[var(--border-hover)] transition-colors block">
      <p className="text-xs text-[var(--muted)] mb-1">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </Link>
  );
}
