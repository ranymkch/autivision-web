"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Send, Combine } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResultCard, type ResultAction } from "@/components/app/result-card";
import { useI18n } from "@/lib/i18n/provider";
import { AQ10_ITEMS } from "@/lib/data/aq10";
import { isComplete } from "@/services/questionnaireScoring";
import type { AQ10Answers, Likert } from "@/types/questionnaire";
import type { RisqueEnum } from "@/types/database";
import { submitAQ10, computeCombinedResult, generateResultReport } from "./actions";
import { cn } from "@/lib/utils";

interface QuestionnaireResult {
  evaluationId: string;
  questionnaireScore: number;
  rawScore: number;
  thresholdMet: boolean;
  tier: RisqueEnum;
  aiScore: number | null;
}

interface CombinedResult {
  combinedScore: number;
  aiScore: number;
  questionnaireScore: number;
  tier: RisqueEnum;
}

export function QuestionnaireClient({
  patientId,
  patientLabel,
  evaluationId,
  locale: localeProp,
}: {
  patientId: string;
  patientLabel: string;
  evaluationId: string | null;
  locale?: "en" | "fr";
}) {
  const { t, locale: i18nLocale } = useI18n();
  const locale = localeProp ?? i18nLocale;
  const router = useRouter();
  const isFr = locale === "fr";

  const [answers, setAnswers] = useState<AQ10Answers>({});
  const [submitting, startSubmitting] = useTransition();
  const [computingCombined, startComputingCombined] = useTransition();
  const [generatingQReport, startGeneratingQReport] = useTransition();
  const [generatingCombinedReport, startGeneratingCombinedReport] = useTransition();

  const [qResult, setQResult] = useState<QuestionnaireResult | null>(null);
  const [combined, setCombined] = useState<CombinedResult | null>(null);

  const completed = Object.values(answers).filter(Boolean).length;
  const ready = isComplete(answers);

  function setAnswer(id: string, val: Likert) {
    setAnswers((s) => ({ ...s, [id]: val }));
  }

  function handleSubmit() {
    startSubmitting(async () => {
      const res = await submitAQ10({ patientId, evaluationId, answers });
      if (!res.ok) {
        toast.error(res.error ?? "Submit failed");
        return;
      }
      setQResult({
        evaluationId: res.evaluationId!,
        questionnaireScore: res.questionnaireScore!,
        rawScore: res.rawScore!,
        thresholdMet: res.thresholdMet!,
        tier: res.tier!,
        aiScore: res.aiScore ?? null,
      });
      toast.success(isFr ? "Questionnaire enregistré" : "Questionnaire saved");
    });
  }

  function handleGetCombined() {
    if (!qResult) return;
    startComputingCombined(async () => {
      const res = await computeCombinedResult(qResult.evaluationId);
      if (!res.ok) {
        toast.error(res.error ?? "Could not compute combined result");
        return;
      }
      setCombined({
        combinedScore: res.combinedScore!,
        aiScore: res.aiScore!,
        questionnaireScore: res.questionnaireScore!,
        tier: res.tier!,
      });
      toast.success(isFr ? "Résultat combiné calculé" : "Combined result computed");
    });
  }

  function handleGenerateQReport() {
    if (!qResult) return;
    startGeneratingQReport(async () => {
      const res = await generateResultReport(qResult.evaluationId, locale, "questionnaire");
      if (!res.ok || !res.reportId) {
        toast.error(res.error ?? "Could not generate report");
        return;
      }
      router.push(`/report/${res.reportId}`);
    });
  }

  function handleGenerateCombinedReport() {
    if (!qResult) return;
    startGeneratingCombinedReport(async () => {
      const res = await generateResultReport(qResult.evaluationId, locale, "combined");
      if (!res.ok || !res.reportId) {
        toast.error(res.error ?? "Could not generate report");
        return;
      }
      router.push(`/report/${res.reportId}`);
    });
  }

  // ── Results view ──────────────────────────────────────────────────────────
  if (qResult) {
    const recommendation = buildRecommendation(qResult.tier, isFr);

    const qActions: ResultAction[] = [
      {
        label: generatingQReport
          ? (isFr ? "Génération…" : "Generating…")
          : (isFr ? "Rapport questionnaire" : "Questionnaire report"),
        icon: "open",
        onClick: handleGenerateQReport,
        disabled: generatingQReport,
      },
      {
        label: isFr ? "Tableau de bord" : "Dashboard",
        icon: "dashboard",
        href: "/app/dashboard",
        variant: "outline",
      },
    ];

    return (
      <div className="space-y-6">
        {/* Questionnaire result */}
        <ResultCard
          mode="questionnaire"
          mainScore={qResult.questionnaireScore}
          tier={qResult.tier}
          aiScore={qResult.aiScore}
          questionnaireScore={qResult.questionnaireScore}
          questionnaireRaw={qResult.rawScore}
          recommendation={recommendation}
          actions={qActions}
          patientLabel={patientLabel}
        />

        {/* Combined result (only if AI score is available and combined not yet computed) */}
        {qResult.aiScore != null && !combined && (
          <Card className="border-dashed border-primary/40">
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isFr
                  ? "Un score IA est disponible. Vous pouvez calculer le résultat combiné (60 % IA + 40 % questionnaire)."
                  : "An AI score is available. You can compute the combined result (60 % AI + 40 % questionnaire)."}
              </p>
              <Button
                onClick={handleGetCombined}
                disabled={computingCombined}
                className="gap-2"
              >
                <Combine className="h-4 w-4" />
                {computingCombined
                  ? (isFr ? "Calcul…" : "Computing…")
                  : (isFr ? "Obtenir le résultat combiné" : "Get Combined Result")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Combined result card */}
        {combined && (
          <ResultCard
            mode="combined"
            mainScore={combined.combinedScore}
            tier={combined.tier}
            aiScore={combined.aiScore}
            questionnaireScore={combined.questionnaireScore}
            recommendation={buildRecommendation(combined.tier, isFr)}
            actions={[
              {
                label: generatingCombinedReport
                  ? (isFr ? "Génération…" : "Generating…")
                  : (isFr ? "Rapport combiné" : "Combined report"),
                icon: "open",
                onClick: handleGenerateCombinedReport,
                disabled: generatingCombinedReport,
              },
            ]}
            patientLabel={patientLabel}
          />
        )}
      </div>
    );
  }

  // ── Questionnaire form ─────────────────────────────────────────────────────
  return (
    <Card>
      <CardContent className="space-y-6 p-6 md:p-8">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            {t.app.questionnaire.subtitle}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t.app.questionnaire.progress}</span>
            <span className="font-mono">{completed} / {AQ10_ITEMS.length}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(completed / AQ10_ITEMS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {AQ10_ITEMS.map((q, i) => {
            const a = answers[q.id];
            return (
              <div key={q.id} className="rounded-xl border border-border p-4">
                <p className="text-sm leading-relaxed">
                  <span className="font-mono text-xs text-muted-foreground">{i + 1}.</span>{" "}
                  {isFr ? q.prompt_fr : q.prompt_en}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["DA", "SA", "SD", "DD"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswer(q.id, opt)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                        a === opt
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      {t.app.questionnaire.options[opt]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button asChild variant="ghost">
            <Link
              href={
                evaluationId
                  ? `/app/screening/report/${evaluationId}`
                  : "/app/dashboard"
              }
            >
              <ArrowLeft /> {t.app.questionnaire.back}
            </Link>
          </Button>
          <Button onClick={handleSubmit} disabled={!ready || submitting}>
            {submitting ? t.app.questionnaire.submitting : (
              <>
                <Send /> {t.app.questionnaire.submit}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function buildRecommendation(tier: RisqueEnum, isFr: boolean): string {
  if (tier === "ELEVE") {
    return isFr
      ? "Orientation vers une équipe pluridisciplinaire spécialisée en troubles du neurodéveloppement pour évaluation diagnostique formelle."
      : "Refer to a multidisciplinary team specialised in neurodevelopmental disorders for a formal diagnostic evaluation.";
  }
  if (tier === "MODERE") {
    return isFr
      ? "Suivi clinique rapproché et évaluation complémentaire pour préciser le profil développemental."
      : "Close clinical follow-up and complementary assessment are advised to refine the developmental profile.";
  }
  return isFr
    ? "Aucune action immédiate suggérée par ce dépistage. Maintenir une surveillance développementale habituelle."
    : "No immediate action suggested by this screening. Maintain routine developmental surveillance.";
}
