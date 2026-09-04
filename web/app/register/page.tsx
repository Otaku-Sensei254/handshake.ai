"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/site-header";
import PasswordField from "@/components/password-field";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative">
      <div className="relative z-10 min-h-screen flex flex-col">
        <SiteHeader />

        <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
          <div className="w-full max-w-sm">
            {/* Logo / brand */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white text-black font-bold text-lg mb-4">
                H
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Create your account
              </h1>
              <p className="text-[var(--muted)] text-sm mt-2">
                Join events and get matched with the right people.
              </p>
            </div>

            {/* Form card */}
            <form onSubmit={handleSubmit} className="card p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[var(--fg)]">Username</label>
                <input
                  className="input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="aminaodhiambo"
                  required
                  minLength={3}
                  maxLength={30}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[var(--fg)]">Email</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[var(--fg)]">Password</label>
                <PasswordField
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="text-sm text-[var(--error)] bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors disabled:bg-[#27272a] disabled:text-[#52525b] disabled:cursor-not-allowed bg-white text-black hover:bg-[#e4e4e7]"
              >
                {loading ? "Creating account…" : "Create account →"}
              </button>

              <p className="text-center text-xs text-[var(--muted-3)]">
                Already have an account?{" "}
                <Link href="/login" className="text-white underline underline-offset-2">
                  Log in
                </Link>
              </p>
            </form>

            <p className="text-center text-[10px] text-[var(--muted-3)] mt-6">
              By signing up, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
