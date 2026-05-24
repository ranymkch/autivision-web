/**
 * AQ-10 scoring service.
 *
 * Single source of truth for converting raw AQ-10 answers into the
 * standard 0..10 score and the normalised [0, 1] value used for fusion.
 */

import type { AQ10Answers, AQ10Result, Likert } from "@/types/questionnaire";
import { AQ10_ITEMS } from "@/lib/data/aq10";

const AGREE_OPTIONS: Likert[] = ["DA", "SA"];

export function scoreAQ10(answers: AQ10Answers): AQ10Result {
  const itemsScored: Record<string, 0 | 1> = {};
  let raw = 0;

  for (const item of AQ10_ITEMS) {
    const a = answers[item.id];
    let scored: 0 | 1 = 0;
    if (a) {
      const agreed = AGREE_OPTIONS.includes(a);
      const counts = item.scoresOnAgree ? agreed : !agreed;
      scored = counts ? 1 : 0;
    }
    itemsScored[item.id] = scored;
    raw += scored;
  }

  return {
    rawScore: raw,
    normalised: raw / AQ10_ITEMS.length,
    itemsScored,
    thresholdMet: raw >= 6,
  };
}

export function isComplete(answers: AQ10Answers): boolean {
  return AQ10_ITEMS.every((q) => !!answers[q.id]);
}
