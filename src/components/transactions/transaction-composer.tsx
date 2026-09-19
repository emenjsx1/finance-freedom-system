import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AmountInput } from "@/components/transactions/amount-input";
import { AttachmentsField } from "@/components/transactions/attachments-field";
import { CategoryPicker } from "@/components/transactions/category-picker";
import { haptic, newId, useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { findCategory } from "@/lib/finance/categories";
import { formatMoney } from "@/lib/finance/currency";
import {
  allocationsTotal,
  largeExpenseRatio,
  previewAllocation,
  suggestFromHistory,
} from "@/lib/finance/engine";
import { debitWalletError } from "@/lib/finance/integrity";
import { isProtectedWallet } from "@/lib/finance/wallet-config";
import type { Allocation, Attachment, MoneyType, Transaction, TxKind } from "@/lib/finance/ledger-types";
import { cn } from "@/lib/utils";
import { Symbol } from "@/lib/icons/symbols";

export interface ComposerOptions {
  kind: TxKind;
  /** Ultra-fast mode: amount + category, defaults applied from history. */
  quick?: boolean;
  /** Editing or duplicating an existing transaction. */
  base?: Transaction;
  editingId?: string;
  /** Prefill from context, e.g. saving straight into a specific goal. */
  preset?: { toBucketId?: string; bucketId?: string; accountId?: string };
}

function localInputValue(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TransactionComposer({
  options,
  onDone,
}: {
  options: ComposerOptions;
  onDone: () => void;
}) {
  const { kind, quick, base, editingId, preset } = options;
  const { setup } = useSetup();
  const { ledger, snapshot, addTransaction, updateTransaction } = useLedger();
  const currency = setup.currencyCode;

  const suggestions = useMemo(
    () => suggestFromHistory(ledger.transactions, kind === "income" ? "income" : "expense"),
    [ledger.transactions, kind],
  );

  // Stable id from the start so receipts are filed under the right movement.
  const [txId] = useState(() => editingId ?? newId());
  const [stage, setStage] = useState<"form" | "confirm">("form");
  const [submitting, setSubmitting] = useState(false);
  const [acknowledgedLarge, setAcknowledgedLarge] = useState(false);
  const [protectedReason, setProtectedReason] = useState("");
  const [protectedAck, setProtectedAck] = useState(false);

  const [amountMinor, setAmountMinor] = useState(base?.amountMinor ?? 0);
  const [categoryId, setCategoryId] = useState<string | undefined>(base?.categoryId);
  const [accountId, setAccountId] = useState<string | undefined>(
    base?.accountId ?? preset?.accountId ?? suggestions.suggestedAccountId ?? setup.accounts[0]?.id,
  );
  const [bucketId, setBucketId] = useState<string | undefined>(
    base?.bucketId ?? preset?.bucketId ?? suggestions.suggestedBucketId ?? setup.ruleItems.find((r) => r.kind === "life")?.id,
  );
  const [fromAccountId, setFromAccountId] = useState<string | undefined>(
    base?.fromAccountId ?? setup.accounts[0]?.id,
  );
  const [toAccountId, setToAccountId] = useState<string | undefined>(
    base?.toAccountId ?? setup.accounts[1]?.id,
  );
  const [fromBucketId, setFromBucketId] = useState<string | undefined>(
    base?.fromBucketId ?? setup.ruleItems.find((r) => r.kind === "free")?.id,
  );
  const [toBucketId, setToBucketId] = useState<string | undefined>(
    base?.toBucketId ?? preset?.toBucketId ?? setup.ruleItems.find((r) => r.kind === "goals")?.id,
  );
  const [occurredAt, setOccurredAt] = useState(localInputValue(base?.occurredAt ?? new Date().toISOString()));
  const [merchant, setMerchant] = useState(base?.merchant ?? "");
  const [description, setDescription] = useState(base?.description ?? "");
  const [note, setNote] = useState(base?.note ?? "");
  const [tagsText, setTagsText] = useState((base?.tags ?? []).join(" "));
  const [attachments, setAttachments] = useState<Attachment[]>(base?.attachments ?? []);
  const [moneyType, setMoneyType] = useState<MoneyType>(base?.moneyType ?? "personal");
  const [manualAllocation, setManualAllocation] = useState(false);
  const [allocations, setAllocations] = useState<Allocation[]>(base?.allocations ?? []);

  useEffect(() => {
    if (kind !== "income" || manualAllocation) return;
    setAllocations(moneyType === "personal" ? previewAllocation(amountMinor, setup.ruleItems) : []);
  }, [kind, amountMinor, moneyType, manualAllocation, setup.ruleItems]);

  const bucket = setup.ruleItems.find((r) => r.id === bucketId);
  const bucketBalance = bucketId ? (snapshot.bucketBalances[bucketId] ?? 0) : 0;
  const ratio = kind === "expense" ? largeExpenseRatio(amountMinor, bucketBalance) : null;
  const isLarge = ratio !== null && ratio >= 0.4;
  const sourceWalletId = kind === "reallocation" ? fromBucketId : kind === "expense" ? bucketId : undefined;
  const sourceWallet = setup.ruleItems.find((r) => r.id === sourceWalletId);
  // Money leaving a protected wallet asks for a deliberate, recorded reason.
  const protectedWarning = Boolean(sourceWallet && isProtectedWallet(sourceWallet));


  const tags = tagsText
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean);

  /** Money this very movement already takes out of a wallet (edit mode only). */
  function creditBackFor(walletId: string | undefined): number {
    if (!editingId || !base || !walletId) return 0;
    if (base.moneyType === "business") return 0;
    if (base.kind === "expense" && base.bucketId === walletId) return base.amountMinor;
    if (base.kind === "reallocation" && base.fromBucketId === walletId) return base.amountMinor;
    return 0;
  }

  function validate(): string | null {
    if (amountMinor <= 0) return "Introduz um valor maior que zero.";
    if (kind === "expense") {
      if (!categoryId) return "Escolhe uma categoria.";
      if (!accountId) return "Escolhe a conta de onde saiu o dinheiro.";
      if (!bucketId) return "Escolhe o propósito do dinheiro.";
      if (moneyType === "personal") {
        // Domain guard: a purpose can never hold less than zero.
        const walletName = setup.ruleItems.find((r) => r.id === bucketId)?.name;
        const error = debitWalletError(snapshot, bucketId, amountMinor, walletName, creditBackFor(bucketId));
        if (error) return error;
      }
    }
    if (kind === "income") {
      if (!accountId) return "Escolhe a conta que recebeu o dinheiro.";
      if (moneyType === "personal" && allocationsTotal(allocations) !== amountMinor) {
        return "A distribuição tem de somar exatamente o valor recebido.";
      }
    }
    if (kind === "transfer") {
      if (!fromAccountId || !toAccountId) return "Escolhe as duas contas.";
      if (fromAccountId === toAccountId) return "A conta de origem e destino têm de ser diferentes.";
      if ((snapshot.accountBalances[fromAccountId] ?? 0) < amountMinor)
        return "Saldo insuficiente na conta de origem.";
    }
    if (kind === "reallocation") {
      if (!fromBucketId || !toBucketId) return "Escolhe os dois propósitos.";
      if (fromBucketId === toBucketId) return "Os propósitos têm de ser diferentes.";
      const walletName = setup.ruleItems.find((r) => r.id === fromBucketId)?.name;
      const error = debitWalletError(
        snapshot,
        fromBucketId,
        amountMinor,
        walletName,
        creditBackFor(fromBucketId),
      );
      if (error) return error;
    }
    return null;
  }

  function goConfirm() {
    const error = validate();
    if (error) {
      toast.error(error);
      haptic("warning");
      return;
    }
    setStage("confirm");
  }

  function submit() {
    if (submitting) return; // double-submit protection
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setSubmitting(true);
    try {
      const payload: Transaction = {
        id: txId,
        kind,
        amountMinor,
        occurredAt: new Date(occurredAt).toISOString(),
        createdAt: base?.createdAt ?? new Date().toISOString(),
        moneyType,
        tags,
        attachments,
        ...(categoryId ? { categoryId } : {}),
        ...(merchant ? { merchant } : {}),
        ...(description ? { description } : {}),
        ...(note ? { note } : {}),
        ...(kind === "expense" || kind === "income" ? { accountId } : {}),
        ...(kind === "expense" ? { bucketId } : {}),
        ...(kind === "income" ? { allocations } : {}),
        ...(kind === "transfer" ? { fromAccountId, toAccountId } : {}),
        ...(kind === "reallocation" ? { fromBucketId, toBucketId } : {}),
        ...(protectedWarning && protectedReason.trim() ? { protectedReason: protectedReason.trim() } : {}),
      };

      if (editingId) {
        updateTransaction(editingId, payload);
        toast.success("Transação atualizada");
      } else {
        addTransaction(payload);
        announceSuccess(payload);
      }
      haptic("success");
      onDone();
    } catch {
      toast.error("Não foi possível guardar a transação. Verifica e tenta novamente.");
      setSubmitting(false);
    }
  }

  function announceSuccess(tx: Transaction) {
    if (tx.kind === "expense") {
      const before = bucketBalance;
      toast.success("Despesa registada", {
        description: `${bucket?.name ?? ""} · ${formatMoney(before, currency)} → ${formatMoney(before - tx.amountMinor, currency)}`,
      });
      return;
    }
    if (tx.kind === "income") {
      toast.success(`${formatMoney(tx.amountMinor, currency)} adicionados`, {
        description: (tx.allocations ?? [])
          .map((a) => `${setup.ruleItems.find((r) => r.id === a.bucketId)?.name}: ${formatMoney(a.amountMinor, currency, { compactDecimals: true })}`)
          .join(" · "),
      });
      return;
    }
    if (tx.kind === "transfer") {
      toast.success("Transferência registada", { description: "O teu património não mudou." });
      return;
    }
    toast.success("Redistribuição registada", { description: "O dinheiro continua na mesma conta." });
  }

  const titles: Record<TxKind, string> = {
    income: "Nova entrada",
    expense: "Nova despesa",
    transfer: "Nova transferência",
    reallocation: "Redistribuição",
  adjustment: "Ajuste de saldo",
  };

  if (stage === "confirm") {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{titles[kind]}</p>
          <p
            className={cn(
              "numeric mt-1 text-3xl font-semibold",
              kind === "expense" ? "text-expense" : kind === "income" ? "text-income" : "text-foreground",
            )}
          >
            {kind === "expense" ? "−" : kind === "income" ? "+" : ""}
            {formatMoney(amountMinor, currency)}
          </p>
        </div>

        <dl className="divide-y divide-border overflow-hidden rounded-2xl border border-border/70 bg-surface text-sm">
          {kind === "expense" ? (
            <>
              <Line label="Categoria" value={findCategory(ledger.categories, categoryId)?.name ?? "—"} />
              <Line label="Pago de" value={setup.accounts.find((a) => a.id === accountId)?.name ?? "—"} />
              <Line label="Propósito" value={bucket?.name ?? "—"} />
            </>
          ) : null}
          {kind === "income" ? (
            <>
              <Line label="Origem" value={findCategory(ledger.categories, categoryId)?.name ?? "—"} />
              <Line label="Recebido em" value={setup.accounts.find((a) => a.id === accountId)?.name ?? "—"} />
              <Line label="Tipo" value={moneyType === "personal" ? "Pessoal" : "Negócio"} />
            </>
          ) : null}
          {kind === "transfer" ? (
            <Line
              label="Movimento"
              value={`${setup.accounts.find((a) => a.id === fromAccountId)?.name} → ${setup.accounts.find((a) => a.id === toAccountId)?.name}`}
            />
          ) : null}
          {kind === "reallocation" ? (
            <Line
              label="Propósito"
              value={`${setup.ruleItems.find((r) => r.id === fromBucketId)?.name} → ${setup.ruleItems.find((r) => r.id === toBucketId)?.name}`}
            />
          ) : null}
          {merchant ? <Line label="Comerciante" value={merchant} /> : null}
          <Line label="Data" value={new Date(occurredAt).toLocaleString("pt-PT")} />
        </dl>

        {kind === "income" && moneyType === "personal" ? (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
            <p className="border-b border-border/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Distribuição
            </p>
            {allocations.map((a) => (
              <Line
                key={a.bucketId}
                label={setup.ruleItems.find((r) => r.id === a.bucketId)?.name ?? ""}
                value={formatMoney(a.amountMinor, currency)}
              />
            ))}
          </div>
        ) : null}

        {kind === "transfer" && fromAccountId && toAccountId ? (
          <div className="rounded-xl bg-muted px-4 py-3 text-sm">
            <BeforeAfter
              label={setup.accounts.find((a) => a.id === fromAccountId)?.name ?? ""}
              before={snapshot.accountBalances[fromAccountId] ?? 0}
              after={(snapshot.accountBalances[fromAccountId] ?? 0) - amountMinor}
              currency={currency}
            />
            <BeforeAfter
              label={setup.accounts.find((a) => a.id === toAccountId)?.name ?? ""}
              before={snapshot.accountBalances[toAccountId] ?? 0}
              after={(snapshot.accountBalances[toAccountId] ?? 0) + amountMinor}
              currency={currency}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Carteiras de propósito: sem alteração. Esta transferência não altera o teu património.
            </p>
          </div>
        ) : null}
        {kind === "reallocation" && fromBucketId && toBucketId ? (
          <div className="rounded-xl bg-muted px-4 py-3 text-sm">
            <BeforeAfter
              label={setup.ruleItems.find((r) => r.id === fromBucketId)?.name ?? ""}
              before={snapshot.bucketBalances[fromBucketId] ?? 0}
              after={(snapshot.bucketBalances[fromBucketId] ?? 0) - amountMinor}
              currency={currency}
            />
            <BeforeAfter
              label={setup.ruleItems.find((r) => r.id === toBucketId)?.name ?? ""}
              before={snapshot.bucketBalances[toBucketId] ?? 0}
              after={(snapshot.bucketBalances[toBucketId] ?? 0) + amountMinor}
              currency={currency}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Contas físicas: sem alteração. O dinheiro continua na mesma conta — apenas muda o seu propósito.
            </p>
          </div>
        ) : null}

        {isLarge && !acknowledgedLarge ? (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-warning">
              <TriangleAlert className="size-4" aria-hidden /> Esta é uma despesa significativa.
            </p>
            <p className="mt-1 text-muted-foreground">
              Representa {Math.round((ratio ?? 0) * 100)}% do saldo da carteira {bucket?.name}.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStage("form")}>
                Rever
              </Button>
              <Button className="flex-1" onClick={() => setAcknowledgedLarge(true)}>
                Continuar
              </Button>
            </div>
          </div>
        ) : null}

        {protectedWarning ? (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-warning">
              <TriangleAlert className="size-4" aria-hidden /> Estás a retirar dinheiro protegido.
            </p>
            <p className="mt-1 text-muted-foreground">
              {formatMoney(amountMinor, currency)} de {sourceWallet?.name}. O dinheiro continua acessível — só
              queremos que a decisão fique registada.
            </p>
            <Label htmlFor="protected-reason" className="mt-3 block text-xs text-muted-foreground">
              Motivo (obrigatório)
            </Label>
            <select
              id="protected-reason"
              className="mt-1 h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
              value={protectedReason}
              onChange={(e) => setProtectedReason(e.target.value)}
            >
              <option value="">Escolher motivo</option>
              <option value="Emergência">Emergência</option>
              <option value="Compra planeada">Compra planeada</option>
              <option value="Mudança de objetivo">Mudança de objetivo</option>
              <option value="Outro">Outro</option>
            </select>
            {protectedReason && !protectedAck ? (
              <Button className="mt-3 w-full" onClick={() => setProtectedAck(true)}>
                Continuar
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setStage("form")}>
            Voltar
          </Button>
          <Button
            className="flex-1"
            onClick={submit}
            disabled={
              submitting ||
              (isLarge && !acknowledgedLarge) ||
              (protectedWarning && (!protectedReason || !protectedAck))
            }
          >

            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {editingId
              ? "Guardar alterações"
              : kind === "expense"
                ? "Registar despesa"
                : kind === "income"
                  ? "Confirmar entrada"
                  : "Confirmar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AmountInput
        valueMinor={amountMinor}
        onChange={setAmountMinor}
        currencyCode={currency}
        label={titles[kind]}
        autoFocus
        tone={kind === "expense" ? "expense" : kind === "income" ? "income" : "neutral"}
      />

      {kind === "expense" || kind === "income" ? (
        <CategoryPicker
          categories={ledger.categories}
          kind={kind === "income" ? "income" : "expense"}
          value={categoryId}
          onChange={setCategoryId}
          recentIds={suggestions.recentCategories}
          frequentIds={suggestions.frequentCategories}
        />
      ) : null}

      {kind === "expense" ? (
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Conta" value={accountId ?? ""} onChange={setAccountId}
            options={setup.accounts.map((a) => ({ value: a.id, label: a.name || "Conta" }))} />
          <SelectField label="Propósito" value={bucketId ?? ""} onChange={setBucketId}
            options={setup.ruleItems.map((r) => ({ value: r.id, label: r.name }))} />
        </div>
      ) : null}

      {kind === "income" ? (
        <>
          <SelectField label="Conta de destino" value={accountId ?? ""} onChange={setAccountId}
            options={setup.accounts.map((a) => ({ value: a.id, label: a.name || "Conta" }))} />
          <div className="flex gap-2">
            {(["personal", "business"] as MoneyType[]).map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={moneyType === type}
                onClick={() => setMoneyType(type)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2.5 text-sm",
                  moneyType === type ? "border-primary bg-primary-soft text-primary" : "border-border/70 bg-surface",
                )}
              >
                {type === "personal" ? "Pessoal" : "Negócio"}
              </button>
            ))}
          </div>

          {moneyType === "personal" ? (
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
              <div className="flex items-center justify-between border-b border-border/70 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Distribuição</p>
                <button
                  type="button"
                  onClick={() => setManualAllocation((v) => !v)}
                  className="text-xs text-primary underline"
                >
                  {manualAllocation ? "Usar a minha regra" : "Ajustar manualmente"}
                </button>
              </div>
              {setup.ruleItems.map((item) => {
                const current = allocations.find((a) => a.bucketId === item.id)?.amountMinor ?? 0;
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2 last:border-b-0">
                    <span className="text-sm">
                      <Symbol name={item.icon} className="size-4" /> {item.name}
                    </span>
                    {manualAllocation ? (
                      <Input
                        className="numeric w-28 text-right"
                        inputMode="numeric"
                        value={String(current)}
                        aria-label={`Valor para ${item.name}`}
                        onChange={(e) => {
                          const digits = Number(e.target.value.replace(/\D/g, "")) || 0;
                          setAllocations((prev) => {
                            const others = prev.filter((a) => a.bucketId !== item.id);
                            return [...others, { bucketId: item.id, amountMinor: digits }];
                          });
                        }}
                      />
                    ) : (
                      <span className="numeric text-sm text-muted-foreground">
                        {formatMoney(current, currency)}
                      </span>
                    )}
                  </div>
                );
              })}
              {manualAllocation ? (
                <p
                  className={cn(
                    "px-4 py-2 text-xs",
                    allocationsTotal(allocations) === amountMinor ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  Distribuído: {formatMoney(allocationsTotal(allocations), currency)} de {formatMoney(amountMinor, currency)}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {kind === "transfer" ? (
        <div className="space-y-2">
          <SelectField label="De" value={fromAccountId ?? ""} onChange={setFromAccountId}
            options={setup.accounts.map((a) => ({ value: a.id, label: a.name || "Conta" }))} />
          <div className="flex justify-center text-muted-foreground" aria-hidden>
            <ArrowRight className="size-4 rotate-90" />
          </div>
          <SelectField label="Para" value={toAccountId ?? ""} onChange={setToAccountId}
            options={setup.accounts.map((a) => ({ value: a.id, label: a.name || "Conta" }))} />
        </div>
      ) : null}

      {kind === "reallocation" ? (
        <div className="space-y-2">
          <SelectField label="De" value={fromBucketId ?? ""} onChange={setFromBucketId}
            options={setup.ruleItems.map((r) => ({ value: r.id, label: r.name }))} />
          <div className="flex justify-center text-muted-foreground" aria-hidden>
            <ArrowRight className="size-4 rotate-90" />
          </div>
          <SelectField label="Para" value={toBucketId ?? ""} onChange={setToBucketId}
            options={setup.ruleItems.map((r) => ({ value: r.id, label: r.name }))} />
        </div>
      ) : null}

      {!quick ? (
        <details className="rounded-2xl border border-border/70 bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium">Adicionar detalhes</summary>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="merchant">Comerciante</Label>
              <Input id="merchant" value={merchant} maxLength={80} onChange={(e) => setMerchant(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" value={description} maxLength={120} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Etiquetas</Label>
              <Input id="tags" value={tagsText} placeholder="#Viagem #Faculdade" onChange={(e) => setTagsText(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Nota privada</Label>
              <Textarea id="note" value={note} maxLength={500} rows={3} onChange={(e) => setNote(e.target.value)} />
            </div>
            <AttachmentsField value={attachments} onChange={setAttachments} transactionId={txId} />
          </div>
        </details>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {setup.accounts.find((a) => a.id === accountId)?.name ?? "Conta"} ·{" "}
          {bucket?.name ?? "Propósito"}{" "}
          <button type="button" className="text-primary underline" onClick={() => setStage("form")}>
            alterar abaixo
          </button>
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="date">Data</Label>
        <Input id="date" type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
      </div>

      <Button className="w-full" onClick={goConfirm}>
        {kind === "income"
          ? "Adicionar entrada"
          : kind === "expense"
            ? "Registar despesa"
            : kind === "transfer"
              ? "Transferir"
              : "Guardar dinheiro"}
      </Button>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="numeric text-right font-medium">{value}</dd>
    </div>
  );
}

function SelectField({
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
  const id = `field-${label.replace(/\s/g, "-").toLowerCase()}`;
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
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function BeforeAfter({
  label,
  before,
  after,
  currency,
}: {
  label: string;
  before: number;
  after: number;
  currency: string;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="numeric flex items-center gap-1.5">
        <span className="text-muted-foreground">{formatMoney(before, currency, { compactDecimals: true })}</span>
        <ArrowRight className="size-3" aria-hidden />
        <span className="font-medium">{formatMoney(after, currency, { compactDecimals: true })}</span>
      </span>
    </div>
  );
}
