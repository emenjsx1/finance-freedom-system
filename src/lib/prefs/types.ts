/**
 * Centralised user preferences (Phase 06).
 *
 * One place for presentation choices: theme, accent, density, dashboard
 * modules, terminology overrides and agent personalisation. Nothing here is
 * a business-logic identifier — renaming a label never changes behaviour.
 */

export type ThemeMode = "dark" | "light" | "system";
export type AccentKey = "emerald" | "blue" | "violet" | "amber" | "neutral";
export type Density = "comfortable" | "compact";
export type AgentStyle = "concise" | "balanced" | "detailed";

export const ACCENTS: { key: AccentKey; label: string; swatch: string }[] = [
  { key: "emerald", label: "Esmeralda", swatch: "oklch(0.78 0.16 163)" },
  { key: "blue", label: "Azul", swatch: "oklch(0.72 0.13 245)" },
  { key: "violet", label: "Violeta", swatch: "oklch(0.74 0.14 300)" },
  { key: "amber", label: "Âmbar", swatch: "oklch(0.82 0.14 82)" },
  { key: "neutral", label: "Neutro", swatch: "oklch(0.88 0.005 250)" },
];

/** Dashboard modules the user can show, hide and reorder. */
export type HomeModuleId =
  | "available"
  | "position"
  | "protected"
  | "money_map"
  | "goals"
  | "recent"
  | "upcoming"
  | "month_spending"
  | "wealth_building"
  | "agent";

export const HOME_MODULES: { id: HomeModuleId; label: string; description: string }[] = [
  { id: "available", label: "Disponível para gastar", description: "O valor que podes usar hoje." },
  { id: "position", label: "Posição financeira", description: "Património e organização do dinheiro." },
  { id: "protected", label: "Dinheiro protegido", description: "O que decidiste não usar no dia a dia." },
  { id: "money_map", label: "Mapa do dinheiro", description: "Atalho para as duas vistas do mesmo dinheiro." },
  { id: "goals", label: "Objetivos", description: "Os objetivos mais relevantes." },
  { id: "recent", label: "Atividade recente", description: "Os últimos movimentos." },
  { id: "upcoming", label: "Próximos pagamentos", description: "O que está agendado." },
  { id: "month_spending", label: "Gastos do mês", description: "Entradas e gastos deste mês." },
  { id: "wealth_building", label: "Construção", description: "Quanto construíste este mês." },
  { id: "agent", label: "Resumo do Agente", description: "Uma observação baseada nos teus dados." },
];

export const DEFAULT_HOME_MODULES: HomeModuleId[] = [
  "available",
  "position",
  "agent",
  "goals",
  "recent",
  "month_spending",
];

/** Display-only labels. Internal ids (wealth, goals, life...) never change. */
export type TerminologyKey =
  | "wealth_building"
  | "goals"
  | "life"
  | "family"
  | "free"
  | "protected"
  | "available"
  | "net_worth";

export const TERMINOLOGY_DEFAULTS: Record<TerminologyKey, string> = {
  wealth_building: "Construção",
  goals: "Objetivos",
  life: "Vida",
  family: "Família",
  free: "Livre",
  protected: "Dinheiro protegido",
  available: "Disponível para gastar",
  net_worth: "Património pessoal",
};

export const DEFAULT_PAGES = [
  { to: "/app", label: "Início" },
  { to: "/app/transactions", label: "Atividade" },
  { to: "/app/plan", label: "Plano" },
  { to: "/app/agent", label: "Agente" },
] as const;

export interface UserPreferences {
  theme: ThemeMode;
  accent: AccentKey;
  density: Density;
  homeModules: HomeModuleId[];
  defaultPage: string;
  /** Show the currency code next to every amount. */
  showCurrencyCode: boolean;
  terminology: Partial<Record<TerminologyKey, string>>;
  agentName: string;
  agentIcon: string;
  agentStyle: AgentStyle;
  agentProactiveSummaries: boolean;
  agentInsights: boolean;
  language: "pt";
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "dark",
  accent: "emerald",
  density: "comfortable",
  homeModules: DEFAULT_HOME_MODULES,
  defaultPage: "/app",
  showCurrencyCode: true,
  terminology: {},
  agentName: "Agente",
  agentIcon: "◇",
  agentStyle: "balanced",
  agentProactiveSummaries: true,
  agentInsights: true,
  language: "pt",
};
