"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ScanFace,
  FileText,
  Settings,
  ClipboardList,
  HelpCircle,
  History,
  UserCog,
  BarChart2,
  Menu,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/shared/wordmark";

const ALL_NAV_ITEMS = [
  { href: "/app/dashboard",     label: "dashboard",     icon: LayoutDashboard, roles: ["doctor", "admin"] },
  { href: "/app/screening",     label: "screening",     icon: ScanFace,        roles: ["doctor"] },
  { href: "/app/questionnaire", label: "questionnaire", icon: ClipboardList,   roles: ["doctor"] },
  { href: "/app/patients",      label: "patients",      icon: Users,           roles: ["doctor"] },
  { href: "/app/reports",       label: "reports",       icon: FileText,        roles: ["doctor"] },
  { href: "/app/history",       label: "history",       icon: History,         roles: ["doctor"] },
  { href: "/app/metrics",       label: "metrics",       icon: BarChart2,       roles: ["doctor"] },
  { href: "/app/settings",      label: "settings",      icon: Settings,        roles: ["doctor"] },
  { href: "/app/admin/users",    label: "admin_users",    icon: UserCog,    roles: ["admin"] },
  { href: "/app/admin/history",  label: "admin_history",  icon: History,    roles: ["admin"] },
  { href: "/app/admin/metrics",  label: "admin_metrics",  icon: BarChart2,  roles: ["admin"] },
  { href: "/app/admin/settings", label: "admin_settings", icon: Settings,   roles: ["admin"] },
] as const;

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();
  const { role } = useAuth();
  const pathname = usePathname();

  const labelMap: Record<string, string> = {
    dashboard:      t.app.nav.dashboard,
    screening:      t.app.nav.screening,
    questionnaire:  t.app.nav.questionnaire,
    patients:       t.app.nav.patients,
    reports:        t.app.nav.reports,
    history:        t.app.nav.history,
    metrics:        t.app.nav.metrics,
    settings:       t.app.nav.settings,
    admin_users:    t.app.nav.adminUsers,
    admin_history:  t.app.nav.adminHistory,
    admin_metrics:  t.app.nav.adminMetrics,
    admin_settings: t.app.nav.adminSettings,
  };

  const items = ALL_NAV_ITEMS.filter((it) =>
    role ? (it.roles as readonly string[]).includes(role) : false
  );

  const close = () => setMobileOpen(false);

  const navLinks = (
    <>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {role === "admin" && (
          <p className="mb-1 px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t.app.nav.adminSection}
          </p>
        )}
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              onClick={close}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-secondary active:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {labelMap[it.label]}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <FooterLink href="/what-is-asd" icon={HelpCircle} label={t.nav.whatIsAsd} />
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/40 lg:flex">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/app/dashboard">
            <Wordmark size="md" />
          </Link>
        </div>
        {navLinks}
      </aside>

      {/* Mobile: hamburger button fixed in top-left */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-[14px] z-40 flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-secondary active:bg-secondary lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={close}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <Link href="/app/dashboard" onClick={close}>
                <Wordmark size="md" />
              </Link>
              <button
                type="button"
                onClick={close}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-secondary active:text-foreground"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navLinks}
          </aside>
        </>
      )}
    </>
  );
}

function FooterLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:bg-secondary active:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
