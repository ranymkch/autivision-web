"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSessionWithRole } from "@/lib/supabase/session";
import { can } from "@/lib/rbac";
import { combineScores, imageScore, tierFor, type MLPrediction } from "@/lib/ml/predict";
import { generateAnonymousCode } from "@/lib/utils";
import { generateReport } from "@/services/reportGenerator";
import { upsertReport } from "@/services/reportsRepository";

const saveSchema = z.object({
  patientId: z.string().uuid().nullable().optional(),
  newPatient: z
    .object({
      age: z.number().int().min(0).max(30).optional().nullable(),
      sexe: z.enum(["M", "F", "AUTRE"]),
      name: z.string().min(1),
      photoUrl: z.string().url().optional().nullable(),
    })
    .nullable()
    .optional(),
  imageStoragePath: z.string().min(1),
  imageSize: z.number().int().min(1),
  imageMime: z.string().min(1),
  updatePatientPhoto: z.boolean().optional(),
  ml: z.object({
    prediction: z.enum(["autistic", "non_autistic"]),
    asd_risk: z.number().min(0).max(1),
    asd_risk_pct: z.string(),
    threshold_used: z.number(),
    model: z.string(),
  }),
});

export interface SaveScreeningResult {
  ok: boolean;
  evaluationId?: string;
  error?: string;
}

export async function saveScreening(input: unknown): Promise<SaveScreeningResult> {
  const { user, role, supabase } = await getSessionWithRole();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (!can(role, "screening:run")) return { ok: false, error: "Not authorised." };

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const isRedo = !!parsed.data.patientId;
  let patientId = parsed.data.patientId ?? null;

  if (!patientId) {
    if (!parsed.data.newPatient) {
      return { ok: false, error: "Either patientId or newPatient must be provided." };
    }
    const code = generateAnonymousCode();
    const { data: pat, error: patErr } = await supabase
      .from("patients")
      .insert({
        owner_id: user.id,
        code_anonymise: code,
        age: parsed.data.newPatient.age,
        sexe: parsed.data.newPatient.sexe,
        name: parsed.data.newPatient.name ?? null,
        photo_url: parsed.data.newPatient.photoUrl ?? null,
      })
      .select("id")
      .single();
    if (patErr || !pat) return { ok: false, error: patErr?.message ?? "Patient insert failed" };
    patientId = (pat as any).id as string;
  }

  // Redo: purge all previous evaluations (cascades to reports, questionnaires,
  // facial_images rows) and remove the facial images from storage.
  if (isRedo) {
    const { data: oldEvals } = await supabase
      .from("evaluations")
      .select("id")
      .eq("patient_id", patientId);

    if (oldEvals && oldEvals.length > 0) {
      const evalIds = (oldEvals as any[]).map((e) => e.id);

      const { data: oldImages } = await supabase
        .from("facial_images")
        .select("storage_path")
        .in("evaluation_id", evalIds);

      // Delete evaluations — cascades to reports, questionnaires, facial_images
      await supabase.from("evaluations").delete().in("id", evalIds);

      // Remove storage objects (best-effort — don't fail the redo if this errors)
      if (oldImages && oldImages.length > 0) {
        const paths = (oldImages as any[]).map((fi) => fi.storage_path);
        await supabase.storage.from("facial-images").remove(paths);
      }

      // Clear the patient photo so the new screening image gets auto-assigned below
      await supabase.from("patients").update({ photo_url: null }).eq("id", patientId);
    }
  }

  const ml = parsed.data.ml as MLPrediction;
  const imgScore = imageScore(ml);
  const tier = tierFor(imgScore);

  const { data: ev, error: evErr } = await supabase
    .from("evaluations")
    .insert({
      patient_id: patientId,
      owner_id: user.id,
      statut: "TERMINEE",
      niveau_risque: tier,
      score_global: imgScore,
      score_image: imgScore,
      score_questionnaire: null,
      ml_prediction: ml.prediction,
      ml_confidence: ml.asd_risk,
      ml_model: ml.model,
      result_mode: "ai",
    })
    .select("id")
    .single();

  if (evErr || !ev) return { ok: false, error: evErr?.message ?? "Insert failed" };
  const evaluationId = (ev as any).id as string;

  // Auto-assign the screening image as patient profile photo if none exists.
  // Upload a copy to patient-photos (the publicly accessible bucket) so the
  // profile photo URL actually renders in the browser.
  if (patientId) {
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("photo_url")
      .eq("id", patientId)
      .single();
    if (!existingPatient?.photo_url || parsed.data.updatePatientPhoto) {
      // Download the uploaded image and re-upload to patient-photos
      const { data: fileData } = await supabase.storage
        .from("facial-images")
        .download(parsed.data.imageStoragePath);
      if (fileData) {
        const ext = parsed.data.imageStoragePath.split(".").pop() || "jpg";
        const photoPath = `${user.id}/${Date.now()}.${ext}`;
        const { error: copyErr } = await supabase.storage
          .from("patient-photos")
          .upload(photoPath, fileData, { contentType: parsed.data.imageMime, upsert: false });
        if (!copyErr) {
          const { data: urlData } = supabase.storage
            .from("patient-photos")
            .getPublicUrl(photoPath);
          if (urlData?.publicUrl) {
            await supabase
              .from("patients")
              .update({ photo_url: urlData.publicUrl })
              .eq("id", patientId);
          }
        }
      }
    }
  }

  await Promise.all([
    supabase.from("facial_images").insert({
      evaluation_id: evaluationId,
      storage_path: parsed.data.imageStoragePath,
      taille_octets: parsed.data.imageSize,
      mime_type: parsed.data.imageMime,
    }),
    supabase.from("history").insert({
      patient_id: patientId,
      evaluation_id: evaluationId,
      actor_id: user.id,
      action: "SCREENING_COMPLETED",
      details: { tier, score: imgScore, prediction: ml.prediction, result_mode: "ai" },
    }),
  ]);

  void combineScores;

  revalidatePath("/app/dashboard");
  revalidatePath("/app/patients");
  revalidatePath(`/app/patients/${patientId}`);
  revalidatePath("/app/reports");
  revalidatePath(`/app/screening/result/${evaluationId}`);

  return { ok: true, evaluationId };
}

export interface GenerateFaceReportResult {
  ok: boolean;
  reportId?: string;
  error?: string;
}

export async function generateFaceReport(
  evaluationId: string,
  locale: "en" | "fr"
): Promise<GenerateFaceReportResult> {
  const { user, role, supabase } = await getSessionWithRole();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (!can(role, "reports:generate")) return { ok: false, error: "Not authorised." };

  const { data: ev, error: evErr } = await supabase
    .from("evaluations")
    .select(`
      id, patient_id, created_at, niveau_risque, score_image,
      ml_prediction, ml_confidence, ml_model,
      patients(code_anonymise, age, sexe)
    `)
    .eq("id", evaluationId)
    .single();

  if (evErr || !ev) return { ok: false, error: evErr?.message ?? "Evaluation not found" };
  const row = ev as any;

  if (row.score_image == null || row.ml_prediction == null) {
    return { ok: false, error: "Evaluation is missing image-screening data." };
  }

  const report = generateReport({
    reportType: "ai",
    locale,
    evaluationDate: row.created_at,
    patient: {
      code: row.patients?.code_anonymise ?? "—",
      age: row.patients?.age ?? null,
      sex: row.patients?.sexe ?? null,
    },
    face: {
      risk: Number(row.score_image),
      rawConfidence: Number(row.ml_confidence ?? 0),
      prediction: row.ml_prediction as "autistic" | "non_autistic",
      modelName: "AI Screening Engine",
      threshold: 0.5,
    },
    tier: (row.niveau_risque ?? tierFor(Number(row.score_image))) as any,
  });

  const { id: reportId, error } = await upsertReport(supabase as any, evaluationId, "ai", report);
  if (error) return { ok: false, error };

  await supabase.from("history").insert({
    evaluation_id: evaluationId,
    patient_id: row.patient_id,
    actor_id: user.id,
    action: "FACE_REPORT_GENERATED",
    details: { reportId, result_mode: "ai" },
  });

  revalidatePath(`/report/${reportId}`);
  revalidatePath("/app/dashboard");
  revalidatePath("/app/reports");
  return { ok: true, reportId };
}
