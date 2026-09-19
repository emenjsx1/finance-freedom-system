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
  ["Alimentação", "🍽"],
  ["Transporte", "🚗"],
  ["Casa", "🏠"],
  ["Compras", "🛍"],
  ["Roupa", "👕"],
  ["Saúde", "🩺"],
  ["Educação", "📚"],
  ["Faculdade", "🎓"],
  ["Lazer", "🎬"],
  ["Viagens", "✈️"],
  ["Subscrições", "🔁"],
  ["Família", "❤️"],
  ["Presentes", "🎁"],
  ["Relacionamento", "💞"],
  ["Tecnologia", "💻"],
  ["Cuidados pessoais", "🧴"],
  ["Outros", "•"],
];

const income: [string, string][] = [
  ["Negócio", "🏢"],
  ["Salário", "💼"],
  ["Freelance", "🧰"],
  ["Comissão", "🤝"],
  ["Reembolso", "↩️"],
  ["Presente", "🎁"],
  ["Venda", "🏷"],
  ["Investimentos", "📈"],
  ["Outros", "•"],
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
