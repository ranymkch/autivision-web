/**
 * Deterministic structured-report generator.
 *
 * Contract: `services/reportGenerator.ts` is the *only* place where
 * existing screening results are turned into clinical narrative text.
 * The function is pure and deterministic — same input ⇒ same JSON.
 *
 * Note on "LLM": this generator does NOT perform classification and does
 * NOT call an external LLM. It is intentionally deterministic so reports
 * are reproducible for the dissertation defence. The function signature
 * is shaped so an LLM call (e.g. structured-output mode at temperature 0)
 * can be swapped in later without touching any caller.
 *
 * Inputs are restricted to existing screening results — never re-run
 * inference here.
 */

import type {
  ReportType,
  ScreeningReport,
} from "@/types/report";
import type { RisqueEnum } from "@/types/database";

export interface PatientInfo {
  code: string;
  age: number | null;
  sex: "M" | "F" | "AUTRE" | null;
}

export interface FaceResult {
  /** P(autistic) — output of `imageScore()`. [0,1] */
  risk: number;
  /** Raw model sigmoid output. [0,1] */
  rawConfidence: number;
  prediction: "autistic" | "non_autistic";
  modelName: string;
  threshold: number;
}

export interface QuestionnaireResult {
  /** Standard AQ-10 raw 0..10 */
  rawScore: number;
  /** Normalised score = rawScore / 10. [0,1] */
  normalised: number;
  thresholdMet: boolean;
}

export interface ReportInput {
  reportType: ReportType;
  patient: PatientInfo;
  evaluationDate: string;        // ISO
  locale: "en" | "fr";
  face: FaceResult;
  /** Required when reportType === "combined". */
  questionnaire?: QuestionnaireResult;
  /** Combined fused score [0,1] — required for "combined". Otherwise = face.risk. */
  combinedScore?: number;
  /** Combined tier — required for "combined". Otherwise derived from face risk. */
  tier: RisqueEnum;
}

/**
 * The single entry point. Returns a fully populated ScreeningReport JSON.
 */
export function generateReport(input: ReportInput): ScreeningReport {
  const finalScore =
    input.reportType === "combined"
      ? (input.combinedScore ?? input.face.risk)
      : input.face.risk;

  return {
    schemaVersion: 1,
    header: {
      patientCode: input.patient.code,
      patientAge: input.patient.age,
      patientSex: input.patient.sex,
      evaluationDate: input.evaluationDate,
      reportType: input.reportType,
      modelName: input.face.modelName,
      locale: input.locale,
    },
    summary: buildSummary(input, finalScore),
    interpretation: buildInterpretation(input, finalScore),
    technicalFindings: {
      faceScore: input.reportType === "questionnaire" ? null : input.face.risk,
      faceConfidence: input.reportType === "questionnaire" ? null : input.face.rawConfidence,
      facePrediction: input.reportType === "questionnaire" ? null : input.face.prediction,
      questionnaireScore: input.questionnaire?.normalised ?? null,
      questionnaireRaw: input.questionnaire?.rawScore ?? null,
      fusedScore: input.reportType === "combined" ? finalScore : null,
      threshold: input.face.threshold,
    },
    recommendation: buildRecommendation(input),
    disclaimer: { text: disclaimerText(input.locale) },
  };
}

// ──────────────────────────────────────────────────────────────────
//  Section builders — deterministic, locale-aware, clinical wording
// ──────────────────────────────────────────────────────────────────

function buildSummary(input: ReportInput, finalScore: number) {
  const isFr = input.locale === "fr";
  const tierLabel = tierWord(input.tier, input.locale);
  const pct = (finalScore * 100).toFixed(1);

  let text: string;
  if (input.reportType === "combined") {
    text = isFr
      ? `Le score combiné (IA + AQ-10) est de ${pct}%, correspondant à un niveau de risque ${tierLabel}.`
      : `The combined score (AI + AQ-10) is ${pct}%, corresponding to a ${tierLabel} risk tier.`;
  } else if (input.reportType === "questionnaire") {
    text = isFr
      ? `Le score AQ-10 est de ${pct}%, correspondant à un niveau de risque ${tierLabel}.`
      : `The AQ-10 score is ${pct}%, corresponding to a ${tierLabel} risk tier.`;
  } else {
    text = isFr
      ? `Le score IA (image) est de ${pct}%, correspondant à un niveau de risque ${tierLabel}.`
      : `The AI image score is ${pct}%, corresponding to a ${tierLabel} risk tier.`;
  }
  return { text, riskTier: input.tier, combinedScore: finalScore };
}

function buildInterpretation(input: ReportInput, finalScore: number) {
  const isFr = input.locale === "fr";
  const tierLabel = tierWord(input.tier, input.locale);
  const scorePct = (finalScore * 100).toFixed(1);

  const headline = isFr
    ? `Indication de risque ${tierLabel} — score global : ${scorePct}%`
    : `${capitalise(tierLabel)}-risk indication — overall score: ${scorePct}%`;

  const parts: string[] = [];

  // Face analysis paragraph
  if (input.reportType !== "questionnaire") {
    const facePct = (input.face.risk * 100).toFixed(1);
    if (isFr) {
      parts.push(
        `L'analyse par imagerie faciale assistée par IA (seuil de décision : ${(input.face.threshold * 100).toFixed(0)}%) a produit une probabilité de ${facePct}% en faveur du profil autistique. ` +
        `Cette valeur reflète le degré de similitude des patterns faciaux avec ceux observés dans la base d'apprentissage, et constitue un signal de dépistage, non un diagnostic.`
      );
    } else {
      parts.push(
        `AI-assisted facial-image analysis (decision threshold: ${(input.face.threshold * 100).toFixed(0)}%) yielded a probability of ${facePct}% for the autistic profile. ` +
        `This value reflects the degree of similarity of facial patterns to those observed in the training dataset, and constitutes a screening signal, not a diagnosis.`
      );
    }
  }

  // Questionnaire paragraph
  if ((input.reportType === "combined" || input.reportType === "questionnaire") && input.questionnaire) {
    const rawScore = input.questionnaire.rawScore;
    const thresholdMet = input.questionnaire.thresholdMet;
    if (isFr) {
      parts.push(
        `Le questionnaire AQ-10 (Autism Quotient — 10 items), rempli par l'aidant principal, a produit un score brut de ${rawScore}/10. ` +
        `${thresholdMet
          ? `Ce score dépasse le seuil clinique usuel de 6 points, indiquant une probabilité accrue de présence de traits autistiques nécessitant une évaluation diagnostique approfondie.`
          : `Ce score est inférieur au seuil clinique usuel de 6 points, ce qui n'exclut pas la présence de traits autistiques atypiques, mais suggère un risque plus limité selon cet outil.`
        }`
      );
    } else {
      parts.push(
        `The AQ-10 questionnaire (Autism Quotient — 10 items), completed by the primary caregiver, produced a raw score of ${rawScore}/10. ` +
        `${thresholdMet
          ? `This score exceeds the commonly used clinical threshold of 6 points, indicating an elevated likelihood of autistic traits warranting further diagnostic evaluation.`
          : `This score falls below the commonly used clinical threshold of 6 points, which does not exclude the presence of atypical autistic traits, but suggests a lower risk level according to this instrument.`
        }`
      );
    }
  }

  // Fusion paragraph
  if (input.reportType === "combined") {
    if (isFr) {
      parts.push(
        `La fusion pondérée des deux modalités (60% imagerie faciale + 40% questionnaire AQ-10) donne un score global de ${scorePct}%, correspondant à un niveau de risque ${tierLabel}. ` +
        `Cette approche multimodale renforce la fiabilité du signal de dépistage en combinant des données objectives (imagerie) et subjectives (observation comportementale).`
      );
    } else {
      parts.push(
        `Weighted fusion of both modalities (60% facial imaging + 40% AQ-10 questionnaire) yields a global score of ${scorePct}%, corresponding to a ${tierLabel}-risk level. ` +
        `This multimodal approach enhances the reliability of the screening signal by combining objective data (imaging) with subjective data (behavioural observation).`
      );
    }
  }

  // Clinical context paragraph based on tier
  if (input.tier === "ELEVE") {
    parts.push(isFr
      ? `Ce profil de risque élevé est cohérent avec une présentation clinique nécessitant une évaluation pluridisciplinaire urgente. Un diagnostic formel implique l'intégration de l'anamnèse développementale, d'observations structurées (ADOS-2, ADI-R) et de bilans orthophonique et psychomoteur.`
      : `This high-risk profile is consistent with a clinical presentation warranting an urgent multidisciplinary evaluation. A formal diagnosis requires integration of the developmental history, structured observations (ADOS-2, ADI-R), and speech-language and psychomotor assessments.`
    );
  } else if (input.tier === "MODERE") {
    parts.push(isFr
      ? `Ce profil de risque modéré suggère la présence possible de traits neurodéveloppementaux sans atteindre le seuil de forte probabilité. Un suivi clinique longitudinal et, si indiqué, une évaluation spécialisée permettront de préciser le tableau clinique.`
      : `This moderate-risk profile suggests the possible presence of neurodevelopmental traits without reaching the high-probability threshold. Longitudinal clinical follow-up and, where indicated, specialised assessment will help clarify the clinical picture.`
    );
  } else {
    parts.push(isFr
      ? `Ce profil de faible risque est rassurant sur la base des données disponibles. Une surveillance développementale de routine reste recommandée, notamment aux âges clés de 18 et 24 mois, conformément aux recommandations pédiatriques en vigueur.`
      : `This low-risk profile is reassuring based on the available data. Routine developmental surveillance remains recommended, particularly at the key ages of 18 and 24 months, in line with current paediatric guidelines.`
    );
  }

  return { headline, body: parts.join(" ") };
}

function buildRecommendation(input: ReportInput) {
  const isFr = input.locale === "fr";
  const tier = input.tier;

  const text =
    tier === "ELEVE"
      ? (isFr
          ? "Orienter le patient vers une équipe pluridisciplinaire spécialisée en troubles du spectre de l'autisme pour une évaluation diagnostique formelle dans les meilleurs délais. Informer la famille des ressources disponibles (centres de référence TSA, CAMSP, structures SESSAD) et des droits associés à un diagnostic précoce."
          : "Refer the patient to a multidisciplinary team specialised in autism spectrum disorders for a formal diagnostic evaluation as soon as possible. Inform the family of available resources (ASD reference centres, early intervention programmes) and the benefits associated with early diagnosis.")
      : tier === "MODERE"
        ? (isFr
            ? "Programmer un suivi clinique rapproché (réévaluation dans 3 à 6 mois) et envisager une évaluation complémentaire par un pédopsychiatre ou un psychologue spécialisé afin de préciser le profil neurodéveloppemental. Compléter si possible l'évaluation par un bilan orthophonique et un bilan psychomoteur."
            : "Schedule close clinical follow-up (re-evaluation within 3 to 6 months) and consider a complementary assessment by a child psychiatrist or specialised psychologist to refine the neurodevelopmental profile. Where possible, supplement the evaluation with speech-language and psychomotor assessments.")
        : (isFr
            ? "Maintenir une surveillance développementale habituelle aux âges clés recommandés. Ce résultat ne nécessite pas d'orientation spécialisée immédiate, mais il est conseillé de rester attentif à tout changement dans le comportement ou le développement de l'enfant."
            : "Maintain routine developmental surveillance at the recommended key ages. This result does not require immediate specialist referral, but it is advisable to remain attentive to any changes in the child's behaviour or development.");

  const followUp = isFr
    ? [
        "Consigner le résultat dans le dossier médical du patient avec la date d'évaluation.",
        "Expliquer les résultats à la famille de façon claire, empathique et non alarmiste.",
        "S'assurer du consentement éclairé des parents ou tuteurs légaux pour tout suivi.",
        "Réévaluer le profil développemental à chaque étape clé ou en cas d'inquiétude clinique.",
      ]
    : [
        "Record the result and evaluation date in the patient's medical file.",
        "Explain the findings to the family clearly, empathetically, and without causing undue alarm.",
        "Ensure informed consent from parents or legal guardians for any follow-up actions.",
        "Re-evaluate the developmental profile at each key milestone or if clinical concerns arise.",
      ];

  return { text, followUp };
}

function disclaimerText(locale: "en" | "fr"): string {
  return locale === "fr"
    ? "Ce rapport est généré par AutiVision à titre d'aide à la décision clinique. Il ne constitue pas un dispositif diagnostique. Tout diagnostic formel exige une évaluation clinique pluridisciplinaire intégrant l'historique développemental, l'observation structurée et des instruments standardisés. Les performances du modèle figurent dans la documentation du projet."
    : "This report is generated by AutiVision as a clinical decision-support aid. It is not a diagnostic device. A formal diagnosis requires a multidisciplinary clinical evaluation integrating developmental history, structured observation, and standardised instruments. Model performance is reported in the project documentation.";
}

function tierWord(t: RisqueEnum, locale: "en" | "fr"): string {
  if (locale === "fr") {
    return ({ FAIBLE: "faible", MODERE: "modéré", ELEVE: "élevé" } as const)[t];
  }
  return ({ FAIBLE: "low", MODERE: "moderate", ELEVE: "high" } as const)[t];
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Re-derives all narrative text sections from a stored report using a
 * different locale. The raw scores / tier stored in the report JSON are
 * sufficient to reproduce every section deterministically, so we never
 * need to hit the database again.
 */
export function localizeReport(report: ScreeningReport, locale: "en" | "fr"): ScreeningReport {
  const tf = report.technicalFindings;
  const tier = report.summary.riskTier;
  const resolvedType: ReportType =
    report.header.reportType === "face" ? "ai" : report.header.reportType;
  const finalScore = report.summary.combinedScore;

  const input: ReportInput = {
    reportType: resolvedType,
    locale,
    evaluationDate: report.header.evaluationDate,
    patient: {
      code: report.header.patientCode,
      age: report.header.patientAge,
      sex: report.header.patientSex,
    },
    face: {
      risk: tf.faceScore ?? 0,
      rawConfidence: tf.faceConfidence ?? 0,
      prediction: tf.facePrediction ?? "non_autistic",
      modelName: report.header.modelName,
      threshold: tf.threshold,
    },
    questionnaire:
      tf.questionnaireRaw != null && tf.questionnaireScore != null
        ? {
            rawScore: tf.questionnaireRaw,
            normalised: tf.questionnaireScore,
            thresholdMet: tf.questionnaireRaw >= 6,
          }
        : undefined,
    combinedScore: tf.fusedScore ?? undefined,
    tier,
  };

  return {
    ...report,
    header: { ...report.header, locale },
    summary: buildSummary(input, finalScore),
    interpretation: buildInterpretation(input, finalScore),
    recommendation: buildRecommendation(input),
    disclaimer: { text: disclaimerText(locale) },
  };
}
