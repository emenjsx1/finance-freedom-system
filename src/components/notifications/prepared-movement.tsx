import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNotifications } from "@/hooks/use-notifications";
import { useSetup } from "@/hooks/use-setup";

/**
 * Prepared money movement.
 *
 * Nothing is registered until the user confirms here — an automation or a
 * notification may only prepare; the financial engine executes afterwards.
 */
export function PreparedMovementSheet() {
  const { prepared, confirmPrepared, cancelPrepared } = useNotifications();
  const { setup } = useSetup();

  const account = setup.accounts.find((a) => a.id === prepared?.accountId);
  const wallet = setup.ruleItems.find((w) => w.id === (prepared?.bucketId ?? prepared?.toBucketId));
  const from = setup.ruleItems.find((w) => w.id === prepared?.fromBucketId);

  return (
    <Sheet open={Boolean(prepared)} onOpenChange={(open) => (open ? null : cancelPrepared())}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{prepared?.kind === "expense" ? "Pagamento preparado" : "Contribuição preparada"}</SheetTitle>
        </SheetHeader>
        {prepared ? (
          <div className="space-y-4 px-4 pb-6">
            <div>
              <p className="text-sm text-muted-foreground">{prepared.title}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                <Money minor={prepared.amountMinor} />
              </p>
            </div>
            <dl className="space-y-1.5 rounded-xl border border-border/70 bg-surface p-4 text-sm">
              {account ? (
                <Row label="Conta" value={account.name} />
              ) : null}
              {from ? <Row label="De" value={from.name} /> : null}
              {wallet ? <Row label={prepared.kind === "expense" ? "Carteira" : "Para"} value={wallet.name} /> : null}
            </dl>
            <p className="text-xs text-muted-foreground">{prepared.summary}</p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={confirmPrepared}>
                {prepared.kind === "expense" ? "Confirmar pagamento" : "Confirmar"}
              </Button>
              <Button variant="ghost" onClick={cancelPrepared}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
