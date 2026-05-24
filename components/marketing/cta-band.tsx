"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";
import { useI18n } from "@/lib/i18n/provider";
import { useAuth } from "@/components/providers/auth-provider";

export function CTABand() {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();

  const primaryHref = isAuthenticated ? "/app/screening" : "/login?next=/app/screening";
  const primaryLabel = isAuthenticated ? t.hero.goToScreening : t.cta.primary;

  return (
    <section className="relative overflow-hidden border-y border-border py-24">
      <div className="pointer-events-none absolute inset-0 bg-radial-fade" />
      <div className="container-av relative space-y-8 text-center">
        <Reveal>
          <h2 className="mx-auto max-w-3xl font-display text-display-lg font-semibold text-balance">
            {t.cta.title}
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto max-w-xl text-muted-foreground">{t.cta.body}</p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="xl">
              <Link href={primaryHref}>
                {primaryLabel} <ArrowRight />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
