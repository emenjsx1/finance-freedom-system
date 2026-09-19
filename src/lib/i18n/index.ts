import { pt, type Dictionary } from "./pt";

export type Locale = "pt";

const dictionaries: Record<Locale, Dictionary> = { pt };

export const DEFAULT_LOCALE: Locale = "pt";

export function useTranslations(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale];
}

export { pt };
export type { Dictionary };
