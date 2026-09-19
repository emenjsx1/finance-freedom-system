import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { protectedMoneyHistory } from "@/lib/finance/engine";
import { Symbol } from "@/lib/icons/symbols";

export const Route = createFileRoute("/app/protected")({
  head: () => ({
    meta: [
      { title: "Dinheiro protegido — Finance OS" },
      { name: "description", content: "Entradas, retiradas e motivos do dinheiro que decidiste proteger." },
      { property: "og:title", content: "Dinheiro protegido — Finance OS" },
      { property: "og:description", content: "Entradas, retiradas e motivos do dinheiro protegido." },
    ],
  }),
  component: ProtectedMoneyPage,
});

function ProtectedMoneyPage() {
  const { setup } = useSetup();
  const { ledger, snapshot } = useLedger();
  const rows = protectedMoneyHistory(ledger.transactions, setup.ruleItems);

  return (
    <div>
      <PageHeader
        title="Dinheiro protegido"
        subtitle="Dinheiro que decidiste não utilizar no dia a dia. Continua acessível."
      />

      <section className="mb-5 rounded-2xl border border-border/70 bg-surface p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total protegido</p>
        <Money minor={snapshot.protectedMinor} className="mt-1 block text-2xl font-semibold" />
      </section>

      <h2 className="mb-2 text-sm font-semibold">Histórico</h2>
      {rows.length === 0 ? (
        <EmptyState
          icon={Lock}
          title="Ainda não há movimentos protegidos."
          description="Quando entrares ou retirares dinheiro de uma carteira protegida, fica registado aqui."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => {
            const wallet = setup.ruleItems.find((w) => w.id === row.walletId);
            return (
              <li
                key={`${row.tx.id}-${row.walletId}-${index}`}
                className="flex items-center justify-between rounded-xl border border-border/70 bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    <span className="inline-flex items-center gap-1.5"><Symbol name={wallet?.icon} className="size-4 text-muted-foreground" /> {wallet?.name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(row.tx.occurredAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                    {row.reason ? ` • ${row.reason}` : ""}
                  </p>
                </div>
                <Money
                  minor={row.direction === "in" ? row.amountMinor : -row.amountMinor}
                  options={{ signDisplay: "always" }}
                  className={`text-sm font-semibold ${row.direction === "in" ? "text-income" : "text-expense"}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
