"use client";

import { Reveal } from "@/components/shared/reveal";
import { SectionLabel } from "@/components/marketing/section-label";
import { CTABand } from "@/components/marketing/cta-band";
import { useI18n } from "@/lib/i18n/provider";

export default function WhatIsAsdPage() {
  const { t } = useI18n();
  return (
    <>
      <section className="relative pb-12 pt-40">
        <div className="container-av max-w-4xl space-y-6">
          <Reveal>
            <SectionLabel label={t.nav.whatIsAsd} />
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="font-display text-display-xl font-bold text-balance">
              {t.whatIsAsd.title}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="max-w-2xl text-lg text-muted-foreground">{t.whatIsAsd.intro}</p>
          </Reveal>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-av max-w-3xl space-y-12">
          {t.whatIsAsd.sections.map((s, i) => (
            <Reveal key={s.heading} delay={i * 0.05}>
              <article className="space-y-3">
                <h2 className="font-display text-2xl font-bold">{s.heading}</h2>
                <p className="leading-relaxed text-muted-foreground">{s.body}</p>
              </article>
            </Reveal>
          ))}

          <Reveal>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t.whatIsAsd.sourcesTitle}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {t.whatIsAsd.sources.map((src) => (
                  <li key={src} className="border-l-2 border-border pl-3">{src}</li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <CTABand />
    </>
  );
}
