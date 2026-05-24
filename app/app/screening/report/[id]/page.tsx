import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Legacy URL: /app/screening/report/:evaluationId
 *
 * Forward to the canonical report page when one exists, otherwise back
 * to the screening form (so the user can complete the flow).
 */
export default async function LegacyScreeningReportRedirect({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: report } = await supabase
    .from("reports")
    .select("id, generated_at, report_type")
    .eq("evaluation_id", params.id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (report) {
    redirect(`/report/${(report as any).id}`);
  }

  const { data: ev } = await supabase
    .from("evaluations")
    .select("id, patient_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!ev) notFound();

  redirect(`/app/screening?patient=${(ev as any).patient_id}`);
}
