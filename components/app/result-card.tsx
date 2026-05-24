"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, Brain, ClipboardList, FileDown, FileText, ListChecks } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreGauge } from "@/components/app/score-gauge";
import { RiskBadge } from "@/components/app/risk-badge";
import { useI18n } from "@/lib/i18n/provider";
import type { ResultMode, RisqueEnum } from "@/types/database";

/**
 * Unified clinical-result block.
 *
 * Single source of truth for the post-evaluation summary shown across
 * screening, questionnaire, and report pages. One container — header,
 * gauge, scores breakdown, interpretation, recommendation, and actions.
 */

export interface ResultCardProps {
  mode: ResultMode;
  /** Final score displayed in the gauge — combined for "combined", AI for "ai", questionnaire for "questionnaire". */
  mainScore: number;
  tier: RisqueEnum;
  aiScore?: number | null;
  questionnaireScore?: number | null;
  questionnaireRaw?: number | null;
  interpretation?: string;
  recommendation?: string;
  actions?: ResultAction[];
  /** Patient context shown in header (optional). */
  patientLabel?: string;
  evaluationDate?: string;
}

export interface ResultAction {
  label: string;
  icon?: "download" | "open" | "questionnaire" | "dashboard";
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
  disabled?: boolean;
  /** Open in a new tab. */
  external?: boolean;
  /** Forwarded to the underlying anchor for PDF downloads. */
  download?: boolean | string;
}

const ACTION_ICONS: Record<NonNullable<ResultAction["icon"]>, ReactNode> = {
  download: <FileDown />,
  open: <FileText />,
  questionnaire: <ClipboardList />,
  dashboard: <ListChecks />,
};

export function ResultCard(props: ResultCardProps) {
  const { locale } = useI18n();
  const isFr = locale === "fr";

  const modeLabel: Record<ResultMode, string> = {
    ai: isFr ? "Évaluation IA" : "AI evaluation",
    questionnaire: isFr ? "Questionnaire AQ-10" : "AQ-10 questionnaire",
    combined: isFr ? "Évaluation combinée" : "Combined evaluation",
  };

  const modeIcon: Record<ResultMode, ReactNode> = {
    ai: <Brain className="h-4 w-4" />,
    questionnaire: <ClipboardList className="h-4 w-4" />,
    combined: <Activity className="h-4 w-4" />,
  };

  const tierLabel: Record<RisqueEnum, string> = isFr
    ? { FAIBLE: "Risque faible", MODERE: "Risque modéré", ELEVE: "Risque élevé" }
    : { FAIBLE: "Low risk", MODERE: "Moderate risk", ELEVE: "High risk" };

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary/5 px-6 py-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            {modeIcon[props.mode]}
            {modeLabel[props.mode]}
          </div>
          {(props.patientLabel || props.evaluationDate) && (
            <p className="text-xs text-muted-foreground">
              {[props.patientLabel, props.evaluationDate].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="grid gap-8 p-6 md:grid-cols-[260px_1fr] md:p-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <ScoreGauge score={props.mainScore} tier={props.tier} size={220} />
            <RiskBadge risk={props.tier} />
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {tierLabel[props.tier]}
            </p>
          </div>

          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {props.aiScore != null && (
                <Metric
                  label={isFr ? "Score IA" : "AI score"}
                  value={pct(props.aiScore)}
                  weight={props.mode === "combined" ? "60%" : undefined}
                />
              )}
              {props.questionnaireScore != null && (
                <Metric
                  label={isFr ? "Score questionnaire" : "Questionnaire score"}
                  value={pct(props.questionnaireScore)}
                  weight={props.mode === "combined" ? "40%" : undefined}
                  hint={
                    props.questionnaireRaw != null
                      ? `${props.questionnaireRaw}/10 ${isFr ? "brut" : "raw"}`
                      : undefined
                  }
                />
              )}
              {props.mode === "combined" && (
                <Metric
                  label={isFr ? "Score combiné" : "Combined score"}
                  value={pct(props.mainScore)}
                  highlight
                />
              )}
            </div>

            {props.interpretation && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isFr ? "Interprétation clinique" : "Clinical interpretation"}
                </p>
                <p className="text-sm leading-relaxed">{props.interpretation}</p>
              </div>
            )}

            {props.recommendation && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isFr ? "Recommandation" : "Recommendation"}
                </p>
                <p className="text-sm leading-relaxed">{props.recommendation}</p>
              </div>
            )}

            {props.actions && props.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {props.actions.map((a, i) => (
                  <ActionButton key={i} action={a} icons={ACTION_ICONS} />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionButton({
  action,
  icons,
}: {
  action: ResultAction;
  icons: Record<NonNullable<ResultAction["icon"]>, ReactNode>;
}) {
  const content = (
    <>
      {action.icon ? icons[action.icon] : null}
      {action.label}
    </>
  );
  if (action.href) {
    return (
      <Button asChild variant={action.variant ?? "default"} disabled={action.disabled}>
        <Link
          href={action.href}
          target={action.external ? "_blank" : undefined}
          rel={action.external ? "noreferrer" : undefined}
          {...(action.download ? { download: action.download === true ? "" : action.download } : {})}
        >
          {content}
        </Link>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant={action.variant ?? "default"}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {content}
    </Button>
  );
}

function Metric({
  label,
  value,
  hint,
  weight,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  weight?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border px-4 py-3 " +
        (highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card/40")
      }
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {weight && (
          <span className="text-[10px] font-mono text-muted-foreground">{weight}</span>
        )}
      </div>
      <p className="mt-1 font-mono text-base font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(Number(v) * 100).toFixed(1)}%`;
}
