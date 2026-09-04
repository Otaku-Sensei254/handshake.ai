import DashboardShell from "@/components/dashboard-shell";

async function getUser() {
  const base = process.env.BASE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/auth/me`, { 
      cache: "no-store",
      headers: { cookie: "" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-[#166534] text-[#4ade80]",
    "bg-[#1e3a5f] text-[#60a5fa]",
    "bg-[#5b21b6] text-[#c084fc]",
    "bg-[#9a3412] text-[#fb923c]",
    "bg-[#831843] text-[#f472b6]",
    "bg-[#134e4a] text-[#2dd4bf]",
    "bg-[#3f6212] text-[#a3e635]",
    "bg-[#581c87] text-[#d8b4fe]",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default async function DashboardProfilePage() {
  const user = await getUser();

  if (!user) {
    return (
      <DashboardShell>
        <div className="text-sm text-[var(--muted)]">Not authenticated.</div>
      </DashboardShell>
    );
  }

  const initials = getInitials(user.name || user.username);
  const avatarColor = getAvatarColor(user.name || user.username);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Profile</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Your account information.
          </p>
        </div>

        <div className="card p-6 sm:p-8">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Avatar */}
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full ${avatarColor} flex items-center justify-center text-xl sm:text-2xl font-semibold shrink-0 border-2 border-white/10`}>
              {initials}
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-0.5">Username</p>
                <p className="text-sm sm:text-base font-medium text-white truncate">@{user.username}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-0.5">Email</p>
                <p className="text-sm sm:text-base font-medium text-white truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
