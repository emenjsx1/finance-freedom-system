import { useState } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { findCategory } from "@/lib/finance/categories";
import { formatMoney } from "@/lib/finance/currency";
import type { Transaction } from "@/lib/finance/ledger-types";
import { useTransactionLauncher } from "@/components/transactions/transaction-launcher";
import { cn } from "@/lib/utils";

export function TransactionDetail({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const { setup } = useSetup();
  const { ledger, deleteTransaction } = useLedger();
  const { openComposer } = useTransactionLauncher();
  const [confirming, setConfirming] = useState(false);
  const currency = setup.currencyCode;

  const category = findCategory(ledger.categories, tx.categoryId);
  const accountName = (id?: string) => setup.accounts.find((a) => a.id === id)?.name ?? "—";
  const bucketName = (id?: string) => setup.ruleItems.find((b) => b.id === id)?.name ?? "—";

  const kindLabel =
    tx.kind === "expense" ? "despesa" : tx.kind === "income" ? "entrada" : tx.kind === "transfer" ? "transferência" : "redistribuição";

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{tx.merchant || tx.description || category?.name || "Transação"}</p>
        <p
          className={cn(
            "numeric mt-1 text-3xl font-semibold",
            tx.kind === "expense" ? "text-expense" : tx.kind === "income" ? "text-income" : "text-foreground",
          )}
        >
          {tx.kind === "expense" ? "−" : tx.kind === "income" ? "+" : ""}
          {formatMoney(tx.amountMinor, currency)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(tx.occurredAt).toLocaleString("pt-PT")}
        </p>
      </div>

      <dl className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface text-sm">
        {tx.kind === "expense" ? (
          <>
            <Line label="Categoria" value={category?.name ?? "—"} />
            <Line label="Pago de" value={accountName(tx.accountId)} />
            <Line label="Propósito" value={bucketName(tx.bucketId)} />
          </>
        ) : null}
        {tx.kind === "income" ? (
          <>
            <Line label="Origem" value={category?.name ?? "—"} />
            <Line label="Recebido em" value={accountName(tx.accountId)} />
            <Line label="Tipo" value={tx.moneyType === "personal" ? "Pessoal" : "Negócio"} />
          </>
        ) : null}
        {tx.kind === "transfer" ? (
          <Line label="Movimento" value={`${accountName(tx.fromAccountId)} → ${accountName(tx.toAccountId)}`} />
        ) : null}
        {tx.kind === "reallocation" ? (
          <Line label="Propósito" value={`${bucketName(tx.fromBucketId)} → ${bucketName(tx.toBucketId)}`} />
        ) : null}
        {tx.note ? <Line label="Nota" value={tx.note} /> : null}
        {tx.tags.length ? <Line label="Etiquetas" value={tx.tags.map((t) => `#${t}`).join(" ")} /> : null}
      </dl>

      {tx.kind === "income" && (tx.allocations?.length ?? 0) > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <p className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Distribuição
          </p>
          {tx.allocations!.map((a) => (
            <Line key={a.bucketId} label={bucketName(a.bucketId)} value={formatMoney(a.amountMinor, currency)} />
          ))}
        </div>
      ) : null}

      {tx.attachments.length ? (
        <div className="grid grid-cols-3 gap-2">
          {tx.attachments.map((attachment) =>
            attachment.mime.startsWith("image/") && attachment.dataUrl ? (
              <img key={attachment.id} src={attachment.dataUrl} alt={attachment.name} className="h-24 w-full rounded-xl object-cover" />
            ) : (
              <span key={attachment.id} className="flex h-24 items-center justify-center rounded-xl bg-muted p-2 text-center text-xs">
                {attachment.name}
              </span>
            ),
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          onClick={() => {
            onClose();
            openComposer({ kind: tx.kind, base: tx, editingId: tx.id });
          }}
        >
          <Pencil className="size-4" /> Editar
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            onClose();
            openComposer({
              kind: tx.kind,
              base: { ...tx, occurredAt: new Date().toISOString(), attachments: [] },
            });
          }}
        >
          <Copy className="size-4" /> Duplicar
        </Button>
        <Button variant="outline" className="text-destructive" onClick={() => setConfirming(true)}>
          <Trash2 className="size-4" /> Eliminar
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar esta {kindLabel}?</AlertDialogTitle>
            <AlertDialogDescription>Os saldos afetados serão recalculados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteTransaction(tx.id);
                onClose();
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
