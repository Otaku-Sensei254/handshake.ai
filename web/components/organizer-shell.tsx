"use client";

import { useEffect, useState, useCallback } from "react";
import SiteHeader from "@/components/site-header";
import OrganizerAuth from "@/components/organizer-auth";
import type { Organizer } from "@/lib/types";

export function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("organizer_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Wraps an authenticated organizer view. Handles session restore from
 * localStorage, shows the auth form when no session exists, and exposes
 * the organizer + sign-out handler to the child via render prop.
 */
export default function OrganizerShell({
  children,
}: {
  children: (ctx: {
    organizer: Organizer;
    onLogout: () => void;
  }) => React.ReactNode;
}) {
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("organizer_token");
    if (!token) {
      setAuthLoading(false);
      return;
    }
    fetch("/api/organizer/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.organizer) {
          setOrganizer(data.organizer);
        } else {
          localStorage.removeItem("organizer_token");
        }
      })
      .catch(() => localStorage.removeItem("organizer_token"))
      .finally(() => setAuthLoading(false));
  }, []);

  const handleAuth = useCallback((org: Organizer, token: string) => {
    localStorage.setItem("organizer_token", token);
    setOrganizer(org);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("organizer_token");
    setOrganizer(null);
  }, []);

  if (authLoading) {
    return (
      <>
        <div className="page-bg" />
        <div className="page-content min-h-screen pb-16">
          <SiteHeader active="organizer" />
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          </div>
        </div>
      </>
    );
  }

  if (!organizer) {
    return (
      <>
        <div className="page-bg" />
        <div className="page-content min-h-screen pb-16">
          <SiteHeader active="organizer" />
          <OrganizerAuth onAuth={handleAuth} />
        </div>
      </>
    );
  }

  return <>{children({ organizer, onLogout: handleLogout })}</>;
}
