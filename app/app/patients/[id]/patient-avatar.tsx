"use client";

import { User } from "lucide-react";

export function PatientAvatar({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  const initials = name.slice(0, 2).toUpperCase();

  if (!photoUrl) {
    return (
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-sm font-mono text-muted-foreground">
        <User className="h-8 w-8 text-muted-foreground/60" />
      </div>
    );
  }

  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt={`Photo of ${name}`}
        className="h-full w-full object-cover"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = "none";
          const fallback = target.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = "flex";
        }}
      />
      <div
        style={{ display: "none" }}
        className="absolute inset-0 flex items-center justify-center text-sm font-mono text-muted-foreground"
      >
        {initials}
      </div>
    </div>
  );
}
