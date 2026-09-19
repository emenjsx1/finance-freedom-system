import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  Hammer,
  Lock,
  Map,
  MessageSquare,
  Pencil,
  Receipt,
  RotateCcw,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ComponentType } from "react";

import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { useTransactionLauncher } from "@/components/transactions/transaction-launcher";
import { useAgent } from "@/hooks/use-agent";
import { useLedger } from "@/hooks/use-ledger";
import { usePrefs } from "@/hooks/use-prefs";
import { useSetup } from "@/hooks/use-setup";
import { buildDailyBrief } from "@/lib/agent/context-builder";
import { greetingFor } from "@/lib/finance/greeting";
import { monthTotals, nextOccurrence } from "@/lib/finance/engine";
import { DEFAULT_HOME_MODULES, HOME_MODULES, type HomeModuleId } from "@/lib/prefs/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Início — Finance OS" },
      {
        name: "description",
        content: "O teu painel pessoal: disponível para gastar, posição financeira, objetivos e atividade recente.",
      },
      { property: "og:title", content: "Início — Finance OS" },
      { property: "og:description", content: "Disponível para gastar, posição financeira e objetivos num só painel." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { setup } = useSetup();
  const { ledger } = useLedger();
  const { prefs, update } = usePrefs();
  const { openQuickActions } = useTransactionLauncher();
  const [editing, setEditing] = useState(false);

  const firstName = setup.fullName.trim().split(" ")[0] ?? "";
  const modules = prefs.homeModules;

  function toggleModule(id: HomeModuleId) {
    update({
      homeModules: modules.includes(id) ? modules.filter((m) => m !== id) : [...modules, id],
    });
  }

  function move(id: HomeModuleId, direction: -1 | 1) {
    const index = modules.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= modules.length) return;
    const next = [...modules];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item as HomeModuleId);
    update({ homeModules: next });
  }

  return (
    <div className="space-y-9 pb-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="type-caption">
            {greetingFor()}
            {firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="type-title mt-1">{editing ? "Personalizar painel" : "O teu sistema"}</h1>
        </div>
        <Button
          variant={editing ? "default" : "ghost"}
          size="icon-sm"
          aria-label={editing ? "Concluir personalização" : "Personalizar painel"}
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? <Check /> : <Pencil />}
        </Button>
      </header>

      {editing ? (
        <EditPanel
          modules={modules}
          onToggle={toggleModule}
          onMove={move}
          onReset={() => update({ homeModules: DEFAULT_HOME_MODULES })}
        />
      ) : (
        <div className="space-y-9">
          {modules.map((id) => (
            <ModuleView key={id} id={id} />
          ))}
          {modules.length === 0 ? (
            <EmptyState
              icon={Target}
              title="O painel está vazio"
              description="Escolhe os módulos que queres ver quando abres a aplicação."
              action={<Button onClick={() => setEditing(true)}>Personalizar painel</Button>}
            />
          ) : null}
        </div>
      )}

      {!editing && setup.accounts.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Adiciona onde guardas o teu dinheiro."
          description="Banco, carteira móvel, numerário — cada lugar onde o dinheiro existe."
          action={
            <Button asChild variant="secondary">
              <Link to="/app/accounts">Adicionar conta</Link>
            </Button>
          }
        />
      ) : null}

      {!editing && setup.accounts.length > 0 && ledger.transactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="A tua história financeira começa aqui."
          description="Regista a primeira entrada ou gasto e o sistema começa a distribuir o dinheiro."
          action={<Button onClick={openQuickActions}>Adicionar primeira transação</Button>}
        />
      ) : null}
    </div>
  );
}

function EditPanel({
  modules,
  onToggle,
  onMove,
  onReset,
}: {
  modules: HomeModuleId[];
  onToggle: (id: HomeModuleId) => void;
  onMove: (id: HomeModuleId, direction: -1 | 1) => void;
  onReset: () => void;
}) {
  const ordered = [
    ...modules,
    ...HOME_MODULES.map((m) => m.id).filter((id) => !modules.includes(id)),
  ];

  return (
    <div className="space-y-3">
      <p className="type-caption">
        Escolhe e ordena o que aparece no Início. Isto muda apenas a apresentação — nenhum dado
        financeiro é apagado.
      </p>
      <ul className="space-y-2">
        {ordered.map((id) => {
          const meta = HOME_MODULES.find((m) => m.id === id);
          const visible = modules.includes(id);
          if (!meta) return null;
          return (
            <li key={id} className="card-compact flex items-center gap-3">
              <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", !visible && "text-muted-foreground")}>
                  {meta.label}
                </p>
                <p className="type-meta truncate">{meta.description}</p>
              </div>
              {visible ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Subir ${meta.label}`}
                    onClick={() => onMove(id, -1)}
                  >
                    <span aria-hidden>↑</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Descer ${meta.label}`}
                    onClick={() => onMove(id, 1)}
                  >
                    <span aria-hidden>↓</span>
                  </Button>
                </div>
              ) : null}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={visible ? `Esconder ${meta.label}` : `Mostrar ${meta.label}`}
                onClick={() => onToggle(id)}
              >
                {visible ? <Eye /> : <EyeOff />}
              </Button>
            </li>
          );
        })}
      </ul>
      <Button variant="secondary" size="sm" onClick={onReset}>
        <RotateCcw />
        Restaurar padrão
      </Button>
    </div>
  );
}

function ModuleView({ id }: { id: HomeModuleId }) {
  const { setup } = useSetup();
  const { ledger, snapshot } = useLedger();
  const { term } = usePrefs();
  const { openComposer } = useTransactionLauncher();

  const now = new Date();
  const totals = useMemo(
    () => monthTotals(ledger.transactions, now.getFullYear(), now.getMonth(), setup.ruleItems),
    [ledger.transactions, setup.ruleItems, now],
  );

  switch (id) {
    case "available":
      return (
        <section className="card-hero rise-in">
          <p className="type-section">{term("available")}</p>
          <Money minor={snapshot.spendableMinor} className="type-display mt-2 block" />
          <p className="type-caption mt-2">
            Só as carteiras que marcaste como disponíveis. O saldo das contas não é o que podes gastar.
          </p>
          {snapshot.unallocatedMinor > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
              <p className="type-caption flex-1">
                <Money minor={snapshot.unallocatedMinor} /> ainda não têm propósito.
              </p>
              <Button size="sm" variant="secondary" onClick={() => openComposer({ kind: "reallocation" })}>
                Distribuir agora
              </Button>
            </div>
          ) : null}
        </section>
      );

    case "position":
      return (
        <section>
          <h2 className="type-section mb-3">Posição financeira</h2>
          <div className="grid grid-cols-2 gap-2">
            <Figure label={term("net_worth")} minor={snapshot.wealthMinor} />
            <Figure label="Com propósito" minor={snapshot.purposeTotalMinor} />
          </div>
        </section>
      );

    case "protected":
      return (
        <section className="card-standard flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm">
            <Lock className="size-4 text-warning" aria-hidden />
            {term("protected")}
          </span>
          <Money minor={snapshot.protectedMinor} className="text-sm font-medium" />
        </section>
      );

    case "money_map":
      return (
        <Link to="/app/money-map" className="card-interactive flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm">
            <Map className="size-4 text-primary" aria-hidden />
            Ver mapa do dinheiro
          </span>
          <span aria-hidden className="text-muted-foreground">
            →
          </span>
        </Link>
      );

    case "goals": {
      const goals = snapshot.wallets.filter((w) => w.kind === "goals" && !w.archived).slice(0, 2);
      if (goals.length === 0) return null;
      return (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="type-section">{term("goals")}</h2>
            <Link to="/app/goals" className="type-caption text-primary">
              Ver todos
            </Link>
          </div>
          <div className="space-y-2">
            {goals.map((goal) => (
              <Link
                key={goal.id}
                to="/app/wallets/$walletId"
                params={{ walletId: goal.id }}
                className="card-interactive flex items-center justify-between"
              >
                <span className="flex items-center gap-3 text-sm font-medium">
                  <span aria-hidden>{goal.icon}</span>
                  {goal.name}
                </span>
                <Money minor={goal.balanceMinor} className="text-sm" />
              </Link>
            ))}
          </div>
        </section>
      );
    }

    case "recent": {
      const recent = [...ledger.transactions]
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 4);
      if (recent.length === 0) return null;
      return (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="type-section">Atividade recente</h2>
            <Link to="/app/transactions" className="type-caption text-primary">
              Ver tudo
            </Link>
          </div>
          <div className="space-y-2">
            {recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                categories={ledger.categories}
                accounts={setup.accounts}
                buckets={setup.ruleItems}
                currencyCode={setup.currencyCode}
                onOpen={() => undefined}
              />
            ))}
          </div>
        </section>
      );
    }

    case "upcoming": {
      const upcoming = ledger.recurring
        .filter((r) => r.active)
        .map((r) => ({ rule: r, next: nextOccurrence(r) }))
        .filter((x): x is { rule: (typeof ledger.recurring)[number]; next: Date } => x.next !== null)
        .sort((a, b) => a.next.getTime() - b.next.getTime())
        .slice(0, 3);
      if (upcoming.length === 0) return null;
      return (
        <section>
          <h2 className="type-section mb-3">Próximos pagamentos</h2>
          <div className="space-y-2">
            {upcoming.map(({ rule, next }) => (
              <div key={rule.id} className="card-compact flex items-center justify-between">
                <span className="text-sm">
                  {rule.name}
                  <span className="type-meta ml-2">{next.toLocaleDateString("pt-PT")}</span>
                </span>
                <Money minor={rule.amountMinor} className="text-sm" />
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "month_spending":
      return (
        <section>
          <h2 className="type-section mb-3">Este mês</h2>
          <div className="grid grid-cols-3 gap-2">
            <SummaryTile label="Entradas" icon={ArrowDownLeft} minor={totals.income} tone="income" />
            <SummaryTile label="Gastos" icon={ArrowUpRight} minor={totals.expenses} tone="expense" />
            <SummaryTile label={term("wealth_building")} icon={Hammer} minor={totals.built} tone="wealth" />
          </div>
        </section>
      );

    case "wealth_building":
      return (
        <section className="card-standard">
          <p className="type-section">{term("wealth_building")} este mês</p>
          <Money minor={totals.built} className="mt-2 block text-2xl font-semibold" />
        </section>
      );

    case "agent":
      return <AgentCard />;
  }
}

/** Only shows statements supported by real app data. */
function AgentCard() {
  const { prefs } = usePrefs();
  const { deps } = useAgent();
  const lines = buildDailyBrief(deps);

  return (
    <section className="card-standard">
      <div className="flex items-center justify-between">
        <p className="type-section">{prefs.agentName}</p>
        <MessageSquare className="size-4 text-primary" aria-hidden />
      </div>
      <ul className="mt-3 space-y-1.5">
        {lines.map((line) => (
          <li key={line} className="type-body">
            {line}
          </li>
        ))}
      </ul>
      <Button asChild variant="secondary" size="sm" className="mt-4">
        <Link to="/app/agent">Falar com o {prefs.agentName}</Link>
      </Button>
    </section>
  );
}

function Figure({ label, minor }: { label: string; minor: number }) {
  return (
    <div className="card-standard">
      <p className="type-meta">{label}</p>
      <Money minor={minor} className="mt-1.5 block text-xl font-semibold" />
    </div>
  );
}

function SummaryTile({
  label,
  minor,
  icon: Icon,
  tone,
}: {
  label: string;
  minor: number;
  icon: ComponentType<{ className?: string }>;
  tone: "income" | "expense" | "wealth";
}) {
  const toneClass = tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-wealth";
  return (
    <div className="card-compact">
      <Icon className={cn("size-4", toneClass)} />
      <p className="type-meta mt-2">{label}</p>
      <Money minor={minor} className="mt-0.5 block text-sm font-medium" options={{ compactDecimals: true }} />
    </div>
  );
}
