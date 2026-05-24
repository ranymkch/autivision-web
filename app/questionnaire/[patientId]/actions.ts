"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSessionWithRole } from "@/lib/supabase/session";
import { can } from "@/lib/rbac";
import { scoreAQ10 } from "@/services/questionnaireScoring";
import { fuse, tierFor as tierForFusion } from "@/services/fusionScoring";
import { generateReport } from "@/services/reportGenerator";
import { upsertReport } from "@/services/reportsRepository";
import type { AQ10Answers } from "@/types/questionnaire";
import type { ResultMode, RisqueEnum } from "@/types/database";
import type { ReportType } from "@/types/report";

// ─── submitAQ10 ───────────────────────────────────────────────────────────────
// Always saves as result_mode = "questionnaire".
// Never auto-computes combined — that requires an explicit computeCombinedResult call.

const submitSchema = z.object({
  patientId: z.string().uuid(),
  evaluationId: z.string().uuid().nullable().optional(),
  answers: z.record(z.enum(["DA", "SA", "SD", "DD"])),
});

export interface SubmitAQResult {
  ok: boolean;
  evaluationId?: string;
  questionnaireScore?: number;
  rawScore?: number;
  thresholdMet?: boolean;
  tier?: RisqueEnum;
  /** AI score from an existing evaluation (if evaluationId was provided). */
  aiScore?: number | null;
  error?: string;
}

export async function submitAQ10(input: unknown): Promise<SubmitAQResult> {
  const { user, role, supabase } = await getSessionWithRole();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (!can(role, "questionnaire:run")) return { ok: false, error: "Not authorised." };

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  let evaluationId = parsed.data.evaluationId ?? null;
  let aiScore: number | null = null;

  if (evaluationId) {
    // Load existing evaluation to retrieve the AI score (for the UI "combined" button).
    const { data: ev, error } = await supabase
      .from("evaluations")
      .select("id, score_image, score_questionnaire")
      .eq("id", evaluationId)
      .single();
    if (error || !ev) return { ok: false, error: "Evaluation not found." };
    aiScore = (ev as any).score_image == null ? null : Number((ev as any).score_image);

    // If this evaluation already had questionnaire answers, the new submission
    // makes any existing questionnaire and combined reports stale — delete them.
    if ((ev as any).score_questionnaire != null) {
      await supabase
        .from("reports")
        .delete()
        .eq("evaluation_id", evaluationId)
        .in("report_type", ["questionnaire", "combined"]);
    }
  } else {
    // Questionnaire-only: create a fresh evaluation.
    const { data: created, error } = await supabase
      .from("evaluations")
      .insert({
        patient_id: parsed.data.patientId,
        owner_id: user.id,
        statut: "TERMINEE",
      })
      .select("id")
      .single();
    if (error || !created) {
      return { ok: false, error: error?.message ?? "Could not create evaluation" };
    }
    evaluationId = (created as any).id as string;
  }

  const aq = scoreAQ10(parsed.data.answers as AQ10Answers);
  const tier = tierForFusion(aq.normalised);

  // Always questionnaire-only: do NOT overwrite score_global with combined.
  // score_global = questionnaire score when result_mode = "questionnaire".
  await supabase.from("questionnaires").upsert(
    {
      evaluation_id: evaluationId,
      type_questionnaire: "AQ-10",
      reponses: parsed.data.answers as any,
      score: aq.normalised,
    },
    { onConflict: "evaluation_id" }
  );

  await supabase
    .from("evaluations")
    .update({
      score_questionnaire: aq.normalised,
      score_global: aq.normalised,
      niveau_risque: tier,
      result_mode: "questionnaire",
    })
    .eq("id", evaluationId);

  await supabase.from("history").insert({
    patient_id: parsed.data.patientId,
    evaluation_id: evaluationId,
    actor_id: user.id,
    action: "AQ10_SUBMITTED",
    details: {
      rawScore: aq.rawScore,
      score: aq.normalised,
      tier,
      result_mode: "questionnaire",
    },
  });

  revalidatePath("/app/dashboard");
  revalidatePath(`/app/patients/${parsed.data.patientId}`);

  return {
    ok: true,
    evaluationId,
    questionnaireScore: aq.normalised,
    rawScore: aq.rawScore,
    thresholdMet: aq.thresholdMet,
    tier,
    aiScore,
  };
}

// ─── computeCombinedResult ────────────────────────────────────────────────────
// Explicitly triggered by the doctor. Reads stored AI + questionnaire scores,
// computes the weighted combined result, and persists it.
// Never overwrites score_image or score_questionnaire.

export interface ComputeCombinedResult {
  ok: boolean;
  combinedScore?: number;
  tier?: RisqueEnum;
  aiScore?: number;
  questionnaireScore?: number;
  error?: string;
}

export async function computeCombinedResult(evaluationId: string): Promise<ComputeCombinedResult> {
  const { user, role, supabase } = await getSessionWithRole();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (!can(role, "questionnaire:run")) return { ok: false, error: "Not authorised." };

  const { data: ev, error: evErr } = await supabase
    .from("evaluations")
    .select("id, patient_id, score_image, score_questionnaire")
    .eq("id", evaluationId)
    .single();

  if (evErr || !ev) return { ok: false, error: "Evaluation not found." };
  const row = ev as any;

  const aiScore: number | null = row.score_image == null ? null : Number(row.score_image);
  const qScore: number | null = row.score_questionnaire == null ? null : Number(row.score_questionnaire);

  if (aiScore == null || qScore == null) {
    return { ok: false, error: "Both AI and questionnaire scores are required for combined result." };
  }

  const fused = fuse({ faceRisk: aiScore, normalisedAQ: qScore });
  const combined = fused.combinedRisk;
  const tier = fused.tier;

  await supabase
    .from("evaluations")
    .update({
      score_global: combined,
      niveau_risque: tier,
      result_mode: "combined",
    })
    .eq("id", evaluationId);

  await supabase.from("history").insert({
    patient_id: row.patient_id,
    evaluation_id: evaluationId,
    actor_id: user.id,
    action: "COMBINED_COMPUTED",
    details: {
      aiScore,
      questionnaireScore: qScore,
      score: combined,
      tier,
      result_mode: "combined",
    },
  });

  revalidatePath("/app/dashboard");

  return { ok: true, combinedScore: combined, tier, aiScore, questionnaireScore: qScore };
}

// ─── generateResultReport ─────────────────────────────────────────────────────
// Generates and persists a report for a given evaluation.
// `forceType` lets the caller explicitly choose "questionnaire" or "combined",
// regardless of what result_mode is currently stored on the evaluation.

export interface GenerateReportResult {
  ok: boolean;
  reportId?: string;
  error?: string;
}

export async function generateResultReport(
  evaluationId: string,
  locale: "en" | "fr",
  forceType?: "questionnaire" | "combined"
): Promise<GenerateReportResult> {
  const { user, role, supabase } = await getSessionWithRole();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (!can(role, "reports:generate")) return { ok: false, error: "Not authorised." };

  const { data: ev, error: evErr } = await supabase
    .from("evaluations")
    .select(`
      id, patient_id, created_at, niveau_risque, score_image, score_questionnaire, score_global,
      ml_prediction, ml_confidence, ml_model, result_mode,
      patients(code_anonymise, age, sexe),
      questionnaires(score, reponses)
    `)
    .eq("id", evaluationId)
    .single();

  if (evErr || !ev) return { ok: false, error: "Evaluation not found." };
  const row = ev as any;

  const aiScore = row.score_image == null ? null : Number(row.score_image);
  const qScore = row.score_questionnaire == null ? null : Number(row.score_questionnaire);

  // Determine report type: explicit override takes priority, then stored result_mode.
  const reportType: ReportType =
    forceType ??
    (row.result_mode === "combined" ? "combined" :
     row.result_mode === "questionnaire" ? "questionnaire" : "ai");

  // Validate that required scores exist for the chosen type.
  if (reportType === "combined" && (aiScore == null || qScore == null)) {
    return { ok: false, error: "Combined report requires both AI and questionnaire scores." };
  }
  if (reportType === "questionnaire" && qScore == null) {
    return { ok: false, error: "Questionnaire report requires a questionnaire score." };
  }

  const aqRaw = qScore != null ? Math.round(qScore * 10) : null;

  let finalScore: number;
  if (reportType === "combined") {
    finalScore = fuse({ faceRisk: aiScore!, normalisedAQ: qScore! }).combinedRisk;
  } else if (reportType === "questionnaire") {
    finalScore = qScore!;
  } else {
    finalScore = aiScore!;
  }

  const tier = (row.niveau_risque as RisqueEnum | null) ?? tierForFusion(finalScore);

  const report = generateReport({
    reportType,
    locale,
    evaluationDate: row.created_at,
    patient: {
      code: row.patients?.code_anonymise ?? "—",
      age: row.patients?.age ?? null,
      sex: row.patients?.sexe ?? null,
    },
    face: aiScore != null
      ? {
          risk: aiScore,
          rawConfidence: Number(row.ml_confidence ?? 0),
          prediction: (row.ml_prediction ?? "non_autistic") as "autistic" | "non_autistic",
          modelName: "AI Screening Engine",
          threshold: 0.5,
        }
      : { risk: 0, rawConfidence: 0, prediction: "non_autistic", modelName: "AI Screening Engine", threshold: 0.5 },
    questionnaire:
      qScore != null && aqRaw != null
        ? { rawScore: aqRaw, normalised: qScore, thresholdMet: aqRaw >= 6 }
        : undefined,
    combinedScore: finalScore,
    tier,
  });

  const { id: reportId, error } = await upsertReport(supabase as any, evaluationId, reportType, report);
  if (error) return { ok: false, error };

  // Keep evaluations.result_mode in sync with the most advanced report type generated.
  if (reportType === "combined") {
    await supabase
      .from("evaluations")
      .update({ result_mode: "combined", score_global: finalScore, niveau_risque: tier })
      .eq("id", evaluationId);
  }

  await supabase.from("history").insert({
    evaluation_id: evaluationId,
    patient_id: row.patient_id,
    actor_id: user.id,
    action: "REPORT_GENERATED",
    details: { reportId, reportType, score: finalScore, tier, result_mode: reportType },
  });

  revalidatePath(`/report/${reportId}`);
  revalidatePath("/app/dashboard");
  revalidatePath("/app/reports");
  revalidatePath(`/app/patients/${row.patient_id}`);
  return { ok: true, reportId };
}

/** @deprecated Use generateResultReport directly. */
export const generateCombinedReport = generateResultReport;
