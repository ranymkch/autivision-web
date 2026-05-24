"use client";

import Link from "next/link";
import { Wordmark } from "@/components/shared/wordmark";
import { useI18n } from "@/lib/i18n/provider";

export function MarketingFooter() {
  const { t, locale } = useI18n();

  const ethicsLabel = locale === "fr" ? "Éthique & Légal" : "Ethics & Legal";
  const cols = [
    {
      title: t.footer.product,
      links: [
        { label: t.nav.whatIsAsd, href: "/what-is-asd" },
        { label: t.nav.metrics,   href: "/metrics"     },
      ],
    },
    {
      title: t.footer.company,
      links: [
        { label: t.nav.about, href: "/about" },
      ],
    },
    {
      title: t.footer.legal,
      links: [
        { label: ethicsLabel, href: "/ethics" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-card/40">
      <div className="container-av py-16">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="space-y-3 md:col-span-2">
            <Wordmark size="md" />
            <p className="max-w-xs text-sm text-muted-foreground">{t.footer.tagline}</p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} AutiVision. {t.footer.rights}</p>
          <p className="font-mono uppercase tracking-widest">PFE · 2026</p>
        </div>
      </div>
    </footer>
  );
}
