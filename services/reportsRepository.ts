/**
 * Reports persistence — single write/read surface for `public.reports`.
 *
 * The DB row stores the full structured ScreeningReport JSON in `content`.
 * One row per (evaluation_id, report_type) — both 'face' and 'combined'
 * may coexist for the same evaluation.
 *
 * Returns the persisted report id so callers can navigate to /report/:id.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScreeningReport, ReportType } from "@/types/report";

export async function upsertReport(
  supabase: SupabaseClient,
  evaluationId: string,
  reportType: ReportType,
  content: ScreeningReport
): Promise<{ id: string; error?: string }> {
  const { data, error } = await supabase
    .from("reports")
    .upsert(
      {
        evaluation_id: evaluationId,
        report_type: reportType,
        content: content as any,
        valide: false,
        format_document: "JSON",
      },
      { onConflict: "evaluation_id,report_type" }
    )
    .select("id")
    .single();

  if (error || !data) return { id: "", error: error?.message ?? "Insert failed" };
  return { id: (data as any).id as string };
}
