/**
 * Structured screening report (face-only or combined).
 *
 * The shape is the contract between `services/reportGenerator.ts` and the
 * UI renderer / PDF route. Keep it serialisable JSON — the whole object
 * is persisted in `reports.content`.
 */

import type { RisqueEnum } from "./database";

/**
 * `ai` and `face` are equivalent (`face` is the legacy value kept for
 * backwards compatibility with rows persisted before result_mode existed).
 * New writes always use `ai`.
 */
export type ReportType = "ai" | "face" | "questionnaire" | "combined";

export interface ReportHeader {
  patientCode: string;
  patientAge: number | null;
  patientSex: "M" | "F" | "AUTRE" | null;
  evaluationDate: string;        // ISO
  reportType: ReportType;
  modelName: string;
  locale: "en" | "fr";
}

export interface ReportSummary {
  text: string;                  // 1–3 sentences
  riskTier: RisqueEnum;
  combinedScore: number;         // [0, 1] — image score for "face", fused for "combined"
}

export interface ReportInterpretation {
  headline: string;              // short one-liner
  body: string;                  // 2–4 sentences, clinical wording
}

export interface ReportTechnicalFindings {
  faceScore: number | null;          // [0, 1] P(autistic)
  faceConfidence: number | null;     // raw sigmoid from model
  facePrediction: "autistic" | "non_autistic" | null;
  questionnaireScore: number | null; // normalised AQ-10, [0, 1]
  questionnaireRaw: number | null;   // raw AQ-10 score, [0, 10]
  fusedScore: number | null;         // 0.6 face + 0.4 questionnaire (combined only)
  threshold: number;
}

export interface ReportRecommendation {
  text: string;
  followUp: string[];            // bullet list
}

export interface ReportDisclaimer {
  text: string;                  // standard legal/ethical disclaimer
}

export interface ScreeningReport {
  schemaVersion: 1;
  header: ReportHeader;
  summary: ReportSummary;
  interpretation: ReportInterpretation;
  technicalFindings: ReportTechnicalFindings;
  recommendation: ReportRecommendation;
  disclaimer: ReportDisclaimer;
}
