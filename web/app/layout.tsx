import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import {ThirdwebProvider } from "thirdweb/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Handshake — Your agent works the room so you don't have to",
  description:
    "AI-powered matchmaking for MiniHack Kenya. Your agent negotiates introductions on your behalf, then calls you when it finds someone worth your time.",
  openGraph: {
    title: "Handshake",
    description: "Your agent works the room so you don't have to.",
  },
};

/**
 * Inline script that runs before React hydrates. Reads the persisted
 * theme from localStorage (or system preference) and sets data-theme
 * on <html> to avoid a flash of the wrong palette.
 */
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('handshake-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="min-h-full antialiased"
        style={{ background: "var(--body-bg)", color: "var(--body-fg)" }}
        suppressHydrationWarning
      >
        <ThirdwebProvider>
          {children}
        </ThirdwebProvider>
      </body>
    </html>
  );
}
