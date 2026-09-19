export interface Category {
  id: string;
  name: string;
  icon: string;
  kind: "expense" | "income";
  archived?: boolean | undefined;
  order: number;
  custom?: boolean | undefined;
}

const expense: [string, string][] = [
  ["Alimentação", "food"],
  ["Transporte", "transport"],
  ["Casa", "home"],
  ["Compras", "shopping"],
  ["Roupa", "clothing"],
  ["Saúde", "health"],
  ["Educação", "books"],
  ["Faculdade", "education"],
  ["Lazer", "leisure"],
  ["Viagens", "travel"],
  ["Subscrições", "subscriptions"],
  ["Família", "family"],
  ["Presentes", "gift"],
  ["Relacionamento", "relationship"],
  ["Tecnologia", "technology"],
  ["Cuidados pessoais", "personal-care"],
  ["Outros", "other"],
];

const income: [string, string][] = [
  ["Negócio", "business"],
  ["Salário", "briefcase"],
  ["Freelance", "tools"],
  ["Comissão", "deal"],
  ["Reembolso", "refund"],
  ["Presente", "gift"],
  ["Venda", "sale"],
  ["Investimentos", "investments"],
  ["Outros", "other"],
];

function build(list: [string, string][], kind: "expense" | "income"): Category[] {
  return list.map(([name, icon], index) => ({
    id: `${kind}-${index}`,
    name,
    icon,
    kind,
    order: index,
  }));
}

export const DEFAULT_CATEGORIES: Category[] = [...build(expense, "expense"), ...build(income, "income")];

export function activeCategories(categories: Category[], kind: "expense" | "income"): Category[] {
  return categories
    .filter((c) => c.kind === kind && !c.archived)
    .sort((a, b) => a.order - b.order);
}

export function findCategory(categories: Category[], id: string | undefined): Category | undefined {
  return id ? categories.find((c) => c.id === id) : undefined;
}
