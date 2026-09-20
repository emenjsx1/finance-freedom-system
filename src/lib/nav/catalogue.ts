/**
 * One list of every destination in the app. The sidebar, the "Tudo" screen and
 * search all read from here so nothing can be reachable in one place and
 * invisible in another.
 */
import {
  BarChart3,
  Home,
  ArrowLeftRight,
  LayoutGrid,
  MessageSquare,
  Wallet,
  PieChart,
  Repeat,
  Settings,
  Landmark,
  Map,
  Target,
  Lock,
  Sliders,
  User,
  Bell,
  Zap,
  Compass,
  Sun,
  ListChecks,
  CalendarClock,
  ShieldCheck,
  CircleHelp,
  Coins,
} from "lucide-react";
import type { ComponentType } from "react";

export interface NavEntry {
  to: string;
  label: string;
  /** Plain-language hint shown on the "Tudo" screen. */
  hint?: string;
  icon: ComponentType<{ className?: string }>;
}

export interface NavGroup {
  title: string;
  items: NavEntry[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Dia a dia",
    items: [
      { to: "/app", label: "Início", hint: "O resumo de hoje.", icon: Home },
      { to: "/app/activity", label: "Atividade", hint: "Todos os movimentos.", icon: ArrowLeftRight },
      { to: "/app/agent", label: "Agente", hint: "Falar e pedir ajuda.", icon: MessageSquare },
      { to: "/app/notifications", label: "Avisos", hint: "O que precisa da tua atenção.", icon: Bell },
    ],
  },
  {
    title: "Dinheiro",
    items: [
      { to: "/app/money", label: "O meu dinheiro", hint: "Total, disponível e reservado.", icon: Coins },
      { to: "/app/accounts", label: "Contas", hint: "Onde o dinheiro está.", icon: Landmark },
      { to: "/app/wallets", label: "Propósitos", hint: "Para que é cada valor guardado.", icon: Wallet },
      { to: "/app/protected", label: "Dinheiro protegido", hint: "O que não usas no dia a dia.", icon: Lock },
      { to: "/app/planning", label: "Planeamento do mês", hint: "Gastos mensais e o que sobra.", icon: CalendarClock },
      { to: "/app/horizon", label: "Próximos 12 meses", hint: "Metas, custos e quanto falta.", icon: Target },
      { to: "/app/organize", label: "Ajuda-me a organizar", hint: "Sugestões com valores reais.", icon: Sliders },
      { to: "/app/recurring", label: "Despesas recorrentes", hint: "O que se repete todos os meses.", icon: Repeat },
      { to: "/app/networth", label: "Património", hint: "A evolução do total.", icon: BarChart3 },
      { to: "/app/money-map", label: "Mapa do dinheiro", hint: "Onde está e para quê, lado a lado.", icon: Map },
      { to: "/app/integrity", label: "Verificação", hint: "Confirmar que as contas batem certo.", icon: ShieldCheck },
    ],
  },
  {
    title: "Planos e vida",
    items: [
      { to: "/app/plans", label: "Planos", hint: "O que queres alcançar.", icon: Target },
      { to: "/app/goals", label: "Objetivos", hint: "Valores a atingir.", icon: Target },
      { to: "/app/direction", label: "Direção", hint: "Agora, próximos 12 meses, mais tarde.", icon: Compass },
      { to: "/app/development", label: "Desenvolvimento", hint: "Programas, ações e decisões.", icon: Compass },
      { to: "/app/development/today", label: "Hoje", hint: "As ações de hoje.", icon: Sun },
      { to: "/app/development/programs", label: "Programas", hint: "Caminhos de alguns dias.", icon: ListChecks },
      { to: "/app/reminders", label: "Lembretes", hint: "O que te avisa e quando.", icon: Bell },
      { to: "/app/review", label: "Revisão", hint: "O ponto da situação.", icon: PieChart },
      { to: "/app/strategy", label: "Estratégia", hint: "Como organizar o dinheiro que entra.", icon: Sliders },
    ],
  },
  {
    title: "Análise",
    items: [
      { to: "/app/analytics", label: "Análise", hint: "Números do período.", icon: BarChart3 },
      { to: "/app/reports", label: "Relatórios", hint: "Resumos por mês.", icon: PieChart },
    ],
  },
  {
    title: "Eu",
    items: [
      { to: "/app/me", label: "Eu", hint: "O teu espaço.", icon: User },
      { to: "/app/profile/personal", label: "Perfil e dados pessoais", hint: "Nome, data de nascimento, contactos.", icon: User },
      { to: "/app/context", label: "O que o sistema sabe sobre mim", hint: "Ver, corrigir ou apagar.", icon: MessageSquare },
      { to: "/app/profile/security", label: "Segurança", hint: "Palavra-passe e sessões.", icon: ShieldCheck },
      { to: "/app/notification-settings", label: "Definições de avisos", hint: "O que te chega e quando.", icon: Bell },
      { to: "/app/personalization", label: "Personalização", hint: "Tema, cor e o que vês na Home.", icon: Sliders },
      { to: "/app/automations", label: "Automações", hint: "O que acontece sozinho.", icon: Zap },
      { to: "/app/privacy", label: "Privacidade", hint: "Os teus dados.", icon: Lock },
      { to: "/app/settings", label: "Definições", hint: "Moeda, idioma e conta.", icon: Settings },
      { to: "/app/help", label: "Ajuda", hint: "Como funciona cada coisa.", icon: CircleHelp },
    ],
  },
];

export const ALL_ENTRY: NavEntry = {
  to: "/app/all",
  label: "Tudo",
  hint: "Todas as secções, num sítio só.",
  icon: LayoutGrid,
};
