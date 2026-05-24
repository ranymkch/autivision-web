"use client";

import { Reveal } from "@/components/shared/reveal";
import { SectionLabel } from "./section-label";
import { useI18n } from "@/lib/i18n/provider";

export function Mission() {
  const { t } = useI18n();
  return (
    <section className="section-pad">
      <div className="container-av grid gap-12 md:grid-cols-12">
        <Reveal className="space-y-5 md:col-span-5">
          <SectionLabel label={t.mission.label} />
          <h2 className="font-display text-display-lg font-bold text-balance">{t.mission.title}</h2>
        </Reveal>
        <Reveal delay={0.15} className="space-y-6 md:col-span-7">
          <blockquote className="border-l-2 border-primary pl-6 font-display text-display-md font-semibold leading-tight text-foreground/90">
            "{t.mission.quote}"
          </blockquote>
          <p className="leading-relaxed text-muted-foreground">{t.mission.body1}</p>
          <p className="leading-relaxed text-muted-foreground">{t.mission.body2}</p>
        </Reveal>
      </div>
    </section>
  );
}
