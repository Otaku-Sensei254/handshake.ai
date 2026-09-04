"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/site-header";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Could not reach the server");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative">
      <div className="relative z-10 min-h-screen flex flex-col">
        <SiteHeader />

        <main className="flex-1 px-4 py-10 sm:py-16">
          <div className="max-w-sm mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-white leading-[1.15]">
                Welcome back
              </h1>
              <p className="text-[var(--muted)] text-sm mt-2">
                Log in to your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="card p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm text-[#a1a1aa]">Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-[#a1a1aa]">Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-[#f87171] bg-[#450a0a] border border-[#7f1d1d] rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors disabled:bg-[#27272a] disabled:text-[#52525b] disabled:cursor-not-allowed bg-white text-black hover:bg-[#e4e4e7]"
              >
                {loading ? "Logging in…" : "Log in →"}
              </button>

              <p className="text-center text-xs text-[#52525b]">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-white underline underline-offset-2">
                  Register
                </Link>
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
