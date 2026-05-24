/**
 * Wrapper for the FastAPI ASD Detection backend.
 * Endpoint contract (see backend/main.py):
 *   POST /predict   multipart/form-data { file: image }
 *   Response 200 :  { prediction, asd_risk, asd_risk_pct, threshold_used, model }
 *   Response 503 :  { detail }   when model is unavailable
 *   Response 400 :  { detail }   for unsupported MIME / empty file
 *   Response 413 :  { detail }   when file > 10 MB
 */

import type { RisqueEnum } from "@/types/database";

export interface MLPrediction {
  prediction: "autistic" | "non_autistic";
  asd_risk: number;
  asd_risk_pct: string;
  threshold_used: number;
  model: string;
}

export async function predictImage(file: Blob, filename: string): Promise<MLPrediction> {
  const url = process.env.ML_API_URL ?? "http://localhost:8000";
  const form = new FormData();
  form.append("file", file, filename);

  const res = await fetch(`${url}/predict`, { method: "POST", body: form });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // ignore — keep statusText
    }
    throw new Error(`ML API error (${res.status}): ${detail}`);
  }
  return (await res.json()) as MLPrediction;
}

export interface MLHealth {
  status: "ok" | "degraded";
  model_loaded: boolean;
  model_path: string;
  load_error: string | null;
}

export async function healthCheck(): Promise<MLHealth | null> {
  try {
    const url = process.env.ML_API_URL ?? "http://localhost:8000";
    const res = await fetch(`${url}/health`, { cache: "no-store" });
    if (!res.ok && res.status !== 503) return null;
    return (await res.json()) as MLHealth;
  } catch {
    return null;
  }
}

/** P(autistic) regardless of which class the model picked. */
export function imageScore(p: MLPrediction): number {
  return p.asd_risk;
}

/**
 * Image-only screening: combined === image score (kept for API stability
 * with earlier code paths that blended in a questionnaire score).
 */
export function combineScores(imgScore: number, qScore: number): number {
  if (qScore === 0) return imgScore;
  return Math.min(1, Math.max(0, 0.6 * imgScore + 0.4 * qScore));
}

export function tierFor(combined: number): RisqueEnum {
  if (combined >= 0.65) return "ELEVE";
  if (combined >= 0.35) return "MODERE";
  return "FAIBLE";
}
