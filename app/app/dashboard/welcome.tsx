"use client";

import { useI18n } from "@/lib/i18n/provider";

export function DashboardWelcome({ email }: { email: string | null }) {
  const { t } = useI18n();
  if (!email) return null;
  // If the passed value looks like an email address, extract the local part
  const displayName = email.includes("@") ? email.split("@")[0] : email;
  return (
    <p className="mb-2 text-sm text-muted-foreground">
      {t.app.dashboard.welcome}, <span className="font-medium text-foreground">{displayName}</span>.
    </p>
  );
}
