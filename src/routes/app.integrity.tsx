import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { haptic, newId, useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { correctionSources } from "@/lib/finance/integrity";
import { financialPosition } from "@/lib/finance/position";
import type { Transaction } from "@/lib/finance/ledger-types";
import { Symbol } from "@/lib/icons/symbols";

export const Route = createFileRoute("/app/integrity")({
  head: () => ({
    meta: [
      { title: "Verificação financeira — Norte" },
      {
        name: "description",
        content: "Confirma que o total, o disponível e o reservado fecham, e corrige estados impossíveis.",
      },
      { property: "og:title", content: "Verificação financeira — Norte" },
      { property: "og:description", content: "O teu dinheiro conferido: total, disponível e reservado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegrityPage,
});

function IntegrityPage() {
  const { setup, update } = useSetup();
  const { snapshot, integrity, addTransaction } = useLedger();

  const position = financialPosition(snapshot);
  const errors = integrity.issues.filter((i) => i.severity === "error");
  const warnings = integrity.issues.filter((i) => i.severity === "warning");

  return (
    <div className="pb-6">
      <PageHeader
        title="Verificação financeira"
        subtitle="O total tem de ser sempre igual ao dinheiro com propósito mais o que está por distribuir."
      />

      <section className="card-standard">
        <div className="flex items-center gap-3">
          <span className="icon-tile size-10">
            {integrity.ok ? (
              <CheckCircle2 className="size-5 text-primary" />
            ) : (
              <TriangleAlert className="size-5 text-destructive" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[0.9375rem] font-semibold">
              {integrity.ok ? "As contas fecham." : "Há algo por corrigir."}
            </p>
            <p className="type-meta">
              {integrity.ok
                ? "Nenhum estado impossível encontrado."
                : `${errors.length} ${errors.length === 1 ? "problema" : "problemas"} a corrigir.`}
            </p>
          </div>
        </div>

        <dl className="mt-5 space-y-2">
          <Line label="Total" minor={snapshot.wealthMinor} />
          <Line label="Com propósito" minor={snapshot.purposeTotalMinor} />
          <Line label="Por distribuir" minor={snapshot.unallocatedMinor} />
          <Line label="Disponível" minor={position.availableMinor} />
          <Line label="Protegido" minor={snapshot.protectedMinor} />
        </dl>
      </section>

      {errors.length > 0 ? (
        <section className="mt-6 space-y-3">
          <h2 className="type-section px-1">A corrigir</h2>
          {errors.map((issue, index) => (
            <IssueCard
              key={`${issue.code}-${issue.walletId ?? issue.transactionId ?? index}`}
              title={issue.title}
              detail={issue.detail}
              amountMinor={issue.amountMinor}
              fix={
                issue.code === "negative_wallet" && issue.walletId && issue.amountMinor ? (
                  <FixNegativeWallet
                    walletId={issue.walletId}
                    amountMinor={issue.amountMinor}
                    onFix={(tx) => {
                      if (addTransaction(tx)) {
                        haptic("success");
                        toast.success("Correção registada no histórico.");
                      }
                    }}
                  />
                ) : issue.code === "missing_wallet" && issue.walletId ? (
                  <RestorePurpose
                    walletId={issue.walletId}
                    onRestore={(name) => {
                      update({
                        ruleItems: [
                          ...setup.ruleItems,
                          {
                            id: issue.walletId!,
                            name,
                            percentage: 0,
                            icon: "star",
                            kind: "goals",
                            source: "custom",
                            order: setup.ruleItems.length,
                          },
                        ],
                      });
                      haptic("success");
                      toast.success("Propósito reposto. Os movimentos voltaram a ter sentido.");
                    }}
                  />
                ) : null
              }
            />
          ))}
        </section>
      ) : null}

      {warnings.length > 0 ? (
        <section className="mt-6 space-y-3">
          <h2 className="type-section px-1">A ter em atenção</h2>
          {warnings.map((issue, index) => (
            <IssueCard
              key={`${issue.code}-${index}`}
              title={issue.title}
              detail={issue.detail}
              amountMinor={issue.amountMinor}
            />
          ))}
        </section>
      ) : null}

      {integrity.ok ? (
        <section className="mt-6">
          <div className="card-compact flex items-center gap-3">
            <ShieldCheck className="size-4 text-primary" />
            <p className="type-meta">
              Cada movimento é validado antes de ser guardado: nenhum propósito pode ficar negativo.
            </p>
          </div>
          <div className="mt-4">
            <Button asChild variant="secondary">
              <Link to="/app/money-map">Ver o mapa do dinheiro</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {import.meta.env.DEV ? (
        <details className="mt-8 rounded-2xl bg-subtle p-4">
          <summary className="type-meta cursor-pointer">Diagnóstico técnico (só em desenvolvimento)</summary>
          <pre className="mt-3 overflow-x-auto text-[0.6875rem] leading-relaxed">
            {JSON.stringify(
              {
                base: setup.currencyCode,
                equation: integrity.balanceEquationHolds,
                wealthMinor: snapshot.wealthMinor,
                purposeTotalMinor: snapshot.purposeTotalMinor,
                unallocatedMinor: snapshot.unallocatedMinor,
                accountBalances: snapshot.accountBalances,
                bucketBalances: snapshot.bucketBalances,
                issues: integrity.issues,
              },
              null,
              2,
            )}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

function Line({ label, minor }: { label: string; minor: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="type-meta">{label}</dt>
      <dd>
        <Money minor={minor} className="text-sm font-semibold" options={{ withSymbol: false, compactDecimals: true }} />
      </dd>
    </div>
  );
}

function IssueCard({
  title,
  detail,
  amountMinor,
  fix,
}: {
  title: string;
  detail: string;
  amountMinor?: number | undefined;
  fix?: React.ReactNode | undefined;
}) {
  return (
    <article className="card-standard">
      <div className="flex items-start gap-3">
        <span className="icon-tile size-9 text-destructive">
          <AlertTriangle className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-semibold">{title}</p>
          <p className="type-meta mt-1">{detail}</p>
          {typeof amountMinor === "number" && amountMinor > 0 ? (
            <p className="mt-2">
              <Money
                minor={amountMinor}
                className="text-sm font-semibold"
                options={{ withSymbol: false, compactDecimals: true }}
              />
            </p>
          ) : null}
        </div>
      </div>
      {fix ? <div className="mt-4">{fix}</div> : null}
    </article>
  );
}

/**
 * A purpose was deleted while movements still pointed at it. Restoring it with
 * the same identity puts the money back under a name — no movement changes.
 */
function RestorePurpose({
  walletId,
  onRestore,
}: {
  walletId: string;
  onRestore: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="space-y-3">
      <p className="type-meta">Dá-lhe um nome para o veres outra vez nas tuas listas.</p>
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nome do propósito"
        aria-label={`Nome do propósito ${walletId}`}
      />
      <Button disabled={name.trim().length === 0} onClick={() => onRestore(name.trim())}>
        Repor propósito
      </Button>
    </div>
  );
}

/**
 * Correction path: history is never deleted. The difference is covered with a
 * recorded redistribution from a purpose that actually has the money.
 */
function FixNegativeWallet({
  walletId,
  amountMinor,
  onFix,
}: {
  walletId: string;
  amountMinor: number;
  onFix: (tx: Transaction) => void;
}) {
  const { snapshot } = useLedger();
  const sources = useMemo(
    () => correctionSources(snapshot, amountMinor, walletId),
    [snapshot, amountMinor, walletId],
  );
  const [sourceId, setSourceId] = useState<string | undefined>(sources[0]?.id);

  if (sources.length === 0) {
    return (
      <p className="type-meta">
        Nenhum outro propósito tem saldo suficiente para cobrir esta diferença. Regista uma entrada ou
        redistribui dinheiro primeiro.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="type-meta">Cobre a diferença a partir de outro propósito. O histórico mantém-se intacto.</p>
      <Select value={sourceId ?? ""} onValueChange={setSourceId}>
        <SelectTrigger>
          <SelectValue placeholder="Escolher propósito" />
        </SelectTrigger>
        <SelectContent>
          {sources.map((wallet) => (
            <SelectItem key={wallet.id} value={wallet.id}>
              <span className="inline-flex items-center gap-1.5"><Symbol name={wallet.icon} className="size-4 text-muted-foreground" /> {wallet.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={() => {
          if (!sourceId) return;
          const now = new Date().toISOString();
          onFix({
            id: newId(),
            kind: "reallocation",
            amountMinor,
            occurredAt: now,
            createdAt: now,
            moneyType: "personal",
            tags: [],
            attachments: [],
            fromBucketId: sourceId,
            toBucketId: walletId,
            description: "Correção de integridade",
            note: "Reposição de um propósito que tinha ficado negativo.",
          });
        }}
      >
        Corrigir com uma redistribuição
      </Button>
    </div>
  );
}
