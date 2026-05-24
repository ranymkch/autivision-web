import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, can } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { RiskBadge } from "@/components/app/risk-badge";
import { formatDate } from "@/lib/utils";

export default async function ReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, locale")
    .eq("id", user!.id)
    .single();
  const role = isAppRole(profile?.role) ? profile!.role : null;
  const isFr = profile?.locale === "fr";
  const canGenerate = can(role, "reports:generate");

  const { data } = await supabase
    .from("reports")
    .select(`
      id, generated_at, report_type, evaluation_id,
      evaluations(niveau_risque, ml_prediction, ml_confidence, result_mode,
        patients(code_anonymise))
    `)
    .order("generated_at", { ascending: false });

  const rows = (data ?? []) as any[];

  const REPORT_TYPE_LABELS: Record<string, { en: string; fr: string }> = {
    ai:            { en: "AI",            fr: "IA" },
    face:          { en: "AI",            fr: "IA" },
    questionnaire: { en: "Questionnaire", fr: "Questionnaire" },
    combined:      { en: "Combined",      fr: "Combiné" },
  };

  const RESULT_MODE_LABELS: Record<string, { en: string; fr: string }> = {
    ai:            { en: "AI only",        fr: "IA seule" },
    questionnaire: { en: "Questionnaire",  fr: "Questionnaire" },
    combined:      { en: "Combined",       fr: "Combiné" },
  };

  return (
    <>
      <PageHeader
        title={isFr ? "Rapports" : "Reports"}
        subtitle={
          canGenerate
            ? (isFr ? "Rapports de dépistage enregistrés — IA, questionnaire ou combiné." : "Saved screening reports — AI, questionnaire, or combined.")
            : (isFr ? "Vous pouvez consulter et télécharger les rapports. La génération nécessite un compte médecin." : "You can view and download reports. Generating new reports requires a doctor account.")
        }
      />

      <Card>
        <CardContent className="p-0">
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-medium">{isFr ? "Patient" : "Patient"}</th>
                    <th className="px-5 py-3 font-medium">{isFr ? "Date" : "Date"}</th>
                    <th className="px-5 py-3 font-medium">{isFr ? "Type" : "Type"}</th>
                    <th className="px-5 py-3 font-medium">{isFr ? "Mode" : "Mode"}</th>
                    <th className="px-5 py-3 font-medium">{isFr ? "Risque" : "Risk"}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const ev = r.evaluations;
                    return (
                      <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                        <td className="px-5 py-3 font-mono text-xs">
                          {ev?.patients?.code_anonymise ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {formatDate(r.generated_at)}
                        </td>
                        <td className="px-5 py-3 text-xs font-semibold">
                          {r.report_type
                            ? (isFr ? (REPORT_TYPE_LABELS[r.report_type]?.fr ?? r.report_type) : (REPORT_TYPE_LABELS[r.report_type]?.en ?? r.report_type))
                            : "—"}
                        </td>
                        <td className="px-5 py-3">
                          {ev?.result_mode ? (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">
                              {isFr ? (RESULT_MODE_LABELS[ev.result_mode]?.fr ?? ev.result_mode) : (RESULT_MODE_LABELS[ev.result_mode]?.en ?? ev.result_mode)}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <RiskBadge risk={ev?.niveau_risque ?? null} />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/report/${r.id}`}>
                              {isFr ? "Voir" : "View"} <ArrowRight />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {canGenerate
                ? (isFr ? "Aucun rapport pour le moment — générez-en un depuis un dépistage." : "No reports yet — generate one from a screening.")
                : (isFr ? "Aucun rapport disponible pour le moment." : "No reports available yet.")}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
