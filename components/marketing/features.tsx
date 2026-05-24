"use client";

import { Check, Brain, ScanFace, FileSignature } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { SectionLabel } from "./section-label";
import { useI18n } from "@/lib/i18n/provider";

const ICONS = [ScanFace, Brain, FileSignature] as const;

export function Features() {
  const { t } = useI18n();
  return (
    <section id="features" className="section-pad">
      <div className="container-av">
        <Reveal className="mx-auto max-w-2xl space-y-4 text-center">
          <SectionLabel label={t.features.label} className="justify-center" />
          <h2 className="font-display text-display-lg font-bold text-balance">
            {t.features.title}
          </h2>
          <p className="text-muted-foreground">{t.features.subtitle}</p>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {t.features.items.map((feat, i) => {
            const Icon = ICONS[i] ?? ScanFace;
            return (
              <Reveal key={feat.title} delay={0.1 * i}>
                <div className="group h-full rounded-2xl border border-border bg-card p-7 transition-colors hover:border-primary/40">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold">{feat.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feat.description}</p>
                  <ul className="mt-5 space-y-2.5">
                    {feat.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
