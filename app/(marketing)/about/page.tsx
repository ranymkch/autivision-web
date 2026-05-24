"use client";

import { Reveal } from "@/components/shared/reveal";
import { SectionLabel } from "@/components/marketing/section-label";
import { Mission } from "@/components/marketing/mission";
import { CTABand } from "@/components/marketing/cta-band";
import { useI18n } from "@/lib/i18n/provider";

export default function AboutPage() {
  const { t } = useI18n();
  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-40">
        <div className="pointer-events-none absolute inset-0 bg-radial-fade" />
        <div className="container-av relative max-w-4xl space-y-6">
          <Reveal>
            <SectionLabel label={t.nav.about} />
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="font-display text-display-xl font-bold text-balance">
              {t.hero.title} {t.hero.titleAccent}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="max-w-2xl text-lg text-muted-foreground">{t.hero.subtitle}</p>
          </Reveal>
        </div>
      </section>
      <Mission />
      <CTABand />
    </>
  );
}
