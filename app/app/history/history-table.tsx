"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RiskBadge } from "@/components/app/risk-badge";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

const ACTION_LABELS_EN: Record<string, string> = {
  PATIENT_CREATED:       "Patient created",
  SCREENING_COMPLETED:   "AI Analysis",
  FACE_REPORT_GENERATED: "AI Report",
  AQ10_SUBMITTED:        "Questionnaire",
  COMBINED_COMPUTED:     "Combined result",
  REPORT_GENERATED:      "Report generated",
  PATIENT_UPDATED:       "Patient updated",
};

const ACTION_LABELS_FR: Record<string, string> = {
  PATIENT_CREATED:       "Patient créé",
  SCREENING_COMPLETED:   "Analyse IA",
  FACE_REPORT_GENERATED: "Rapport IA",
  AQ10_SUBMITTED:        "Questionnaire",
  COMBINED_COMPUTED:     "Résultat combiné",
  REPORT_GENERATED:      "Rapport généré",
  PATIENT_UPDATED:       "Patient modifié",
};

type HistoryRow = {
  id: string;
  action: string;
  details: Record<string, any> | null;
  created_at: string;
  patients: { code_anonymise: string } | null;
  evaluations: { niveau_risque: string | null; result_mode: string | null } | null;
  profiles?: { prenom: string | null; nom: string | null; full_name: string | null } | null;
};

export function HistoryTable({ rows, showDoctor = false }: { rows: HistoryRow[]; showDoctor?: boolean }) {
  const { t, locale } = useI18n();
  const isFr = locale === "fr";
  const ACTION_LABELS = isFr ? ACTION_LABELS_FR : ACTION_LABELS_EN;
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? rows.filter((h) => {
        const q = query.trim().toLowerCase();
        const code = h.patients?.code_anonymise?.toLowerCase() ?? "";
        const label = (ACTION_LABELS[h.action] ?? h.action).toLowerCase();
        const pf = h.profiles;
        const doctor = (pf?.full_name ?? (pf?.prenom && pf?.nom ? `${pf.prenom} ${pf.nom}` : null) ?? "").toLowerCase();
        return code.includes(q) || label.includes(q) || doctor.includes(q);
      })
    : rows;

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          type="search"
          placeholder={
            showDoctor
              ? (isFr ? "Rechercher par code patient, médecin ou événement…" : "Search by patient code, doctor or event…")
              : (isFr ? "Rechercher par code patient ou événement…" : "Search by patient code or event…")
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">{t.app.history.table.date}</th>
                <th className="px-5 py-3 font-medium">{t.app.history.table.action}</th>
                <th className="px-5 py-3 font-medium">{t.app.history.table.patient}</th>
                {showDoctor && (
                  <th className="px-5 py-3 font-medium">{isFr ? "Médecin" : "Doctor"}</th>
                )}
                <th className="px-5 py-3 font-medium">{t.app.history.table.mode}</th>
                <th className="px-5 py-3 font-medium">{t.app.history.table.score}</th>
                <th className="px-5 py-3 font-medium">{t.app.history.table.risk}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => {
                const details = (h.details ?? {}) as Record<string, any>;
                const score: number | null = details.score ?? null;
                const resultMode: string | null =
                  details.result_mode ?? h.evaluations?.result_mode ?? null;
                const risk = (h.evaluations?.niveau_risque ?? null) as import("@/types/database").RisqueEnum | null;
                const patientCode = h.patients?.code_anonymise ?? "—";
                const label = ACTION_LABELS[h.action] ?? h.action;
                const pf = h.profiles;
                const doctorName = pf?.full_name ?? (pf?.prenom && pf?.nom ? `${pf.prenom} ${pf.nom}` : null) ?? "—";

                return (
                  <tr key={h.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(h.created_at)}
                    </td>
                    <td className="px-5 py-3 font-medium">{label}</td>
                    <td className="px-5 py-3 font-mono text-xs">{patientCode}</td>
                    {showDoctor && (
                      <td className="px-5 py-3 text-sm">{doctorName}</td>
                    )}
                    <td className="px-5 py-3">
                      {resultMode ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">
                          {t.app.resultMode[resultMode as keyof typeof t.app.resultMode] ?? resultMode}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {score != null ? `${(score * 100).toFixed(1)} %` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <RiskBadge risk={risk} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {query.trim()
            ? (isFr ? "Aucun résultat pour cette recherche." : "No entries match your search.")
            : t.app.history.empty}
        </p>
      )}
    </>
  );
}
