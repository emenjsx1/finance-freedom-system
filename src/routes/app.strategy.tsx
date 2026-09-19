import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { NativeSheet } from "@/components/design/native-sheet";
import { SectionHeader } from "@/components/design/section-header";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { AmountInput } from "@/components/transactions/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
import { useSetup } from "@/hooks/use-setup";
import { percentageConflict, suggestOrganization } from "@/lib/personal/engine";
import { STRATEGY_TEMPLATES, type StrategyTemplate } from "@/lib/personal/strategies";
import { RULE_METHOD_LABELS, type RuleMethod, type StrategyMode } from "@/lib/personal/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/strategy")({
  head: () => ({
    meta: [
      { title: "Estratégia — Norte" },
      { name: "description", content: "Como queres organizar o dinheiro que entra." },
      { property: "og:title", content: "Estratégia — Norte" },
      { property: "og:description", content: "Escolhe uma forma de organizar, ou não uses nenhuma." },
    ],
  }),
  component: StrategyPage,
});

const MODE_LABELS: Record<StrategyMode, string> = {
  none: "Não organizar",
  manual: "Só quando eu pedir",
  suggest: "Sugerir e eu decido",
  automatic: "Organizar automaticamente",
  paused: "Em pausa",
};

function StrategyPage() {
  const { state, applyTemplate, updateStrategy, upsertRule, removeRule, clearStrategy } = usePersonal();
  const { setup } = useSetup();
  const { snapshot } = useLedger();
  const [gallery, setGallery] = useState(false);
  const [simulation, setSimulation] = useState(50_000_00);

  const strategy = state.strategy;
  const conflict = strategy ? percentageConflict(strategy.rules) : null;
  const preview = suggestOrganization(strategy, simulation, {
    availableBeforeMinor: snapshot.spendableMinor,
    balanceFor: (rule) =>
      rule.targetId ? (snapshot.wallets.find((w) => w.id === rule.targetId)?.balanceMinor ?? 0) : 0,
  });

  function choose(template: StrategyTemplate) {
    applyTemplate(template);
    setGallery(false);
    toast.success("Estratégia aplicada. Só afeta o dinheiro que entrar a partir de agora.");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Estratégia"
        subtitle="Como queres organizar o dinheiro que entra. Podes não ter nenhuma."
        action={
          <Button size="sm" variant="secondary" onClick={() => setGallery(true)}>
            Ver formas
          </Button>
        }
      />

      {!strategy ? (
        <section className="card-standard text-center">
          <h2 className="type-section">Ainda não escolheste uma forma de organizar.</h2>
          <p className="type-secondary mt-2">
            Podes continuar a decidir manualmente sempre que entra dinheiro. Nenhuma forma é melhor
            do que outra.
          </p>
          <Button className="mt-5" onClick={() => setGallery(true)}>
            Ver formas de organizar
          </Button>
          <p className="type-secondary mt-6">
            A estratégia é sobre dinheiro novo. Para organizar o que já tens:
          </p>
          <Button variant="secondary" className="mt-3" asChild>
            <Link to="/app/organize">Ajuda-me a organizar</Link>
          </Button>
        </section>
      ) : (
        <>
          <section className="card-standard">
            <h2 className="type-section">{strategy.name}</h2>
            <p className="type-secondary mt-1">{strategy.description}</p>

            <div className="mt-5 space-y-2">
              <Label>O que queres que aconteça</Label>
              <Select
                value={strategy.mode}
                onValueChange={(value) => updateStrategy({ mode: value as StrategyMode })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MODE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="type-meta">
                Mesmo em automático, qualquer movimento de dinheiro continua a ser confirmado por ti.
              </p>
            </div>
          </section>

          {conflict ? (
            <p className="card-standard type-secondary">
              As percentagens somam {conflict}%. Podes manter assim, mas parte do dinheiro vai ficar
              por distribuir de forma diferente do que esperas.
            </p>
          ) : null}

          <section>
            <SectionHeader title="Regras" />
            <div className="space-y-3">
              {strategy.rules
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((rule) => (
                  <div key={rule.id} className="card-compact space-y-3">
                    <div className="flex items-center gap-3">
                      <Input
                        value={rule.label}
                        onChange={(e) => upsertRule({ ...rule, label: e.target.value })}
                        aria-label="Nome da regra"
                      />
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(enabled) => upsertRule({ ...rule, enabled })}
                        aria-label="Regra ativa"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={rule.method}
                        onValueChange={(value) => upsertRule({ ...rule, method: value as RuleMethod })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(RULE_METHOD_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {rule.method === "percentage" ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={rule.value}
                            onChange={(e) => upsertRule({ ...rule, value: Number(e.target.value) })}
                            className="w-20"
                            aria-label="Percentagem"
                          />
                          <span className="type-meta">%</span>
                        </div>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remover regra"
                        onClick={() => removeRule(rule.id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                ))}
              {strategy.rules.length === 0 ? (
                <p className="card-compact type-meta">Esta estratégia não tem regras.</p>
              ) : null}
            </div>
          </section>

          <section className="card-standard">
            <SectionHeader title="Se entrarem…" />
            <AmountInput
              valueMinor={simulation}
              onChange={setSimulation}
              currencyCode={setup.currencyCode}
              label="Valor de entrada"
            />
            <ul className="mt-4 space-y-2">
              {preview.lines.map((line) => (
                <li key={line.ruleId} className="flex items-center justify-between gap-4">
                  <span className="type-secondary">{line.label}</span>
                  <Money minor={line.amountMinor} options={{ compactDecimals: true }} />
                </li>
              ))}
              <li className="flex items-center justify-between gap-4">
                <span className="type-secondary">Fica disponível</span>
                <Money minor={preview.leftoverMinor} options={{ compactDecimals: true }} />
              </li>
            </ul>
            <p className="type-meta mt-3">
              Simulação. Nenhum valor é movido aqui.
            </p>
          </section>

          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              clearStrategy();
              toast.success("Estratégia removida. O dinheiro já organizado fica como está.");
            }}
          >
            Deixar de usar uma estratégia
          </Button>
        </>
      )}

      <NativeSheet open={gallery} onOpenChange={setGallery} title="Formas de organizar">
        <div className="space-y-3">
          {STRATEGY_TEMPLATES.map((template) => (
            <button
              key={template.key}
              type="button"
              onClick={() => choose(template)}
              className={cn(
                "card-compact w-full text-left",
                strategy?.templateKey === template.key && "ring-2 ring-primary",
              )}
            >
              <p className="text-sm font-medium">{template.name}</p>
              <p className="type-meta mt-1">{template.philosophy}</p>
              <p className="type-meta mt-1 opacity-80">{template.howItWorks}</p>
            </button>
          ))}
        </div>
      </NativeSheet>
    </div>
  );
}
