"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function OrganizerNavLink({ className }: { className?: string }) {
  const [isOrganizer, setIsOrganizer] = useState(false);

  useEffect(() => {
    setIsOrganizer(Boolean(localStorage.getItem("organizer_token")));
  }, []);

  if (!isOrganizer) return null;

  return (
    <Link href="/organizer" className={className}>
      Organizer
    </Link>
  );
}
