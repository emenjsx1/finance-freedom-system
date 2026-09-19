import { useState } from "react";
import { toast } from "sonner";

import { NativeSheet } from "@/components/design/native-sheet";
import { AmountInput } from "@/components/transactions/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { newId } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { upsertWallet } from "@/lib/finance/setup-ops";
import { GOAL_SYMBOLS, Symbol, symbolLabel } from "@/lib/icons/symbols";
import { cn } from "@/lib/utils";

const PLANS: { icon: string; label: string }[] = [
  { icon: "travel", label: "Viagem" },
  { icon: "home", label: "Casa" },
  { icon: "car", label: "Carro" },
  { icon: "emergency", label: "Emergência" },
  { icon: "education", label: "Educação" },
  { icon: "business", label: "Negócio" },
  { icon: "technology", label: "Tecnologia" },
  { icon: "family", label: "Família" },
  { icon: "savings", label: "Poupança" },
  { icon: "target", label: "Outro" },
];

/** Three short steps, never a questionnaire. */
export function GoalCreateSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const { setup, update } = useSetup();
  const [step, setStep] = useState(0);
  const [icon, setIcon] = useState("travel");
  const [kindLabel, setKindLabel] = useState("Viagem");
  const [name, setName] = useState("");
  const [targetMinor, setTargetMinor] = useState(0);
  const [targetDate, setTargetDate] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  function reset() {
    setStep(0);
    setIcon("travel");
    setKindLabel("Viagem");
    setName("");
    setTargetMinor(0);
    setTargetDate("");
    setCoverImageUrl("");
  }

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  function create() {
    const id = newId();
    update(
      upsertWallet(setup, {
        id,
        name: name.trim(),
        percentage: 0,
        icon,
        kind: "goals",
        ...(targetMinor > 0 ? { targetMinor } : {}),
        ...(targetDate ? { targetDate } : {}),
        ...(coverImageUrl.trim() ? { coverImageUrl: coverImageUrl.trim() } : {}),
      }),
    );
    toast.success("Objetivo criado", { description: "Guarda dinheiro para começar a construí-lo." });
    close(false);
    onCreated?.(id);
  }

  const titles = ["O que estás a planear?", "Dá-lhe nome e valor", "Quando e como o vês"];

  return (
    <NativeSheet open={open} onOpenChange={close} title={titles[step] ?? titles[0]!}>
      {step === 0 ? (
        <div className="grid grid-cols-3 gap-2 pb-4 pt-2">
          {PLANS.map((plan) => (
            <button
              key={plan.label}
              type="button"
              onClick={() => {
                setIcon(plan.icon);
                setKindLabel(plan.label);
                setStep(1);
              }}
              className="flex flex-col items-center gap-2 rounded-[var(--r-lg)] border border-border/70 bg-surface px-2 py-4 text-sm"
            >
              <Symbol name={plan.icon} className="size-5 text-primary" />
              {plan.label}
            </button>
          ))}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4 pb-4 pt-2">
          <div>
            <label className="type-caption" htmlFor="goal-name">
              Nome
            </label>
            <Input
              id="goal-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Turquia"
              className="mt-1"
            />
          </div>
          <div>
            <p className="type-caption">Quanto custa</p>
            <AmountInput valueMinor={targetMinor} onChange={setTargetMinor} currencyCode={setup.currencyCode} label="Valor-alvo" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>
              Voltar
            </Button>
            <Button className="flex-1" disabled={!name.trim()} onClick={() => setStep(2)}>
              Continuar
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4 pb-4 pt-2">
          <div>
            <label className="type-caption" htmlFor="goal-date">
              Data-alvo <span className="font-normal normal-case">(opcional)</span>
            </label>
            <Input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <p className="type-caption">Símbolo</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {GOAL_SYMBOLS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={symbolLabel(key)}
                  aria-pressed={icon === key}
                  onClick={() => setIcon(key)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl border",
                    icon === key ? "border-primary bg-primary-soft text-primary" : "border-border/70",
                  )}
                >
                  <Symbol name={key} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="type-caption" htmlFor="goal-cover">
              Imagem de capa <span className="font-normal normal-case">(opcional)</span>
            </label>
            <Input
              id="goal-cover"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button className="flex-1" onClick={create}>
              Criar objetivo
            </Button>
          </div>
        </div>
      ) : null}
    </NativeSheet>
  );
}
