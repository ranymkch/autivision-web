"use client";

import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { RisqueEnum } from "@/types/database";

const styles: Record<RisqueEnum, string> = {
  FAIBLE: "bg-risk-low/15 text-risk-low",
  MODERE: "bg-risk-mid/15 text-risk-mid",
  ELEVE:  "bg-risk-high/15 text-risk-high",
};

const dot: Record<RisqueEnum, string> = {
  FAIBLE: "bg-risk-low",
  MODERE: "bg-risk-mid",
  ELEVE:  "bg-risk-high",
};

export function RiskBadge({ risk }: { risk: RisqueEnum | null }) {
  const { t } = useI18n();
  if (!risk) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
        —
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", styles[risk])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[risk])} />
      {t.app.risk[risk]}
    </span>
  );
}
