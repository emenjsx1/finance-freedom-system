import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Coins,
  Download,
  LifeBuoy,
  ListTree,
  LogOut,
  Palette,
  Repeat,
  Scale,
  ShieldCheck,
  User,
  Wallet,
  Landmark,
  Map,
  Lock,
  EyeOff,
} from "lucide-react";
import type { ComponentType } from "react";

import { PageHeader } from "@/components/page-header";
import { Switch } from "@/components/ui/switch";
import { useSetup } from "@/hooks/use-setup";
import { getCurrency } from "@/lib/finance/currency";
import type { NotificationPreferences } from "@/lib/finance/types";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Definições — Finance OS" },
      { name: "description", content: "Perfil, contas, potes, regra financeira, moeda, notificações e segurança." },
      { property: "og:title", content: "Definições — Finance OS" },
      { property: "og:description", content: "Perfil, contas, potes, regra, moeda, notificações e segurança." },
    ],
  }),
  component: SettingsPage,
});

const APP_VERSION = "0.4.0 (Fase 04)";

const notificationLabels: Record<keyof NotificationPreferences, string> = {
  monthlySummary: "Resumo mensal",
  goalMilestones: "Marcos dos objetivos",
  budgetAlerts: "Alertas de orçamento",
  incomeReminders: "Lembretes de entradas",
  securityAlerts: "Alertas de segurança",
};

function SettingsPage() {
  const { setup, update } = useSetup();
  const currency = getCurrency(setup.currencyCode);

  return (
    <div className="space-y-8">
      <PageHeader title="Mais" subtitle="Controla o teu sistema financeiro." />

      <Section title="Conta">
        <Row icon={User} label="Perfil" value={setup.fullName || "Por definir"} />
        <Row icon={Landmark} label="As minhas contas" value={`${setup.accounts.length}`} to="/app/accounts" />
        <Row icon={Wallet} label="Carteiras" value={`${setup.ruleItems.length}`} to="/app/wallets" />
        <Row icon={Map} label="Mapa do dinheiro" to="/app/money-map" />
        <Row icon={Lock} label="Dinheiro protegido" to="/app/protected" />
        <Row icon={Scale} label="Regra financeira" value="100% distribuído" />
        <Row icon={ListTree} label="Categorias" value="Padrão" />
        <Row icon={Repeat} label="Pagamentos recorrentes" to="/app/recurring" />
        <Row icon={Coins} label="Moeda" value={`${currency.code} · ${currency.symbol}`} />
      </Section>

      <Section title="Notificações">
        <div className="divide-y divide-border">
          {(Object.keys(notificationLabels) as (keyof NotificationPreferences)[]).map((key) => (
            <div key={key} className="flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-3 text-sm">
                <Bell className="size-4 text-muted-foreground" />
                {notificationLabels[key]}
              </span>
              <Switch
                checked={setup.notifications[key]}
                onCheckedChange={(checked) =>
                  update({ notifications: { ...setup.notifications, [key]: checked } })
                }
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Aplicação">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-3 text-sm">
            <EyeOff className="size-4 text-muted-foreground" />
            Modo privado
          </span>
          <Switch
            checked={setup.privacyMode}
            aria-label="Modo privado"
            onCheckedChange={(checked) => update({ privacyMode: checked })}
          />
        </div>
        <Row icon={Palette} label="Aparência" value="Escuro" />
        <Row icon={ShieldCheck} label="Segurança" value="Por ativar" />
        <Row icon={Download} label="Exportar dados" value="CSV" />
        <Row icon={CircleHelp} label="Ajuda e suporte" />
        <Row icon={LifeBuoy} label="Enviar feedback" />
      </Section>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
        <span className="flex items-center gap-3 text-sm text-destructive">
          <LogOut className="size-4" />
          Terminar sessão
        </span>
        <span className="text-xs text-muted-foreground">Disponível com a ligação ativa</span>
      </div>

      <p className="pb-4 text-center text-xs text-muted-foreground">Finance OS · versão {APP_VERSION}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">{children}</div>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  to?: "/app/wallets" | "/app/recurring" | "/app/accounts" | "/app/money-map" | "/app/protected";
}) {
  const content = (
    <>
      <span className="flex items-center gap-3 text-sm">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </span>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        {value}
        <ChevronRight className="size-4" />
      </span>
    </>
  );

  const className =
    "flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0";

  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
