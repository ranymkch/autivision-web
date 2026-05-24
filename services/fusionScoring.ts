/**
 * Score fusion: combines the face-image risk with the AQ-10 risk into a
 * single combined risk in [0, 1] and a clinical risk tier.
 *
 *   combinedRisk = 0.6 · faceRisk + 0.4 · normalisedAQ
 *
 * `faceRisk` is **always P(autistic)**, regardless of which class the model
 * picked. The canonical conversion lives in `lib/ml/predict.ts::imageScore()`
 * — every caller in this project must use that function so the fusion input
 * stays consistent. Do not reimplement the conversion locally.
 */

import type { RisqueEnum } from "@/types/database";

export const FUSION_WEIGHTS = { face: 0.6, questionnaire: 0.4 } as const;

export interface FusionInput {
  /** P(autistic) — produced by `imageScore(prediction)`. Range [0, 1]. */
  faceRisk: number;
  /** Normalised AQ-10 score = rawScore / 10. Range [0, 1]. */
  normalisedAQ: number;
}

export interface FusionResult {
  combinedRisk: number;     // [0, 1]
  tier: RisqueEnum;
  weights: typeof FUSION_WEIGHTS;
}

export function fuse({ faceRisk, normalisedAQ }: FusionInput): FusionResult {
  const a = clamp01(faceRisk);
  const b = clamp01(normalisedAQ);
  const combined = clamp01(FUSION_WEIGHTS.face * a + FUSION_WEIGHTS.questionnaire * b);
  return { combinedRisk: combined, tier: tierFor(combined), weights: FUSION_WEIGHTS };
}

export function tierFor(score: number): RisqueEnum {
  if (score >= 0.65) return "ELEVE";
  if (score >= 0.40) return "MODERE";
  return "FAIBLE";
}

/**
 * Pick the canonical result mode for an evaluation given which inputs are
 * present. Mirrors the rule:
 *   only ai           → "ai"
 *   only questionnaire → "questionnaire"
 *   both              → "combined"
 */
export function resolveResultMode(args: {
  aiScore: number | null | undefined;
  questionnaireScore: number | null | undefined;
}): "ai" | "questionnaire" | "combined" | null {
  const hasAi = args.aiScore != null;
  const hasQ = args.questionnaireScore != null;
  if (hasAi && hasQ) return "combined";
  if (hasAi) return "ai";
  if (hasQ) return "questionnaire";
  return null;
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.min(1, Math.max(0, v));
}
