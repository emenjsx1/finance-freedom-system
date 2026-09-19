/**
 * Currency support and formatting helpers.
 * Monetary amounts are handled as integer minor units (cents) to avoid
 * floating point errors. Never store money as a float.
 */

export interface CurrencyDefinition {
  code: string;
  name: string;
  symbol: string;
  locale: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: readonly CurrencyDefinition[] = [
  { code: "MZN", name: "Metical moçambicano", symbol: "MT", locale: "pt-MZ", decimals: 2 },
  { code: "ZAR", name: "Rand sul-africano", symbol: "R", locale: "en-ZA", decimals: 2 },
  { code: "USD", name: "Dólar americano", symbol: "$", locale: "en-US", decimals: 2 },
  { code: "EUR", name: "Euro", symbol: "€", locale: "pt-PT", decimals: 2 },
  { code: "GBP", name: "Libra esterlina", symbol: "£", locale: "en-GB", decimals: 2 },
  { code: "TRY", name: "Lira turca", symbol: "₺", locale: "tr-TR", decimals: 2 },
] as const;

export const DEFAULT_CURRENCY_CODE = "MZN";

export function getCurrency(code: string): CurrencyDefinition {
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === code.toUpperCase()) ?? SUPPORTED_CURRENCIES[0]!
  );
}

export function searchCurrencies(query: string): CurrencyDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...SUPPORTED_CURRENCIES];
  return SUPPORTED_CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q),
  );
}

/** Convert a user-entered decimal string/number into integer minor units. */
export function toMinorUnits(value: string | number, currencyCode: string): number {
  const { decimals } = getCurrency(currencyCode);
  const normalized =
    typeof value === "number" ? String(value) : value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 10 ** decimals);
}

/** Convert integer minor units back to a decimal number (display/edit only). */
export function fromMinorUnits(minor: number, currencyCode: string): number {
  const { decimals } = getCurrency(currencyCode);
  return minor / 10 ** decimals;
}

export interface FormatMoneyOptions {
  /** Hide the currency symbol, e.g. inside grouped tables. */
  withSymbol?: boolean;
  /** Always render a leading + or -. */
  signDisplay?: "auto" | "always" | "never";
  /** Round to whole units for compact displays. */
  compactDecimals?: boolean;
}

export function formatMoney(
  minorUnits: number,
  currencyCode: string,
  options: FormatMoneyOptions = {},
): string {
  const { withSymbol = true, signDisplay = "auto", compactDecimals = false } = options;
  const currency = getCurrency(currencyCode);
  const amount = fromMinorUnits(minorUnits, currency.code);
  const fractionDigits = compactDecimals ? 0 : currency.decimals;

  const formatted = new Intl.NumberFormat(currency.locale, {
    style: withSymbol ? "currency" : "decimal",
    currency: currency.code,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    signDisplay: signDisplay === "never" ? "never" : signDisplay,
  }).format(signDisplay === "never" ? Math.abs(amount) : amount);

  return formatted;
}

export function formatPercent(value: number, locale = "pt-PT"): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value / 100);
}
