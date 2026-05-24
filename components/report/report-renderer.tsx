"use client";

import type { ScreeningReport } from "@/types/report";
import { localizeReport } from "@/services/reportGenerator";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/app/risk-badge";
import { useI18n } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/utils";
import type { ResultMode } from "@/types/database";
import { User, Stethoscope, Calendar, Hash, Brain, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportRendererProps {
  report: ScreeningReport;
  patientPhoto?: string | null;
  patientName?: string | null;
  doctorName?: string | null;
}

const RISK_BANNER: Record<string, string> = {
  ELEVE:  "border-red-200   bg-red-50   dark:border-red-900   dark:bg-red-950/20   text-red-800   dark:text-red-300",
  MODERE: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300",
  FAIBLE: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20 text-green-800 dark:text-green-300",
};

export function ReportRenderer({ report, patientPhoto, patientName, doctorName }: ReportRendererProps) {
  const { t, locale } = useI18n();
  // Re-derive narrative text in the current UI locale so existing reports
  // stored in a different language display correctly without re-generation.
  const r = report.header.locale !== locale ? localizeReport(report, locale) : report;
  const isFr = locale === "fr";

  const tier = r.summary.riskTier as string;
  const bannerClass = RISK_BANNER[tier] ?? RISK_BANNER.FAIBLE;

  const mode: ResultMode =
    r.header.reportType === "face" ? "ai" : (r.header.reportType as ResultMode);

  const reportTypeLabel =
    mode === "ai"
      ? (isFr ? "Rapport IA seul" : "AI-only Report")
      : mode === "questionnaire"
        ? (isFr ? "Rapport questionnaire" : "Questionnaire Report")
        : (isFr ? "Rapport combiné" : "Combined Report");

  return (
    <div className="space-y-6">

      {/* Medical header — patient + doctor info */}
      <Card className="overflow-hidden border-2">
        <div className="border-b border-border bg-primary/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AutiVision</p>
              <p className="font-display text-xl font-bold">{isFr ? "Rapport de dépistage TSA" : "ASD Screening Report"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{reportTypeLabel}</p>
              <p className="font-mono text-xs font-semibold text-muted-foreground">
                {new Date(r.header.evaluationDate).toLocaleDateString(locale, {
                  year: "numeric", month: "long", day: "numeric"
                })}
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
            {/* Patient info */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.app.report.sections.patientInfo}
                </h3>
              </div>
              <div className="flex items-start gap-4">
                {/* Patient photo */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
                  {patientPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={patientPhoto}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                        const sib = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement | null;
                        if (sib) sib.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={cn(
                      "flex h-full w-full items-center justify-center text-muted-foreground",
                      patientPhoto && "hidden"
                    )}
                  >
                    <User className="h-10 w-10" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  {patientName && (
                    <p className="font-semibold">{patientName}</p>
                  )}
                  <InfoRow icon={Hash} label={t.app.report.patient.code} value={r.header.patientCode} />
                  {r.header.patientAge != null && (
                    <InfoRow icon={Calendar} label={t.app.report.patient.age} value={`${r.header.patientAge} ${isFr ? "ans" : "years"}`} />
                  )}
                  {r.header.patientSex && (
                    <InfoRow
                      label={t.app.report.patient.sex}
                      value={t.app.sex[r.header.patientSex as keyof typeof t.app.sex] ?? r.header.patientSex}
                    />
                  )}
                  <InfoRow
                    icon={Calendar}
                    label={t.app.report.patient.evaluationDate}
                    value={formatDate(r.header.evaluationDate)}
                  />
                </div>
              </div>
            </div>

            {/* Doctor / clinician info */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.app.report.sections.doctorInfo}
                </h3>
              </div>
              <div className="space-y-1.5">
                {doctorName && (
                  <p className="font-semibold">{doctorName}</p>
                )}
                <InfoRow label="AutiVision" value={isFr ? "Aide à la décision clinique" : "Clinical decision support"} />
                {mode === "questionnaire" ? (
                  <InfoRow label={isFr ? "Outil" : "Tool"} value="Questionnaire AQ-10" />
                ) : (
                  <InfoRow label={isFr ? "Moteur IA" : "AI Engine"} value={isFr ? "Analyse IA" : "AI Screening Engine"} />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk summary banner */}
      <div className={cn("rounded-xl border-2 p-6", bannerClass)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-display text-lg font-bold">{t.app.report.sections.summary}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display text-5xl font-extrabold">
                {r.summary.combinedScore != null
                  ? `${(r.summary.combinedScore * 100).toFixed(1)}%`
                  : "—"}
              </span>
              <RiskBadge risk={r.summary.riskTier as any} />
            </div>
            <p className="text-sm leading-relaxed opacity-90">{r.summary.text}</p>
          </div>
        </div>
      </div>

      {/* Interpretation */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">{t.app.report.sections.interpretation}</h2>
          </div>
          <p className="font-semibold">{r.interpretation.headline}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{r.interpretation.body}</p>
        </CardContent>
      </Card>

      {/* Technical findings */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">{t.app.report.sections.technical}</h2>
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            {r.technicalFindings.faceScore != null && (
              <Tech label={t.app.report.tech.face} value={pct(r.technicalFindings.faceScore)} />
            )}
            {r.technicalFindings.faceConfidence != null && (
              <Tech label={t.app.report.tech.faceConfidence} value={pct(r.technicalFindings.faceConfidence)} />
            )}
            {r.technicalFindings.facePrediction && (
              <Tech label={t.app.report.tech.facePrediction} value={r.technicalFindings.facePrediction} />
            )}
            <Tech label={t.app.report.tech.threshold} value={r.technicalFindings.threshold.toString()} />
            {r.technicalFindings.questionnaireScore != null && (
              <>
                <Tech
                  label={t.app.report.tech.questionnaire}
                  value={pct(r.technicalFindings.questionnaireScore)}
                />
                <Tech
                  label={t.app.report.tech.questionnaireRaw}
                  value={
                    r.technicalFindings.questionnaireRaw != null
                      ? `${r.technicalFindings.questionnaireRaw}/10`
                      : t.app.report.tech.none
                  }
                />
              </>
            )}
            {r.technicalFindings.fusedScore != null && (
              <Tech label={t.app.report.tech.fused} value={pct(r.technicalFindings.fusedScore)} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-display text-base font-semibold">{t.app.report.sections.recommendation}</h2>
          <p className="text-sm leading-relaxed">{r.recommendation.text}</p>
          {r.recommendation.followUp.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.app.report.followUp}
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {r.recommendation.followUp.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="border-border/50 bg-secondary/20">
        <CardContent className="p-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.app.report.sections.disclaimer}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{r.disclaimer.text}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Tech({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/40 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-medium">{value}</p>
    </div>
  );
}

function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(Number(v) * 100).toFixed(1)}%`;
}
