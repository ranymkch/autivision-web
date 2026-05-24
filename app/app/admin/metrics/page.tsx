import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TrainingCurves } from "@/components/marketing/training-curves";

const overall = {
  accuracy:  0.9100,
  precision: 0.9102,
  recall:    0.9100,
  f1:        0.9100,
  auc:       null as number | null,
};
const dataset = { samples: "2,926", split: "2,526 / 200 / 200", classes: "ASD · Non-ASD" };
const confusion = [[90, 10], [8, 92]];

export default async function AdminMetricsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, locale")
    .eq("id", user.id)
    .single();

  if (!can((profile as any)?.role, "admin:manage")) redirect("/app/dashboard");

  const t = getDictionary(((profile as any)?.locale ?? "fr") as Locale);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title={t.metrics.title} subtitle={t.metrics.subtitle} />

      {/* Overall */}
      <div>
        <h2 className="mb-4 font-display text-base font-semibold">{t.metrics.overall}</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
          <MetricCard label={t.metrics.accuracy}  value={overall.accuracy}  />
          <MetricCard label={t.metrics.precision} value={overall.precision} />
          <MetricCard label={t.metrics.recall}    value={overall.recall}    />
          <MetricCard label={t.metrics.f1}        value={overall.f1}        />
          <MetricCard label={t.metrics.auc}       value={overall.auc}       na="N/A" />
        </div>
      </div>

      {/* Dataset */}
      <div>
        <h2 className="mb-4 font-display text-base font-semibold">{t.metrics.dataset}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <TileCard label={t.metrics.samples} value={dataset.samples} />
          <TileCard label={t.metrics.split}   value={dataset.split} />
          <TileCard label={t.metrics.classes} value={dataset.classes} />
        </div>
      </div>

      {/* Confusion matrix */}
      <div>
        <h2 className="mb-4 font-display text-base font-semibold">{t.metrics.confusion}</h2>
        <Card>
          <CardContent className="p-0 overflow-hidden">
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
          </CardContent>
        </Card>
      </div>

      {/* Training curves */}
      <TrainingCurves title={t.metrics.curves} />

      {/* Notes */}
      <Card>
        <CardContent className="p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t.metrics.notesTitle}
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {t.metrics.notes.map((n) => (
              <li key={n} className="border-l-2 border-border pl-3">{n}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, na }: { label: string; value: number | null; na?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {value === null ? (
          <p className="mt-2 font-display text-3xl font-bold text-muted-foreground">{na ?? "—"}</p>
        ) : (
          <p className="mt-2 font-display text-3xl font-bold text-primary tabular-nums">
            {(value * 100).toFixed(1)}<span className="text-base text-muted-foreground">%</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TileCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
