/**
 * Strategy templates. These are starting points, never universal truths and
 * never ranked. Every suggested value is visible and editable by the person.
 */
import type { RuleMethod, RuleTargetKind, StrategyMode } from "./types";

export interface TemplateRule {
  label: string;
  method: RuleMethod;
  /** percentage: 0-100. fixed/surplus: minor units. priority: order only. */
  value: number;
  targetKind: RuleTargetKind;
  untilMinor?: number;
}

export interface StrategyTemplate {
  key: string;
  name: string;
  philosophy: string;
  howItWorks: string;
  defaultMode: StrategyMode;
  keepAvailableMinor?: number;
  rules: TemplateRule[];
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    key: "none",
    name: "Sem regra",
    philosophy: "Decides sempre que entra dinheiro.",
    howItWorks: "Nada é sugerido automaticamente. O dinheiro fica disponível até o organizares.",
    defaultMode: "none",
    rules: [],
  },
  {
    key: "balanced",
    name: "Equilibrado",
    philosophy: "Equilibra presente, proteção e futuro.",
    howItWorks: "Parte do que entra vai para proteção, parte para planos, o resto fica disponível.",
    defaultMode: "suggest",
    rules: [
      { label: "Proteção", method: "percentage", value: 20, targetKind: "protection" },
      { label: "Planos", method: "percentage", value: 30, targetKind: "plan" },
      { label: "Disponível", method: "percentage", value: 50, targetKind: "available" },
    ],
  },
  {
    key: "growth",
    name: "Crescimento",
    philosophy: "Direciona uma parte maior para construir os teus planos.",
    howItWorks: "A maioria do que entra é encaminhada para planos ativos.",
    defaultMode: "suggest",
    rules: [
      { label: "Planos", method: "percentage", value: 50, targetKind: "plan" },
      { label: "Proteção", method: "percentage", value: 15, targetKind: "protection" },
      { label: "Disponível", method: "percentage", value: 35, targetKind: "available" },
    ],
  },
  {
    key: "conservative",
    name: "Conservador",
    philosophy: "Prioriza segurança e reservas.",
    howItWorks: "A proteção recebe a maior fatia antes de qualquer outro destino.",
    defaultMode: "suggest",
    rules: [
      { label: "Proteção", method: "percentage", value: 40, targetKind: "protection" },
      { label: "Planos", method: "percentage", value: 20, targetKind: "plan" },
      { label: "Disponível", method: "percentage", value: 40, targetKind: "available" },
    ],
  },
  {
    key: "goal_first",
    name: "Objetivo primeiro",
    philosophy: "Concentra esforço num plano importante.",
    howItWorks: "Um plano escolhido recebe primeiro; o resto fica disponível.",
    defaultMode: "suggest",
    rules: [
      { label: "Plano principal", method: "percentage", value: 40, targetKind: "plan" },
      { label: "Disponível", method: "percentage", value: 60, targetKind: "available" },
    ],
  },
  {
    key: "safety_first",
    name: "Segurança primeiro",
    philosophy: "Constrói proteção antes de aumentar outros planos.",
    howItWorks: "Por ordem: completa a reserva até um valor, só depois alimenta os planos.",
    defaultMode: "suggest",
    rules: [
      { label: "Completar a reserva", method: "priority", value: 1, targetKind: "protection" },
      { label: "Depois, os planos", method: "priority", value: 2, targetKind: "plan" },
      { label: "O resto fica disponível", method: "priority", value: 3, targetKind: "available" },
    ],
  },
  {
    key: "irregular",
    name: "Renda irregular",
    philosophy: "Organiza dinheiro sem assumir salário fixo.",
    howItWorks: "Cada entrada é avaliada por si. Nenhuma regra assume um valor mensal.",
    defaultMode: "suggest",
    rules: [
      { label: "Reserva de meses difíceis", method: "percentage", value: 30, targetKind: "protection" },
      { label: "Planos", method: "percentage", value: 20, targetKind: "plan" },
      { label: "Disponível", method: "percentage", value: 50, targetKind: "available" },
    ],
  },
  {
    key: "surplus",
    name: "Excedente",
    philosophy: "Define quanto queres manter disponível e organiza o que ultrapassar.",
    howItWorks: "Mantém um valor livre; tudo acima disso é encaminhado para planos.",
    defaultMode: "suggest",
    keepAvailableMinor: 10_000_00,
    rules: [{ label: "Acima do limite, para os planos", method: "surplus", value: 0, targetKind: "plan" }],
  },
  {
    key: "flexible",
    name: "Flexível",
    philosophy: "Recebes sugestões, mas decides sempre antes de organizar.",
    howItWorks: "Sugestões suaves, sem automatismo e sem insistência.",
    defaultMode: "suggest",
    rules: [
      { label: "Planos", method: "percentage", value: 25, targetKind: "plan" },
      { label: "Disponível", method: "percentage", value: 75, targetKind: "available" },
    ],
  },
  {
    key: "custom",
    name: "Personalizado",
    philosophy: "Cria as tuas próprias regras.",
    howItWorks: "Começas em branco e adicionas as regras que fizerem sentido para ti.",
    defaultMode: "suggest",
    rules: [],
  },
];

export function templateByKey(key: string): StrategyTemplate | undefined {
  return STRATEGY_TEMPLATES.find((t) => t.key === key);
}
