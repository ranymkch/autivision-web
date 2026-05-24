"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Resolves the primary CTA on the marketing site.
 *
 *  - Unauthenticated users land on /login then bounce to /app/screening.
 *  - Authenticated users go straight to /app/screening (their session is valid).
 *  - The label adapts: "Start screening" stays a clear, action-oriented call.
 */
export function useCta() {
  const { isAuthenticated } = useAuth();
  const { t, locale } = useI18n();

  if (isAuthenticated) {
    return {
      href: "/app/screening",
      label: locale === "fr" ? "Aller au tableau de bord" : "Go to dashboard",
      labelPrimary: t.hero.primary, // keep "Start screening" if used in CTA band
      hrefDashboard: "/app/dashboard",
    };
  }

  return {
    href: "/login?next=/app/screening",
    label: t.nav.cta,
    labelPrimary: t.hero.primary,
    hrefDashboard: "/login?next=/app/dashboard",
  };
}
