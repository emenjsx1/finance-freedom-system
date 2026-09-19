import { Symbol, symbolLabel } from "@/lib/icons/symbols";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSetup } from "@/hooks/use-setup";
import { newId } from "@/hooks/use-ledger";
import { upsertAccount } from "@/lib/finance/setup-ops";
import { ACCOUNT_ICONS, WALLET_COLORS } from "@/lib/finance/wallet-config";
import { SUPPORTED_CURRENCIES, toMinorUnits, fromMinorUnits } from "@/lib/finance/currency";
import { ACCOUNT_TYPE_LABELS, type Account, type AccountType } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

export function AccountForm({
  open,
  account,
  onOpenChange,
}: {
  open: boolean;
  account?: Account | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const { setup, update } = useSetup();
  const [form, setForm] = useState(() => initial(account, setup.currencyCode));

  useEffect(() => {
    if (open) setForm(initial(account, setup.currencyCode));
  }, [open, account, setup.currencyCode]);

  function save() {
    if (!form.name.trim()) return;
    const next: Account = {
      id: account?.id ?? newId(),
      name: form.name.trim(),
      type: form.type,
      currencyCode: form.currencyCode,
      balanceMinor: toMinorUnits(form.startingBalance || "0", form.currencyCode),
      institution: form.institution.trim() || undefined,
      last4: form.last4.replace(/\D/g, "").slice(-4) || undefined,
      icon: form.icon,
      color: form.color,
      includeInNetWorth: form.includeInNetWorth,
      notes: form.notes.trim() || undefined,
      archived: account?.archived ?? false,
      order: account?.order,
      isDefaultSpending: form.isDefaultSpending,
      isDefaultIncome: form.isDefaultIncome,
      ...(form.threshold ? { lowBalanceThresholdMinor: toMinorUnits(form.threshold, form.currencyCode) } : {}),
    };
    update(upsertAccount(setup, next));
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl lg:max-w-lg">
        <SheetHeader className="px-0">
          <SheetTitle>{account ? "Editar conta" : "Nova conta"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          <Field label="Nome da conta" htmlFor="acc-name">
            <Input
              id="acc-name"
              value={form.name}
              placeholder="BIM, M-Pesa, Dinheiro..."
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>

          <Field label="Tipo" htmlFor="acc-type">
            <select
              id="acc-type"
              className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType }))}
            >
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {form.type === "credit" ? (
              <p className="mt-1 text-xs text-warning">
                As contas de crédito ainda não têm contabilidade de dívida. Guardamos o tipo para já.
              </p>
            ) : null}
          </Field>

          <Field label="Moeda" htmlFor="acc-currency">
            <select
              id="acc-currency"
              className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
              value={form.currencyCode}
              onChange={(e) => setForm((f) => ({ ...f, currencyCode: e.target.value }))}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Saldo inicial" htmlFor="acc-balance">
            <Input
              id="acc-balance"
              inputMode="decimal"
              value={form.startingBalance}
              onChange={(e) => setForm((f) => ({ ...f, startingBalance: e.target.value.replace(/[^\d.,]/g, "") }))}
            />
          </Field>

          <Field label="Instituição (opcional)" htmlFor="acc-inst">
            <Input
              id="acc-inst"
              value={form.institution}
              onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
            />
          </Field>

          <Field label="Últimos 4 dígitos (opcional)" htmlFor="acc-last4">
            <Input
              id="acc-last4"
              inputMode="numeric"
              maxLength={4}
              value={form.last4}
              onChange={(e) => setForm((f) => ({ ...f, last4: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Nunca peças nem guardes números completos, PIN ou senhas.
            </p>
          </Field>

          <Field label="Ícone">
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_ICONS.map((icon) => (
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

          <ToggleRow
            label="Incluir no património"
            checked={form.includeInNetWorth}
            onChange={(v) => setForm((f) => ({ ...f, includeInNetWorth: v }))}
          />
          <ToggleRow
            label="Conta preferida para gastos"
            description="Apenas uma sugestão no registo rápido."
            checked={form.isDefaultSpending}
            onChange={(v) => setForm((f) => ({ ...f, isDefaultSpending: v }))}
          />
          <ToggleRow
            label="Conta preferida para entradas"
            checked={form.isDefaultIncome}
            onChange={(v) => setForm((f) => ({ ...f, isDefaultIncome: v }))}
          />

          <Field label="Avisar-me abaixo de" htmlFor="acc-threshold">
            <Input
              id="acc-threshold"
              inputMode="decimal"
              value={form.threshold}
              onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value.replace(/[^\d.,]/g, "") }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Deixa vazio para não receber avisos desta conta.
            </p>
          </Field>

          <Field label="Notas (opcional)" htmlFor="acc-notes">
            <Textarea
              id="acc-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value.slice(0, 300) }))}
            />
          </Field>

          <Button className="w-full" onClick={save} disabled={!form.name.trim()}>
            {account ? "Guardar alterações" : "Adicionar conta"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function initial(account: Account | undefined, baseCurrency: string) {
  return {
    name: account?.name ?? "",
    type: (account?.type ?? "bank") as AccountType,
    currencyCode: account?.currencyCode ?? baseCurrency,
    startingBalance: account
      ? String(fromMinorUnits(account.balanceMinor, account.currencyCode ?? baseCurrency))
      : "",
    institution: account?.institution ?? "",
    last4: account?.last4 ?? "",
    icon: account?.icon ?? "bank",
    color: account?.color ?? WALLET_COLORS[0]!,
    includeInNetWorth: account?.includeInNetWorth ?? true,
    notes: account?.notes ?? "",
    isDefaultSpending: Boolean(account?.isDefaultSpending),
    isDefaultIncome: Boolean(account?.isDefaultIncome),
    threshold: account?.lowBalanceThresholdMinor
      ? String(fromMinorUnits(account.lowBalanceThresholdMinor, account.currencyCode ?? baseCurrency))
      : "",
  };
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-surface px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
