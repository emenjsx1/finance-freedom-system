/**
 * Portuguese UI strings. Single source for copy so future locales can be
 * added by shipping another dictionary with the same shape.
 */
export const pt = {
  common: {
    continue: "Continuar",
    back: "Voltar",
    skip: "Saltar",
    save: "Guardar",
    cancel: "Cancelar",
    add: "Adicionar",
    remove: "Remover",
    optional: "opcional",
  },
  nav: {
    home: "Início",
    transactions: "Transações",
    add: "Adicionar",
    goals: "Objetivos",
    more: "Mais",
    wallets: "Contas",
    reports: "Relatórios",
    settings: "Definições",
  },
  home: {
    morning: "Bom dia",
    afternoon: "Boa tarde",
    evening: "Boa noite",
    wealth: "Património pessoal",
    spendable: "Disponível para gastar",
    monthSummary: "Resumo do mês",
    income: "Entradas",
    expenses: "Gastos",
    built: "Construído",
    buckets: "Os teus potes",
  },
  onboarding: {
    welcomeTitle: "Organiza o teu dinheiro. Constrói a tua liberdade.",
    philosophy:
      "O saldo da tua conta não é necessariamente o dinheiro que tens disponível para gastar",
    readyTitle: "O teu sistema financeiro está pronto.",
    enterDashboard: "Entrar no meu painel",
  },
} as const;

export type Dictionary = typeof pt;
