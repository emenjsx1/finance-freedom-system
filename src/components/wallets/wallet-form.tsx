import { useEffect, useState } from "react";

import { Field, ToggleRow } from "@/components/accounts/account-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { newId } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { upsertWallet } from "@/lib/finance/setup-ops";
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
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
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
                  aria-label={`Ícone ${icon}`}
                  aria-pressed={form.icon === icon}
                  onClick={() => setForm((f) => ({ ...f, icon }))}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl border text-lg",
                    form.icon === icon ? "border-primary bg-primary-soft" : "border-border",
                  )}
                >
                  {icon}
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
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
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
    color: wallet?.color ?? WALLET_COLORS[0]!,
    ...behaviour,
  };
}
