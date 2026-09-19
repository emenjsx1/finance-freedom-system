/**
 * Património — everything owned minus everything owed.
 *
 * Money is only one part of it. Values here are entered by the person; nothing
 * is estimated, seeded or inferred, and business turnover is never personal net
 * worth. A business may appear later as a participation with a value the person
 * states.
 */
export type NetWorthCategory =
  | "vehicle"
  | "property"
  | "investment"
  | "participation"
  | "other_asset"
  | "liability";

export const NET_WORTH_CATEGORY_LABELS: Record<NetWorthCategory, string> = {
  vehicle: "Veículos",
  property: "Imóveis e terrenos",
  investment: "Investimentos",
  participation: "Participações",
  other_asset: "Outros ativos",
  liability: "Dívidas",
};

export const NET_WORTH_ORDER: NetWorthCategory[] = [
  "vehicle",
  "property",
  "investment",
  "participation",
  "other_asset",
  "liability",
];

export interface NetWorthItem {
  id: string;
  category: NetWorthCategory;
  name: string;
  /** Value stated by the person, in minor units of the base currency. */
  valueMinor: number;
  note?: string | undefined;
  updatedAt: string;
}

export interface NetWorthState {
  items: NetWorthItem[];
}

export const EMPTY_NET_WORTH: NetWorthState = { items: [] };

export function isLiability(item: NetWorthItem): boolean {
  return item.category === "liability";
}

/** Money comes from the financial engine; assets and debts from this domain. */
export function netWorthMinor(moneyMinor: number, items: NetWorthItem[]): number {
  return items.reduce(
    (total, item) => total + (isLiability(item) ? -item.valueMinor : item.valueMinor),
    moneyMinor,
  );
}
