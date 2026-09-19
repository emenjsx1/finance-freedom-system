import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarClock, Check, Pencil, Repeat, SkipForward, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { emitNotificationEvent, haptic, newId, useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { activeCategories } from "@/lib/finance/categories";
import { formatMoney, toMinorUnits } from "@/lib/finance/currency";
import { monthlyEquivalent, nextOccurrence } from "@/lib/finance/engine";
import type { Frequency, RecurringRule } from "@/lib/finance/ledger-types";

export const Route = createFileRoute("/app/recurring")({
  head: () => ({
    meta: [
      { title: "Recorrentes — Finance OS" },
      { name: "description", content: "Pagamentos recorrentes, próximos vencimentos e subscrições." },
      { property: "og:title", content: "Recorrentes — Finance OS" },
      { property: "og:description", content: "Pagamentos recorrentes, próximos vencimentos e subscrições." },
    ],
  }),
  component: RecurringPage,
});

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
  { value: "bimonthly", label: "A cada 2 meses" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
  { value: "custom", label: "Personalizado" },
];

function RecurringPage() {
  const { setup } = useSetup();
  const { ledger, upsertRecurring, deleteRecurring, addTransaction } = useLedger();
  const isMobile = useIsMobile();
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const currency = setup.currencyCode;

  const upcoming = useMemo(() => {
    return ledger.recurring
      .map((rule) => ({ rule, date: nextOccurrence(rule) }))
      .filter((entry): entry is { rule: RecurringRule; date: Date } => entry.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [ledger.recurring]);

  const subscriptions = ledger.recurring.filter((rule) => rule.isSubscription);

  function markPaid(rule: RecurringRule, date: Date) {
    addTransaction({
      id: newId(),
      kind: rule.kind,
      amountMinor: rule.amountMinor,
      occurredAt: date.toISOString(),
      createdAt: new Date().toISOString(),
      moneyType: "personal",
      tags: [],
      attachments: [],
      description: rule.name,
      recurringId: rule.id,
      ...(rule.categoryId ? { categoryId: rule.categoryId } : {}),
      ...(rule.accountId ? { accountId: rule.accountId } : {}),
      ...(rule.kind === "expense" && rule.bucketId ? { bucketId: rule.bucketId } : {}),
    });
    upsertRecurring({ ...rule, lastHandledAt: date.toISOString() });
    haptic("success");
    toast.success(`${rule.name} registado`);
  }

  function skip(rule: RecurringRule, date: Date) {
    upsertRecurring({ ...rule, lastHandledAt: date.toISOString() });
    toast.info(`${rule.name} ignorado desta vez`);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Recorrentes" subtitle="Lembretes dos pagamentos que se repetem." />

      <Tabs defaultValue="upcoming">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className="flex-1">Próximos</TabsTrigger>
          <TabsTrigger value="rules" className="flex-1">Regras</TabsTrigger>
          <TabsTrigger value="subs" className="flex-1">Subscrições</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-2">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Ainda não tens pagamentos recorrentes."
              description="Cria uma regra para receberes um lembrete antes de cada pagamento."
              action={<Button onClick={() => setEditing(blankRule())}>Criar recorrência</Button>}
            />
          ) : (
            upcoming.map(({ rule, date }) => {
              const overdue = date.getTime() < Date.now();
              if (overdue) emitNotificationEvent("recurring_transaction_overdue", { id: rule.id });
              return (
                <div key={rule.id} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {date.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
                        {overdue ? " · em atraso" : ""} ·{" "}
                        {rule.mode === "auto" ? "Automático" : "Lembrete"}
                      </p>
                    </div>
                    <p className="numeric text-sm font-semibold">{formatMoney(rule.amountMinor, currency)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => markPaid(rule, date)}>
                      <Check className="size-4" /> Marcar pago
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => skip(rule, date)}>
                      <SkipForward className="size-4" /> Saltar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(rule)}>
                      <Pencil className="size-4" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteRecurring(rule.id)}>
                      <Trash2 className="size-4" /> Eliminar
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="rules" className="mt-4 space-y-2">
          <Button className="w-full" onClick={() => setEditing(blankRule())}>
            <Repeat className="size-4" /> Nova recorrência
          </Button>
          {ledger.recurring.map((rule) => (
            <button
              key={rule.id}
              type="button"
              onClick={() => setEditing(rule)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left"
            >
              <span>
                <span className="block text-sm font-medium">{rule.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {FREQUENCIES.find((f) => f.value === rule.frequency)?.label} ·{" "}
                  {rule.mode === "auto" ? "Automático" : "Lembrete"}
                </span>
              </span>
              <span className="numeric text-sm">{formatMoney(rule.amountMinor, currency)}</span>
            </button>
          ))}
        </TabsContent>

        <TabsContent value="subs" className="mt-4 space-y-2">
          {subscriptions.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="Sem subscrições marcadas"
              description="Marca uma recorrência como subscrição para a veres aqui."
            />
          ) : (
            subscriptions.map((rule) => {
              const next = nextOccurrence(rule);
              return (
                <div key={rule.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{rule.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {FREQUENCIES.find((f) => f.value === rule.frequency)?.label}
                      {next ? ` · próximo ${next.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="numeric text-sm font-semibold">{formatMoney(rule.amountMinor, currency)}</p>
                    <p className="numeric text-xs text-muted-foreground">
                      ≈ {formatMoney(monthlyEquivalent(rule), currency, { compactDecimals: true })}/mês
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent side={isMobile ? "bottom" : "right"} className="overflow-y-auto bg-background sm:max-w-md">
          <SheetHeader className="px-4">
            <SheetTitle>Recorrência</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-8">
            {editing ? (
              <RuleForm
                rule={editing}
                currencyCode={currency}
                categories={activeCategories(ledger.categories, editing.kind === "income" ? "income" : "expense").map((c) => ({ id: c.id, name: c.name }))}
                accounts={setup.accounts.map((a) => ({ id: a.id, name: a.name || "Conta" }))}
                buckets={setup.ruleItems.map((b) => ({ id: b.id, name: b.name }))}
                onSave={(rule) => {
                  upsertRecurring(rule);
                  setEditing(null);
                  toast.success("Recorrência guardada");
                }}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function blankRule(): RecurringRule {
  return {
    id: newId(),
    name: "",
    kind: "expense",
    amountMinor: 0,
    frequency: "monthly",
    startDate: new Date().toISOString(),
    mode: "reminder",
    active: true,
  };
}

function RuleForm({
  rule,
  currencyCode,
  categories,
  accounts,
  buckets,
  onSave,
}: {
  rule: RecurringRule;
  currencyCode: string;
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  buckets: { id: string; name: string }[];
  onSave: (rule: RecurringRule) => void;
}) {
  const [draft, setDraft] = useState<RecurringRule>(rule);
  const set = (patch: Partial<RecurringRule>) => setDraft((prev) => ({ ...prev, ...patch }));

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="rule-name">Nome</Label>
        <Input id="rule-name" value={draft.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} placeholder="Netflix, Renda, Ginásio" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rule-amount">Valor</Label>
        <Input
          id="rule-amount"
          inputMode="decimal"
          value={draft.amountMinor ? String(draft.amountMinor / 100) : ""}
          onChange={(e) => set({ amountMinor: toMinorUnits(e.target.value, currencyCode) })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Tipo" value={draft.kind} onChange={(v) => set({ kind: v as RecurringRule["kind"] })}
          options={[{ value: "expense", label: "Despesa" }, { value: "income", label: "Entrada" }]} />
        <Select label="Frequência" value={draft.frequency} onChange={(v) => set({ frequency: v as Frequency })}
          options={FREQUENCIES.map((f) => ({ value: f.value, label: f.label }))} />
      </div>

      {draft.frequency === "custom" ? (
        <div className="space-y-1.5">
          <Label htmlFor="interval">Intervalo em dias</Label>
          <Input id="interval" inputMode="numeric" value={String(draft.customIntervalDays ?? 30)}
            onChange={(e) => set({ customIntervalDays: Number(e.target.value.replace(/\D/g, "")) || 30 })} />
        </div>
      ) : null}

      <Select label="Categoria" value={draft.categoryId ?? ""} onChange={(v) => set({ categoryId: v || undefined })}
        options={categories.map((c) => ({ value: c.id, label: c.name }))} />
      <Select label="Conta" value={draft.accountId ?? ""} onChange={(v) => set({ accountId: v || undefined })}
        options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
      {draft.kind === "expense" ? (
        <Select label="Propósito" value={draft.bucketId ?? ""} onChange={(v) => set({ bucketId: v || undefined })}
          options={buckets.map((b) => ({ value: b.id, label: b.name }))} />
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="start">Início</Label>
          <Input id="start" type="date" value={draft.startDate.slice(0, 10)}
            onChange={(e) => set({ startDate: new Date(e.target.value).toISOString() })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end">Fim (opcional)</Label>
          <Input id="end" type="date" value={draft.endDate?.slice(0, 10) ?? ""}
            onChange={(e) => set({ endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
        <span className="text-sm">
          Registar automaticamente
          <span className="block text-xs text-muted-foreground">Por omissão apenas recebes um lembrete.</span>
        </span>
        <Switch checked={draft.mode === "auto"} onCheckedChange={(checked) => set({ mode: checked ? "auto" : "reminder" })} />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
        <span className="text-sm">É uma subscrição</span>
        <Switch checked={Boolean(draft.isSubscription)} onCheckedChange={(checked) => set({ isSubscription: checked })} />
      </div>

      <Button
        className="w-full"
        disabled={!draft.name.trim() || draft.amountMinor <= 0}
        onClick={() => onSave(draft)}
      >
        Guardar
      </Button>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = `rule-${label.toLowerCase().replace(/\s/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
      >
        <option value="">Selecionar</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
