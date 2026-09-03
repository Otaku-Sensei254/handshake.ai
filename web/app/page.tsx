import Link from "next/link";
import Scanner from "@/components/Scanner";
import OrganizerNavLink from "@/components/organizer-nav-link";
import ThemeToggle from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 z-0">
        <Scanner
          color1="#1bd410"
          color2="#FF9FFC"
          color3="#FFFFFF"
          speed={0.5}
          sweepSpeed={0.25}
          sweepWidth={1.6}
          sweepFalloff={6}
          scale={1.5}
          frequency={2}
          ripple={0.22}
          bandDensity={11}
          lineSharpness={5.5}
          glow={0.22}
          scanDirection="vertical"
          colorSpread={0.7}
          brightness={1}
          contrast={1.15}
          softness={1.4}
          vignette={0.45}
          scanline
          grain
          grainIntensity={0.05}
          opacity={1}
          mouseInteraction
          mouseRadius={0.5}
          mouseStrength={0.5}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <span className="w-7 h-7 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/30 flex items-center justify-center text-[var(--success)] text-sm font-semibold group-hover:bg-[var(--success)]/20 transition-colors">H</span>
              <span className="text-sm font-medium text-[var(--fg)] hidden sm:inline">Handshake</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link href="/register" className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors text-[var(--fg)] bg-[var(--surface-2)]">Register</Link>
              <Link href="/live" className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)]">Live demo</Link>
              <OrganizerNavLink className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)]" />
            </nav>
            <div className="shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#52525b] border border-[var(--border)] rounded-full px-3 py-1.5 bg-[var(--bg)]/60 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse inline-block" />
              MiniHack Kenya · Handshake
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white leading-[1.1]">
              Your agent works the room
              <br />
              <span className="text-[var(--muted)]">so you don&apos;t have to.</span>
            </h1>

            <p className="text-[var(--muted)] text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Tell us who you are, what you&apos;re building, and what you need.
              Your agent does the rest — negotiating introductions with every other agent at the event.
              When it finds someone worth your time, <span className="text-white font-medium">your phone rings.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 bg-white text-black hover:bg-[#ededed] font-medium text-sm rounded-xl px-6 py-3 transition-colors">
                Get Started <span className="text-lg">→</span>
              </Link>
              <Link href="/live" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-white border border-[var(--border)] hover:border-[var(--border-hover)] rounded-xl px-6 py-3 transition-colors bg-[var(--bg)]/60 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                See a live negotiation
              </Link>
            </div>

            <div className="pt-8 border-t border-[var(--border)]">
              <p className="text-[var(--muted)] text-sm mb-3">Do you want to organize an event?</p>
              <Link href="/organizer" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--success)] hover:text-white border border-[var(--success)]/30 hover:border-[var(--success)] rounded-xl px-6 py-3 transition-colors bg-[var(--success)]/5 hover:bg-[var(--success)]/10">
                Organizer Portal <span className="text-lg">→</span>
              </Link>
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
