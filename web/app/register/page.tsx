import Link from "next/link";
import RegistrationForm from "@/components/registration-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen relative">
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <span className="w-7 h-7 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30 flex items-center justify-center text-[var(--success)] text-sm font-semibold group-hover:bg-[var(--success)]/20 transition-colors">H</span>
              <span className="text-sm font-medium text-white hidden sm:inline">Handshake</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link href="/register" className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors text-white bg-[var(--surface-2)]">Register</Link>
              <Link href="/live" className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors text-[var(--muted)] hover:text-white hover:bg-[var(--surface)]">Live demo</Link>
              <Link href="/organizer" className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors text-[var(--muted)] hover:text-white hover:bg-[var(--surface)]">Organizer</Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 px-4 py-10 sm:py-16">
          <div className="max-w-xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-[1.15]">
                Join MiniHack Kenya
              </h1>
              <p className="text-[var(--muted)] text-sm mt-2">
                Create your profile and let your agent start negotiating introductions.
              </p>
            </div>
            <div className="card p-6 sm:p-8">
              <RegistrationForm />
            </div>
          </div>
        </main>

        <footer className="text-center text-xs text-[#3f3f46] pb-8">
          Built for MiniHack · MiniHack ecosystem · Kenya
        </footer>
      </div>
    </div>
  );
}
