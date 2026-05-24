"use client";

import { Reveal } from "@/components/shared/reveal";
import { SectionLabel } from "@/components/marketing/section-label";
import { TrainingCurves } from "@/components/marketing/training-curves";
import { useI18n } from "@/lib/i18n/provider";

// ViT-B/16 + EfficientNet-B0 late-fusion — test-set results (200 held-out images).
const overall = {
  accuracy:  0.9100,
  precision: 0.9102,
  recall:    0.9100,
  f1:        0.9100,
  auc:       null as number | null,   // ROC-AUC not computed in training notebook
};
const dataset = {
  samples: "2,926",
  split: "2,526 / 200 / 200",
  classes: "ASD · Non-ASD",
};
// rows = actual, cols = predicted: [[TN, FP], [FN, TP]]
// Non-ASD row: 90 correct, 10 mis-classified as ASD
// ASD row    :  8 mis-classified as Non-ASD, 92 correct
const confusion = [
  [90, 10],
  [ 8, 92],
];

export default function MetricsPage() {
  const { t } = useI18n();
  return (
    <>
      <section className="relative pb-12 pt-40">
        <div className="container-av max-w-4xl space-y-6">
          <Reveal>
            <SectionLabel label={t.nav.metrics} />
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="font-display text-display-xl font-bold text-balance">
              {t.metrics.title}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="max-w-2xl text-lg text-muted-foreground">{t.metrics.subtitle}</p>
          </Reveal>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-av max-w-5xl space-y-12">
          {/* Overall */}
          <Reveal>
            <h2 className="mb-5 font-display text-xl font-bold">{t.metrics.overall}</h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
              <Metric label={t.metrics.accuracy}  value={overall.accuracy}  />
              <Metric label={t.metrics.precision} value={overall.precision} />
              <Metric label={t.metrics.recall}    value={overall.recall}    />
              <Metric label={t.metrics.f1}        value={overall.f1}        />
              <Metric label={t.metrics.auc}       value={overall.auc}       na="N/A" />
            </div>
          </Reveal>

          {/* Dataset */}
          <Reveal>
            <h2 className="mb-5 font-display text-xl font-bold">{t.metrics.dataset}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Tile label={t.metrics.samples} value={dataset.samples} />
              <Tile label={t.metrics.split}   value={dataset.split} />
              <Tile label={t.metrics.classes} value={dataset.classes} />
            </div>
          </Reveal>

          {/* Confusion matrix */}
          <Reveal>
            <h2 className="mb-5 font-display text-xl font-bold">{t.metrics.confusion}</h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">↓ {t.metrics.actual} \ {t.metrics.pred} →</th>
                    <th className="px-4 py-3 text-center font-medium">{t.metrics.td}</th>
                    <th className="px-4 py-3 text-center font-medium">{t.metrics.asd}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-4 py-4 font-medium">{t.metrics.td}</td>
                    <td className="px-4 py-4 text-center font-mono text-base">{confusion[0][0]}</td>
                    <td className="px-4 py-4 text-center font-mono text-base">{confusion[0][1]}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 font-medium">{t.metrics.asd}</td>
                    <td className="px-4 py-4 text-center font-mono text-base">{confusion[1][0]}</td>
                    <td className="px-4 py-4 text-center font-mono text-base">{confusion[1][1]}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Reveal>

          {/* Training curves */}
          <Reveal>
            <TrainingCurves title={t.metrics.curves} />
          </Reveal>

          {/* Notes */}
          <Reveal>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t.metrics.notesTitle}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {t.metrics.notes.map((n) => (
                  <li key={n} className="border-l-2 border-border pl-3">{n}</li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, na }: { label: string; value: number | null; na?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {value === null ? (
        <p className="mt-2 font-display text-3xl font-bold text-muted-foreground">{na ?? "—"}</p>
      ) : (
        <p className="mt-2 font-display text-3xl font-bold text-primary tabular-nums">
          {(value * 100).toFixed(1)}<span className="text-base text-muted-foreground">%</span>
        </p>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}
