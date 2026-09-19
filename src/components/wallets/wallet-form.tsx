import { Symbol, symbolLabel } from "@/lib/icons/symbols";
import { useEffect, useState } from "react";

import { Field, ToggleRow } from "@/components/accounts/account-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { newId } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { upsertWallet } from "@/lib/finance/setup-ops";
import { fromMinorUnits, toMinorUnits } from "@/lib/finance/currency";
import {
  PROTECTION_LEVEL_LABELS,
  WALLET_COLORS,
  WALLET_ICONS,
  walletBehaviour,
} from "@/lib/finance/wallet-config";
import type { AllocationRuleItem, BucketKind, ProtectionLevel } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

const KIND_LABELS: Record<BucketKind, string> = {
  protected: "Protegido",
  wealth: "Construção de património",
  goals: "Objetivos",
  life: "Vida",
  family: "Família",
  free: "Livre",
};

export function WalletForm({
  open,
  wallet,
  onOpenChange,
}: {
  open: boolean;
  wallet?: AllocationRuleItem | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const { setup, update } = useSetup();
  const [form, setForm] = useState(() => initial(wallet));

  useEffect(() => {
    if (open) setForm(initial(wallet));
  }, [open, wallet]);

  function save() {
    if (!form.name.trim()) return;
    const next: AllocationRuleItem = {
      id: wallet?.id ?? newId(),
      name: form.name.trim(),
      percentage: Number(form.percentage) || 0,
      icon: form.icon,
      kind: form.kind,
      spendable: form.spendable,
      wealthBuilding: form.wealthBuilding,
      protectionLevel: form.protectionLevel,
      includedInAvailable: form.includedInAvailable,
      color: form.color,
      order: wallet?.order,
      archived: wallet?.archived ?? false,
      ...(form.target ? { targetMinor: toMinorUnits(form.target, setup.currencyCode) } : {}),
      ...(form.targetDate ? { targetDate: new Date(form.targetDate).toISOString() } : {}),
      ...(form.monthlyPlan ? { monthlyPlanMinor: toMinorUnits(form.monthlyPlan, setup.currencyCode) } : {}),
      ...(form.threshold ? { lowBalanceThresholdMinor: toMinorUnits(form.threshold, setup.currencyCode) } : {}),
    };
    update(upsertWallet(setup, next));
    onOpenChange(false);
  }

  const totalPercent =
    setup.ruleItems
      .filter((item) => item.id !== wallet?.id && !item.archived)
      .reduce((sum, item) => sum + item.percentage, 0) + (Number(form.percentage) || 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl lg:max-w-lg">
        <SheetHeader className="px-0">
          <SheetTitle>{wallet ? "Editar carteira" : "Nova carteira"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          <Field label="Nome" htmlFor="w-name">
            <Input
              id="w-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>

          <Field label="Tipo de propósito" htmlFor="w-kind">
            <select
              id="w-kind"
              className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as BucketKind }))}
            >
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Percentagem da regra" htmlFor="w-pct">
            <Input
              id="w-pct"
              inputMode="decimal"
              value={form.percentage}
              onChange={(e) => setForm((f) => ({ ...f, percentage: e.target.value.replace(/[^\d.,]/g, "") }))}
            />
            <p className={cn("mt-1 text-xs", totalPercent === 100 ? "text-muted-foreground" : "text-warning")}>
              Total da regra: {totalPercent.toFixed(0)}%
              {totalPercent === 100 ? "" : " — a regra só distribui entradas quando soma 100%."}
            </p>
          </Field>

          <Field label="Ícone">
            <div className="flex flex-wrap gap-2">
              {WALLET_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  aria-label={`Ícone ${symbolLabel(icon)}`}
                  aria-pressed={form.icon === icon}
                  onClick={() => setForm((f) => ({ ...f, icon }))}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl border",
                    form.icon === icon ? "border-primary bg-primary-soft" : "border-border/70",
                  )}
                >
                  <Symbol name={icon} />
                </button>
              ))}
            </div>
          </Field>

          <Field label="Identificador visual">
            <div className="flex flex-wrap gap-2">
              {WALLET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Cor ${color}`}
                  aria-pressed={form.color === color}
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className={cn(
                    "size-8 rounded-full border-2",
                    form.color === color ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </Field>

          <Field label="Nível de proteção" htmlFor="w-prot">
            <select
              id="w-prot"
              className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
              value={form.protectionLevel}
              onChange={(e) => setForm((f) => ({ ...f, protectionLevel: e.target.value as ProtectionLevel }))}
            >
              {Object.entries(PROTECTION_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Proteger pede um motivo antes de tirar dinheiro. O dinheiro continua acessível.
            </p>
          </Field>

          {form.kind === "goals" ? (
            <>
              <Field label="Valor do objetivo" htmlFor="w-target">
                <Input
                  id="w-target"
                  inputMode="decimal"
                  value={form.target}
                  onChange={(e) => setForm((f) => ({ ...f, target: e.target.value.replace(/[^\d.,]/g, "") }))}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Serve para acompanhar o progresso e avisar-te nos marcos. Não move dinheiro.
                </p>
              </Field>
              <Field label="Data desejada" htmlFor="w-target-date">
                <Input
                  id="w-target-date"
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                />
              </Field>
              <Field label="Contribuição mensal planeada" htmlFor="w-plan">
                <Input
                  id="w-plan"
                  inputMode="decimal"
                  value={form.monthlyPlan}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyPlan: e.target.value.replace(/[^\d.,]/g, "") }))}
                />
              </Field>
            </>
          ) : null}

          <Field label="Avisar-me abaixo de" htmlFor="w-threshold">
            <Input
              id="w-threshold"
              inputMode="decimal"
              value={form.threshold}
              onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value.replace(/[^\d.,]/g, "") }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Deixa vazio para não receber avisos. A app nunca define um limite por ti.
            </p>
          </Field>

          <ToggleRow
            label="Pode ser gasto"
            checked={form.spendable}
            onChange={(v) => setForm((f) => ({ ...f, spendable: v }))}
          />
          <ToggleRow
            label="Entra no disponível para gastar"
            checked={form.includedInAvailable}
            onChange={(v) => setForm((f) => ({ ...f, includedInAvailable: v }))}
          />
          <ToggleRow
            label="Constrói património"
            checked={form.wealthBuilding}
            onChange={(v) => setForm((f) => ({ ...f, wealthBuilding: v }))}
          />

          <Button className="w-full" onClick={save} disabled={!form.name.trim()}>
            {wallet ? "Guardar alterações" : "Criar carteira"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function initial(wallet: AllocationRuleItem | undefined) {
  const behaviour = wallet
    ? walletBehaviour(wallet)
    : { spendable: true, wealthBuilding: false, protectionLevel: "normal" as ProtectionLevel, includedInAvailable: true };
  return {
    name: wallet?.name ?? "",
    kind: (wallet?.kind ?? "free") as BucketKind,
    percentage: wallet ? String(wallet.percentage) : "0",
    icon: wallet?.icon ?? "✨",
    target: wallet?.targetMinor ? String(fromMinorUnits(wallet.targetMinor, "MZN")) : "",
    targetDate: wallet?.targetDate ? wallet.targetDate.slice(0, 10) : "",
    monthlyPlan: wallet?.monthlyPlanMinor ? String(fromMinorUnits(wallet.monthlyPlanMinor, "MZN")) : "",
    threshold: wallet?.lowBalanceThresholdMinor ? String(fromMinorUnits(wallet.lowBalanceThresholdMinor, "MZN")) : "",
    color: wallet?.color ?? WALLET_COLORS[0]!,
    ...behaviour,
  };
}
