/**
 * Deterministic supporting line for Home.
 *
 * No LLM call: the message is derived from real app context, and falls back to
 * a small rotating set of calm, neutral lines. Rotation is stable per day so
 * the screen never flickers between renders.
 */

export interface HomeMessageContext {
  /** No accounts / no transactions yet. */
  isNewUser: boolean;
  /** Goal closest to completion, when it is meaningfully advanced. */
  nearestGoal?: { name: string; progress: number } | undefined;
  /** Money moved into wealth/protected wallets in the current month. */
  builtThisMonthMinor: number;
  /** Anything spent this month (used only to avoid empty-month claims). */
  hasActivityThisMonth: boolean;
}

export const NEUTRAL_HOME_MESSAGES = [
  "Constrói hoje. Vive melhor amanhã.",
  "Clareza primeiro. Decisões depois.",
  "Pequenas decisões. Grandes planos.",
  "O teu futuro começa no que organizas hoje.",
  "Dinheiro com propósito. Vida com liberdade.",
  "Constrói com calma.",
  "Mais clareza. Mais liberdade.",
] as const;

export function homeMessage(context: HomeMessageContext, date: Date = new Date()): string {
  if (context.isNewUser) return "Começa por organizar o que já tens.";

  const goal = context.nearestGoal;
  if (goal && goal.progress >= 0.75) return `A ${goal.name} está cada vez mais perto.`;
  if (goal && goal.progress >= 0.5) return `Estás a meio caminho da ${goal.name}.`;

  if (context.builtThisMonthMinor > 0 && context.hasActivityThisMonth)
    return "Estás a construir o teu futuro.";

  return neutralMessage(date);
}

/** Stable per calendar day, so Home stays consistent while it is open. */
export function neutralMessage(date: Date = new Date()): string {
  const dayIndex = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  const index = ((dayIndex % NEUTRAL_HOME_MESSAGES.length) + NEUTRAL_HOME_MESSAGES.length) %
    NEUTRAL_HOME_MESSAGES.length;
  return NEUTRAL_HOME_MESSAGES[index]!;
}
