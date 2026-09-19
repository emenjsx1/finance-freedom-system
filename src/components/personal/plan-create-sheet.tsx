import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { AmountInput } from "@/components/transactions/amount-input";
import { NativeSheet } from "@/components/design/native-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePersonal } from "@/hooks/use-personal";
import { useSetup } from "@/hooks/use-setup";
import { Symbol } from "@/lib/icons/symbols";
import {
  PLAN_PRIORITY_LABELS,
  PLAN_TYPE_LABELS,
  PLAN_TYPE_SYMBOL,
  type PlanPriority,
  type PlanType,
} from "@/lib/personal/types";
import { cn } from "@/lib/utils";

const TYPES: PlanType[] = [
  "travel",
  "purchase",
  "home",
  "car",
  "education",
  "business",
  "emergency",
  "personal",
  "family",
  "custom",
];

const PRIORITIES: PlanPriority[] = ["now", "important", "later"];

/** Three short steps. Nothing else is asked up front. */
export function PlanCreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { createPlan } = usePersonal();
  const { setup } = useSetup();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<PlanType>("travel");
  const [name, setName] = useState("");
  const [financial, setFinancial] = useState(true);
  const [targetMinor, setTargetMinor] = useState(0);
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState<PlanPriority>("important");
  const [idea, setIdea] = useState(false);

  function reset() {
    setStep(0);
    setType("travel");
    setName("");
    setFinancial(true);
    setTargetMinor(0);
    setTargetDate("");
    setPriority("important");
    setIdea(false);
  }

  function submit() {
    const plan = createPlan({
      name: name.trim(),
      type,
      status: idea ? "idea" : "active",
      priority,
      financial,
      symbol: PLAN_TYPE_SYMBOL[type],
      ...(financial && targetMinor > 0 ? { targetMinor } : {}),
      ...(targetDate ? { targetDate: new Date(targetDate).toISOString() } : {}),
      funding: "manual",
    });
    onOpenChange(false);
    reset();
    void navigate({ to: "/app/plans/$planId", params: { planId: plan.id } });
  }

  return (
    <NativeSheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
      title="Novo plano"
    >
      {step === 0 ? (
        <div>
          <p className="type-secondary">O que estás a planear?</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {TYPES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setType(option);
                  setStep(1);
                }}
                className={cn(
                  "card-compact flex items-center gap-3 text-left",
                  type === option && "ring-2 ring-primary",
                )}
              >
                <span className="icon-tile" aria-hidden>
                  <Symbol name={PLAN_TYPE_SYMBOL[option]} />
                </span>
                <span className="text-sm">{PLAN_TYPE_LABELS[option]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Como se chama?</Label>
            <Input
              id="plan-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="Turquia, carro, reserva…"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Envolve dinheiro</p>
              <p className="type-meta">Podes ter planos sem valor associado.</p>
            </div>
            <Switch checked={financial} onCheckedChange={setFinancial} aria-label="Plano financeiro" />
          </div>

          {financial ? (
            <div className="space-y-2">
              <Label>Quanto custa?</Label>
              <AmountInput valueMinor={targetMinor} onChange={setTargetMinor} currencyCode={setup.currencyCode} label="Quanto custa" />
            </div>
          ) : null}

          <Button className="w-full" disabled={!name.trim()} onClick={() => setStep(2)}>
            Continuar
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="plan-date">Para quando? (opcional)</Label>
            <Input
              id="plan-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Que importância tem agora?</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPriority(option)}
                  className={cn(
                    "card-compact text-sm",
                    priority === option && "ring-2 ring-primary",
                  )}
                >
                  {PLAN_PRIORITY_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Guardar só como ideia</p>
              <p className="type-meta">Sem compromisso. Podes ativar mais tarde.</p>
            </div>
            <Switch checked={idea} onCheckedChange={setIdea} aria-label="Guardar como ideia" />
          </div>

          <Button className="w-full" onClick={submit}>
            Criar plano
          </Button>
        </div>
      ) : null}
    </NativeSheet>
  );
}
