import { en } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";
import { type Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

export const dictionaries: Record<Locale, Dictionary> = { en, fr };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

export function interpolate(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export type { Locale } from "./config";
export type { Dictionary } from "./dictionaries/en";
