/**
 * One professional icon family for the whole product.
 *
 * Icons are stored as stable string keys ("travel", "home", …). Legacy data
 * stored emoji, so every emoji we ever shipped maps back to a key — nothing
 * needs migrating and no emoji is ever rendered as product iconography.
 */
import {
  Banknote,
  Bike,
  Book,
  Briefcase,
  Building2,
  Bus,
  Car,
  CircleDollarSign,
  Clapperboard,
  Coins,
  CreditCard,
  Dumbbell,
  Gift,
  GraduationCap,
  Handshake,
  Heart,
  HeartHandshake,
  Home,
  Landmark,
  Laptop,
  LifeBuoy,
  Lock,
  Luggage,
  Baby,
  Hammer,
  PawPrint,
  PiggyBank,
  Plane,
  Repeat,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Stethoscope,
  Target,
  TrendingUp,
  Undo2,
  Utensils,
  Wallet,
  Wrench,
  Circle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export interface SymbolDef {
  key: string;
  label: string;
  icon: LucideIcon;
}

const DEFS = [
  // Goals & life
  { key: "travel", label: "Viagem", icon: Plane },
  { key: "home", label: "Casa", icon: Home },
  { key: "car", label: "Carro", icon: Car },
  { key: "emergency", label: "Emergência", icon: LifeBuoy },
  { key: "education", label: "Educação", icon: GraduationCap },
  { key: "business", label: "Negócio", icon: Building2 },
  { key: "technology", label: "Tecnologia", icon: Laptop },
  { key: "family", label: "Família", icon: HeartHandshake },
  { key: "savings", label: "Poupança", icon: PiggyBank },
  { key: "build", label: "Construção", icon: Hammer },
  { key: "target", label: "Objetivo", icon: Target },
  { key: "protected", label: "Protegido", icon: Lock },
  { key: "gift", label: "Presente", icon: Gift },
  { key: "heart", label: "Afeto", icon: Heart },
  { key: "star", label: "Destaque", icon: Star },
  { key: "sparkle", label: "Extra", icon: Sparkles },
  { key: "baby", label: "Filhos", icon: Baby },
  { key: "pet", label: "Animais", icon: PawPrint },
  { key: "fitness", label: "Bem-estar", icon: Dumbbell },
  // Accounts
  { key: "bank", label: "Banco", icon: Landmark },
  { key: "mobile", label: "Carteira móvel", icon: Smartphone },
  { key: "cash", label: "Dinheiro", icon: Banknote },
  { key: "card", label: "Cartão", icon: CreditCard },
  { key: "coins", label: "Moedas", icon: Coins },
  { key: "wallet", label: "Carteira", icon: Wallet },
  { key: "investments", label: "Investimentos", icon: TrendingUp },
  { key: "briefcase", label: "Trabalho", icon: Briefcase },
  // Categories
  { key: "food", label: "Alimentação", icon: Utensils },
  { key: "transport", label: "Transporte", icon: Bus },
  { key: "bike", label: "Mobilidade", icon: Bike },
  { key: "shopping", label: "Compras", icon: ShoppingBag },
  { key: "clothing", label: "Roupa", icon: Shirt },
  { key: "health", label: "Saúde", icon: Stethoscope },
  { key: "books", label: "Estudos", icon: Book },
  { key: "leisure", label: "Lazer", icon: Clapperboard },
  { key: "subscriptions", label: "Subscrições", icon: Repeat },
  { key: "relationship", label: "Relação", icon: HeartHandshake },
  { key: "personal-care", label: "Cuidados pessoais", icon: Sparkles },
  { key: "tools", label: "Serviços", icon: Wrench },
  { key: "deal", label: "Comissão", icon: Handshake },
  { key: "refund", label: "Reembolso", icon: Undo2 },
  { key: "sale", label: "Venda", icon: CircleDollarSign },
  { key: "luggage", label: "Bagagem", icon: Luggage },
  { key: "other", label: "Outro", icon: Circle },
] as const satisfies readonly SymbolDef[];

export type SymbolKey = (typeof DEFS)[number]["key"];

const BY_KEY = new Map<string, SymbolDef>(DEFS.map((d) => [d.key, d]));

/** Legacy emoji → symbol key, so historic data renders as proper icons. */
const EMOJI: Record<string, SymbolKey> = {
  "🔒": "protected",
  "🏗️": "build",
  "🏗": "build",
  "🎯": "target",
  "🏠": "home",
  "❤️": "heart",
  "❤": "heart",
  "🎁": "gift",
  "✈️": "travel",
  "✈": "travel",
  "🚗": "car",
  "🎓": "education",
  "🏥": "health",
  "💼": "briefcase",
  "🐖": "savings",
  "⭐": "star",
  "✨": "sparkle",
  "💳": "card",
  "🏦": "bank",
  "📱": "mobile",
  "💵": "cash",
  "📈": "investments",
  "🪙": "coins",
  "🍽": "food",
  "🍽️": "food",
  "🛍": "shopping",
  "🛍️": "shopping",
  "👕": "clothing",
  "🩺": "health",
  "📚": "books",
  "🎬": "leisure",
  "🔁": "subscriptions",
  "💞": "relationship",
  "💻": "technology",
  "🧴": "personal-care",
  "🏢": "business",
  "🧰": "tools",
  "🤝": "deal",
  "↩️": "refund",
  "↩": "refund",
  "🏷": "sale",
  "🏷️": "sale",
  "•": "other",
};

/** Accepts a symbol key, a legacy emoji, or nothing. Always resolves. */
export function resolveSymbol(value: string | undefined | null): SymbolDef {
  if (!value) return BY_KEY.get("other")!;
  const direct = BY_KEY.get(value);
  if (direct) return direct;
  const mapped = EMOJI[value.trim()];
  if (mapped) return BY_KEY.get(mapped)!;
  return BY_KEY.get("other")!;
}

export function symbolLabel(value: string | undefined): string {
  return resolveSymbol(value).label;
}

/** Curated pickers. */
export const GOAL_SYMBOLS: SymbolKey[] = [
  "travel",
  "home",
  "car",
  "emergency",
  "education",
  "business",
  "technology",
  "family",
  "savings",
  "baby",
  "fitness",
  "target",
];

export const WALLET_SYMBOL_KEYS: SymbolKey[] = [
  "protected",
  "build",
  "target",
  "home",
  "family",
  "gift",
  "travel",
  "car",
  "education",
  "health",
  "briefcase",
  "savings",
  "star",
  "sparkle",
  "card",
];

export const ACCOUNT_SYMBOL_KEYS: SymbolKey[] = [
  "bank",
  "mobile",
  "cash",
  "card",
  "savings",
  "investments",
  "coins",
  "briefcase",
];

/** Renders the icon for a stored symbol value. Decorative by default. */
export function Symbol({
  name,
  className,
  title,
}: {
  name: string | undefined | null;
  className?: string;
  title?: string;
}) {
  const def = resolveSymbol(name);
  const Icon = def.icon;
  return (
    <Icon
      className={cn("size-5", className)}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
    />
  );
}
