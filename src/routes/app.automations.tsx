import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { History, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { newId } from "@/hooks/use-ledger";
import { useNotifications } from "@/hooks/use-notifications";
import { useSetup } from "@/hooks/use-setup";
import { toMinorUnits } from "@/lib/finance/currency";
import { relativeTime } from "@/lib/notifications/time";
import {
  ACTION_LABELS,
  FINANCIAL_ACTIONS,
  OUTCOME_LABELS,
  TRIGGER_LABELS,
  type AutomationActionKind,
  type AutomationRule,
  type AutomationTriggerKind,
} from "@/lib/automations/types";

export const Route = createFileRoute("/app/automations")({
  head: () => ({
    meta: [
      { title: "Automações — Finance OS" },
      { name: "description", content: "Regras simples que tratam do que é repetitivo, sem mexer no teu dinheiro sem confirmação." },
      { property: "og:title", content: "Automações — Finance OS" },
      { property: "og:description", content: "Regras simples: quando acontece isto, faz aquilo." },
    ],
  }),
  component: AutomationsPage,
});

const CUSTOM_TRIGGERS: AutomationTriggerKind[] = [
  "unallocated_money",
  "wallet_below_threshold",
  "schedule_monthly",
];

function AutomationsPage() {
  const { state, upsertAutomation, deleteAutomation, retryAutomation } = useNotifications();
  const { setup } = useSetup();
  const [trigger, setTrigger] = useState<AutomationTriggerKind>("unallocated_money");
  const [walletId, setWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  function createAutomation() {
    const rule: AutomationRule = {
      id: newId(),
      name: message.trim() || TRIGGER_LABELS[trigger],
      enabled: true,
      trigger: { kind: trigger, ...(walletId ? { walletId } : {}), ...(trigger === "schedule_monthly" ? { day: 1, time: "09:00" } : {}) },
      condition: amount ? { minAmountMinor: toMinorUnits(amount, setup.currencyCode) } : {},
      action: { kind: "notify", ...(message.trim() ? { message: message.trim() } : {}) },
      createdAt: new Date().toISOString(),
    };
    upsertAutomation(rule);
    setMessage("");
    setAmount("");
    toast.success("Automação criada.");
  }

  const templates = state.automations.filter((a) => a.templateId);
  const custom = state.automations.filter((a) => !a.templateId);

  return (
    <div className="pb-8">
      <PageHeader
        title="Automações"
        subtitle="Quando acontece isto, faz aquilo. Movimentos de dinheiro só depois de confirmares."
      />

      <Tabs defaultValue="rules">
        <TabsList className="mb-4">
          <TabsTrigger value="rules">Regras</TabsTrigger>
          <TabsTrigger value="new">Nova</TabsTrigger>
          <TabsTrigger value="log">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-2">
          {templates.map((rule) => (
            <RuleCard key={rule.id} rule={rule} onToggle={(v) => upsertAutomation({ ...rule, enabled: v })} />
          ))}
          {custom.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={(v) => upsertAutomation({ ...rule, enabled: v })}
              onDelete={() => deleteAutomation(rule.id)}
            />
          ))}
        </TabsContent>

        <TabsContent value="new">
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
            <div>
              <Label className="type-meta mb-1 block">Quando</Label>
              <select
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value as AutomationTriggerKind)}
              >
                {CUSTOM_TRIGGERS.map((key) => (
                  <option key={key} value={key}>
                    {TRIGGER_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            {trigger === "wallet_below_threshold" ? (
              <div>
                <Label className="type-meta mb-1 block">Carteira</Label>
                <select
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                >
                  <option value="">Escolher…</option>
                  {setup.ruleItems.filter((w) => !w.archived).map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name}
                    </option>
                  ))}
                </select>
                <p className="type-meta mt-1">O limite é o que definires na carteira.</p>
              </div>
            ) : null}

            {trigger === "unallocated_money" ? (
              <div>
                <Label className="type-meta mb-1 block">Só acima de</Label>
                <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
              </div>
            ) : null}

            <div>
              <Label className="type-meta mb-1 block">Então, avisa-me com</Label>
              <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensagem (opcional)" />
            </div>

            <p className="type-meta">
              Nesta fase, uma automação criada por ti só pode notificar-te. Preparar dinheiro continua a exigir
              confirmação tua.
            </p>

            <Button onClick={createAutomation}>
              <Plus className="size-4" />
              Criar automação
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="log" className="space-y-2">
          {state.runs.length === 0 ? (
            <p className="type-meta">Ainda não há histórico.</p>
          ) : (
            state.runs.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{entry.automationName}</p>
                  <span className="type-meta">{relativeTime(entry.at)}</span>
                </div>
                <p className="type-meta mt-0.5">
                  {OUTCOME_LABELS[entry.outcome]} · {entry.detail}
                </p>
                {entry.outcome === "failed" ? (
                  <Button size="xs" variant="secondary" className="mt-2" onClick={() => retryAutomation(entry.id)}>
                    Tentar novamente
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RuleCard({
  rule,
  onToggle,
  onDelete,
}: {
  rule: AutomationRule;
  onToggle: (value: boolean) => void;
  onDelete?: () => void;
}) {
  const financial = FINANCIAL_ACTIONS.includes(rule.action.kind as AutomationActionKind);
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
      <span className="mt-0.5 text-muted-foreground">
        {rule.trigger.kind.startsWith("schedule") ? <History className="size-4" /> : <Zap className="size-4" />}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">{rule.name}</p>
        <p className="type-meta mt-0.5">
          {TRIGGER_LABELS[rule.trigger.kind]} → {ACTION_LABELS[rule.action.kind]}
        </p>
        {financial ? (
          <p className="type-meta mt-1 text-primary">Prepara, nunca executa sozinha.</p>
        ) : null}
        {rule.lastRunAt ? <p className="type-meta mt-1">Última vez {relativeTime(rule.lastRunAt)}</p> : null}
      </div>
      <div className="flex items-center gap-1">
        {onDelete ? (
          <Button size="icon" variant="ghost" aria-label="Apagar" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        ) : null}
        <Switch checked={rule.enabled} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}
