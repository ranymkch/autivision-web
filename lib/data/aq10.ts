import type { AQ10Item } from "@/types/questionnaire";

/**
 * AQ-10 (Allison et al., 2012) — Autism Spectrum Quotient short form.
 * Items rephrased for caregiver / self-report use. Bilingual prompts.
 *
 * `scoresOnAgree`: true means endorsing Agree/Definitely Agree adds one point.
 * false means endorsing Disagree/Definitely Disagree adds one point.
 */
export const AQ10_ITEMS: AQ10Item[] = [
  {
    id: "q1",
    prompt_en: "I often notice small sounds when others do not.",
    prompt_fr: "Je remarque souvent de petits bruits que les autres ne perçoivent pas.",
    scoresOnAgree: true,
  },
  {
    id: "q2",
    prompt_en: "I usually concentrate more on the whole picture, rather than the small details.",
    prompt_fr: "Je me concentre habituellement sur l'image d'ensemble plutôt que sur les petits détails.",
    scoresOnAgree: false,
  },
  {
    id: "q3",
    prompt_en: "I find it easy to do more than one thing at once.",
    prompt_fr: "Je trouve facile de faire plusieurs choses à la fois.",
    scoresOnAgree: false,
  },
  {
    id: "q4",
    prompt_en: "If there is an interruption, I can switch back to what I was doing very quickly.",
    prompt_fr: "Si je suis interrompu, je peux reprendre rapidement ce que je faisais.",
    scoresOnAgree: false,
  },
  {
    id: "q5",
    prompt_en: "I find it easy to read between the lines when someone is talking to me.",
    prompt_fr: "Il m'est facile de lire entre les lignes quand quelqu'un me parle.",
    scoresOnAgree: false,
  },
  {
    id: "q6",
    prompt_en: "I know how to tell if someone listening to me is getting bored.",
    prompt_fr: "Je sais reconnaître si quelqu'un qui m'écoute commence à s'ennuyer.",
    scoresOnAgree: false,
  },
  {
    id: "q7",
    prompt_en: "When I'm reading a story, I find it difficult to work out the characters' intentions.",
    prompt_fr: "Quand je lis une histoire, j'ai du mal à comprendre les intentions des personnages.",
    scoresOnAgree: true,
  },
  {
    id: "q8",
    prompt_en: "I like to collect information about categories of things (e.g. cars, birds, trains).",
    prompt_fr: "J'aime collecter des informations sur des catégories d'objets (voitures, oiseaux, trains).",
    scoresOnAgree: true,
  },
  {
    id: "q9",
    prompt_en: "I find it easy to work out what someone is thinking or feeling just by looking at their face.",
    prompt_fr: "Je détermine facilement ce que pense ou ressent quelqu'un rien qu'en regardant son visage.",
    scoresOnAgree: false,
  },
  {
    id: "q10",
    prompt_en: "I find it difficult to work out people's intentions.",
    prompt_fr: "J'ai du mal à comprendre les intentions des autres.",
    scoresOnAgree: true,
  },
];
