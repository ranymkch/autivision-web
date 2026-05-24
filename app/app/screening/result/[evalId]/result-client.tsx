"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LayoutDashboard, ClipboardList, FileText, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/app/risk-badge";
import { useI18n } from "@/lib/i18n/provider";
import { generateFaceReport } from "../../actions";
import type { RisqueEnum } from "@/types/database";

interface Props {
  evalId: string;
  patientId: string;
  patientCode: string;
  patientName: string | null;
  patientPhoto: string | null;
  patientAge: number | null;
  patientSexe: "M" | "F" | "AUTRE" | null;
  scoreImage: number | null;
  niveauRisque: RisqueEnum | null;
  mlPrediction: "autistic" | "non_autistic" | null;
  mlModel: string;
  locale: "en" | "fr";
}

const RISK_COLORS: Record<string, string> = {
  ELEVE:  "border-red-200   bg-red-50   dark:border-red-900   dark:bg-red-950/20",
  MODERE: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20",
  FAIBLE: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20",
};

export function ScreeningResultClient({
  evalId,
  patientId,
  patientCode,
  patientName,
  patientPhoto,
  patientAge,
  patientSexe,
  scoreImage,
  niveauRisque,
  mlPrediction,
  mlModel,
  locale,
}: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const isFr = locale === "fr";
  const [generating, startGenerating] = useTransition();

  const scorePct = scoreImage != null ? `${(scoreImage * 100).toFixed(1)}%` : "—";

  function handleGenerateReport() {
    startGenerating(async () => {
      const res = await generateFaceReport(evalId, locale);
      if (!res.ok || !res.reportId) {
        toast.error(res.error ?? (isFr ? "Échec de la génération" : "Generation failed"));
        return;
      }
      toast.success(isFr ? "Rapport généré" : "Report generated");
      router.push(`/report/${res.reportId}`);
    });
  }

  const risk = niveauRisque ?? "FAIBLE";
  const riskBannerClass = RISK_COLORS[risk] ?? RISK_COLORS.FAIBLE;

  return (
    <div className="space-y-6">
      {/* Patient card */}
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary">
            {patientPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={patientPhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            {patientName && (
              <p className="font-display text-lg font-semibold">{patientName}</p>
            )}
            <p className="font-mono text-xs text-muted-foreground">{patientCode}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {patientAge != null ? `${isFr ? "Âge" : "Age"} ${patientAge}` : ""}
              {patientAge != null && patientSexe ? " · " : ""}
              {patientSexe ? t.app.sex[patientSexe] : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Result banner */}
      <div className={`rounded-xl border p-6 ${riskBannerClass}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isFr ? "Résultat du dépistage IA" : "AI Screening Result"}
            </p>
            <div className="flex items-center gap-3">
              <span className="font-display text-4xl font-bold">{scorePct}</span>
              <div className="space-y-1">
                <RiskBadge risk={niveauRisque} />
                <p className="text-xs text-muted-foreground">
                  {mlPrediction === "autistic"
                    ? (isFr ? "Prédiction : autistique" : "Prediction: autistic")
                    : (isFr ? "Prédiction : non autistique" : "Prediction: non-autistic")}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {isFr ? "Moteur" : "Engine"}: {isFr ? "Analyse IA" : "AI Screening Engine"}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <Button onClick={handleGenerateReport} disabled={generating} size="sm">
              <FileText className="h-4 w-4" />
              {generating
                ? (isFr ? "Génération…" : "Generating…")
                : (isFr ? "Générer rapport IA" : "Generate AI Report")}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/questionnaire/${patientId}?evaluation=${evalId}`}>
                <ClipboardList className="h-4 w-4" />
                {isFr ? "Faire le questionnaire AQ-10" : "Take AQ-10 Questionnaire"}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/app/dashboard">
            <LayoutDashboard className="h-4 w-4" />
            {isFr ? "Tableau de bord" : "Dashboard"}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/app/patients/${patientId}`}>
            {isFr ? "Fiche patient" : "Patient profile"}
          </Link>
        </Button>
      </div>
    </div>
  );
}

