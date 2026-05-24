/**
 * AQ-10 (Autism Spectrum Quotient — 10-item adult/adolescent short form).
 *
 * Each item has a Likert response. Per the published scoring rule, an item
 * scores 1 point when the respondent endorses the autism-consistent option
 * (either Agree/Definitely Agree OR Disagree/Definitely Disagree, depending
 * on the item). Total raw score range: 0..10. A score ≥ 6 is the commonly
 * referenced screening threshold.
 *
 * For fusion with the face-image risk we expose a normalised version in
 * [0, 1]: `normalisedAQ = aq10Score / 10`.
 */

export type Likert = "DA" | "SA" | "SD" | "DD"; // Definitely Agree / Slightly Agree / Slightly Disagree / Definitely Disagree

export interface AQ10Item {
  id: string;                              // "q1"..."q10"
  prompt_en: string;
  prompt_fr: string;
  /** When endorsing "agree" (DA or SA) yields the autism-consistent direction. */
  scoresOnAgree: boolean;
}

export type AQ10Answers = Record<string, Likert>;

export interface AQ10Result {
  rawScore: number;        // 0..10 — the standard AQ-10 total
  normalised: number;      // rawScore / 10 — [0, 1]
  itemsScored: Record<string, 0 | 1>;
  thresholdMet: boolean;   // rawScore >= 6
}
