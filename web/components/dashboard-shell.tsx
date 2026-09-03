"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SiteHeader from "@/components/site-header";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/events", label: "My events" },
  { href: "/dashboard/matches", label: "Matches" },
  { href: "/dashboard/profile", label: "Profile" },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen relative">
        <div className="relative z-10 min-h-screen flex flex-col">
          <SiteHeader />
          <main className="flex-1 px-4 py-10">
            <div className="max-w-5xl mx-auto text-center text-sm text-[var(--muted)] py-20">
              Loading...
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
        <div className="flex-1 flex">
          {/* Sidebar */}
          <aside className="hidden md:flex w-56 shrink-0 border-r border-[var(--border)] bg-[var(--bg)]/50">
            <div className="flex flex-col w-full p-4">
              <div className="mb-6 px-2">
                <p className="text-xs font-medium text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-[var(--muted)] truncate">{user?.email}</p>
              </div>
              <nav className="flex-1 space-y-1">
                {NAV.map((item) => {
                  const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 rounded-lg text-xs transition-colors ${
                        active
                          ? "bg-[var(--surface-2)] text-white"
                          : "text-[var(--muted)] hover:text-white hover:bg-[var(--surface)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <button
                onClick={handleLogout}
                className="mt-4 px-3 py-2 text-xs text-[var(--muted)] hover:text-white transition-colors text-left"
              >
                Log out
              </button>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">
            <div className="max-w-4xl mx-auto p-4 sm:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
