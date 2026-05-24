"use client";

import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LangSwitcher } from "@/components/shared/lang-switcher";
import { useI18n } from "@/lib/i18n/provider";
import { useAuth } from "@/components/providers/auth-provider";
import { signOut } from "@/app/app/actions";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, { fr: string; en: string; style: string }> = {
  doctor: { fr: "Médecin", en: "Doctor", style: "bg-primary/10 text-primary" },
  admin:  { fr: "Admin",   en: "Admin",  style: "bg-destructive/10 text-destructive" },
};

export function Topbar() {
  const { t, locale } = useI18n();
  const { username, role } = useAuth();
  const roleInfo = role ? ROLE_LABELS[role] : null;

  return (
    /* pl-14 on mobile reserves space for the fixed hamburger button rendered by Sidebar */
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 pl-14 pr-6 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span className="truncate font-medium text-foreground">{username ?? "—"}</span>
        {roleInfo && (
          <span
            className={cn(
              "ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              roleInfo.style
            )}
          >
            {locale === "fr" ? roleInfo.fr : roleInfo.en}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <LangSwitcher />
        <ThemeToggle />
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="gap-1.5">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t.app.nav.signOut}</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
