"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Combine, FileText, ClipboardList, Sparkles,
  ScanFace, ArrowRight, CheckCircle2, Download
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/provider";
import { generateResultReport } from "@/app/questionnaire/[patientId]/actions";
import { generateFaceReport } from "@/app/app/screening/actions";

type EvaluationSummary = {
  id: string;
  score_image: number | null;
  score_questionnaire: number | null;
  result_mode: string | null;
};

type ReportSummary = {
  id: string;
  report_type: string;
};

export function PatientReportActions({
  patientId,
  evaluations,
  reports,
  locale: localeProp,
}: {
  patientId: string;
  evaluations: EvaluationSummary[];
  reports?: ReportSummary[];
  locale?: "en" | "fr";
}) {
  const { locale: i18nLocale } = useI18n();
  const locale = localeProp ?? i18nLocale;
  const router = useRouter();
  const isFr = locale === "fr";

  const [generatingAI, startGeneratingAI] = useTransition();
  const [generatingQ, startGeneratingQ] = useTransition();
  const [generatingCombined, startGeneratingCombined] = useTransition();

  // Find the most relevant evaluation for each scenario
  const combinedEval = evaluations.find(
    (e) => e.score_image != null && e.score_questionnaire != null
  );
  const aiOnlyEval = evaluations.find(
    (e) => e.score_image != null && e.score_questionnaire == null
  );
  const qOnlyEval = evaluations.find(
    (e) => e.score_questionnaire != null && e.score_image == null
  );

  const hasAI = !!combinedEval || !!aiOnlyEval;
  const hasQ = !!combinedEval || !!qOnlyEval;
  const hasBoth = !!combinedEval;

  // Check which report types have already been generated (and get their IDs for direct navigation)
  const generatedTypes = new Set((reports ?? []).map((r) => r.report_type));
  const hasAIReport = generatedTypes.has("ai") || generatedTypes.has("face");
  const hasQReport = generatedTypes.has("questionnaire");
  const hasCombinedReport = generatedTypes.has("combined");

  const existingAIReportId = (reports ?? []).find((r) => r.report_type === "ai" || r.report_type === "face")?.id ?? null;
  const existingQReportId = (reports ?? []).find((r) => r.report_type === "questionnaire")?.id ?? null;
  const existingCombinedReportId = (reports ?? []).find((r) => r.report_type === "combined")?.id ?? null;

  // Latest eval for questionnaire link
  const lastEval = evaluations[0] ?? null;

  if (!hasAI && !hasQ) return null;

  function handleAIReport() {
    // If already exists, just navigate to it (no regeneration, no loading state)
    if (existingAIReportId) {
      router.push(`/report/${existingAIReportId}`);
      return;
    }
    const evalId = (combinedEval ?? aiOnlyEval)?.id;
    if (!evalId) return;
    startGeneratingAI(async () => {
      const res = await generateFaceReport(evalId, locale);
      if (!res.ok || !res.reportId) {
        toast.error(res.error ?? "Report generation failed");
        return;
      }
      toast.success(isFr ? "Rapport IA généré" : "AI report generated");
      router.push(`/report/${res.reportId}`);
    });
  }

  function handleQReport() {
    if (existingQReportId) {
      router.push(`/report/${existingQReportId}`);
      return;
    }
    const evalId = (combinedEval ?? qOnlyEval)?.id;
    if (!evalId) return;
    startGeneratingQ(async () => {
      const res = await generateResultReport(evalId, locale, "questionnaire");
      if (!res.ok || !res.reportId) {
        toast.error(res.error ?? "Report generation failed");
        return;
      }
      toast.success(isFr ? "Rapport questionnaire généré" : "Questionnaire report generated");
      router.push(`/report/${res.reportId}`);
    });
  }

  function handleCombinedReport() {
    if (existingCombinedReportId) {
      router.push(`/report/${existingCombinedReportId}`);
      return;
    }
    if (!combinedEval) return;
    startGeneratingCombined(async () => {
      const res = await generateResultReport(combinedEval.id, locale, "combined");
      if (!res.ok || !res.reportId) {
        toast.error(res.error ?? "Report generation failed");
        return;
      }
      toast.success(isFr ? "Rapport combiné généré" : "Combined report generated");
      router.push(`/report/${res.reportId}`);
    });
  }

  // Build next-step recommendation
  const recommendation = (() => {
    if (hasBoth && !hasCombinedReport) {
      return {
        icon: Combine,
        text: isFr
          ? "Les deux scores sont disponibles. Générez le rapport combiné pour une évaluation complète."
          : "Both scores are available. Generate the combined report for a complete assessment.",
        cta: isFr ? "Générer le rapport combiné" : "Generate Combined Report",
        action: handleCombinedReport,
        pending: generatingCombined,
      };
    }
    if (hasAI && !hasQ) {
      return {
        icon: ClipboardList,
        text: isFr
          ? "Dépistage IA effectué. Complétez le questionnaire AQ-10 pour obtenir un rapport combiné."
          : "IA screening done. Complete the AQ-10 questionnaire to get a combined report.",
        cta: isFr ? "Faire le questionnaire AQ-10" : "Take AQ-10 Questionnaire",
        href: `/questionnaire/${patientId}${lastEval ? `?evaluation=${lastEval.id}` : ""}`,
      };
    }
    if (hasQ && !hasAI) {
      return {
        icon: ScanFace,
        text: isFr
          ? "Questionnaire effectué. Effectuez le dépistage IA pour obtenir un rapport combiné."
          : "Questionnaire done. Run the IA screening to get a combined report.",
        cta: isFr ? "Lancer le dépistage IA" : "Run IA Screening",
        href: `/app/screening?patient=${patientId}`,
      };
    }
    if (hasBoth && hasCombinedReport) {
      return null; // All done
    }
    return null;
  })();

  return (
    <div className="mb-6 space-y-4">
      {/* Recommendation banner */}
      {recommendation && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <recommendation.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm text-foreground">{recommendation.text}</p>
            </div>
            {"href" in recommendation ? (
              <Button asChild size="sm" className="shrink-0">
                <Link href={(recommendation as any).href as string}>
                  {recommendation.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                className="shrink-0"
                onClick={recommendation.action}
                disabled={recommendation.pending}
              >
                {recommendation.pending
                  ? (isFr ? "Génération…" : "Generating…")
                  : recommendation.cta}
                {!recommendation.pending && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* All-complete banner */}
      {hasBoth && hasCombinedReport && hasAIReport && hasQReport && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              {isFr
                ? "Tous les rapports sont disponibles ci-dessous."
                : "All 3 reports are available below."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Report generation card */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            {isFr ? "Générer un rapport" : "Generate Report"}
          </h2>

          <div className="flex flex-wrap gap-3">
            {hasAI && (
              <Button
                variant={hasAIReport ? "outline" : "default"}
                onClick={handleAIReport}
                disabled={generatingAI}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                {generatingAI
                  ? (isFr ? "Génération…" : "Generating…")
                  : hasAIReport
                    ? (isFr ? "Voir rapport IA" : "View AI Report")
                    : (isFr ? "Rapport IA" : "AI Report")}
              </Button>
            )}

            {hasQ && (
              <Button
                variant={hasQReport ? "outline" : "default"}
                onClick={handleQReport}
                disabled={generatingQ}
                className="gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                {generatingQ
                  ? (isFr ? "Génération…" : "Generating…")
                  : hasQReport
                    ? (isFr ? "Voir rapport questionnaire" : "View Questionnaire Report")
                    : (isFr ? "Rapport questionnaire" : "Questionnaire Report")}
              </Button>
            )}

            {hasBoth && (
              <Button
                variant={hasCombinedReport ? "outline" : "default"}
                onClick={handleCombinedReport}
                disabled={generatingCombined}
                className="gap-2"
              >
                <Combine className="h-4 w-4" />
                {generatingCombined
                  ? (isFr ? "Génération…" : "Generating…")
                  : hasCombinedReport
                    ? (isFr ? "Voir rapport combiné" : "View Combined Report")
                    : (isFr ? "Rapport combiné" : "Combined Report")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
