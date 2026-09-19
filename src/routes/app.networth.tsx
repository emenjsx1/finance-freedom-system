/**
 * Património — money plus what the person owns, minus what they owe.
 *
 * Money comes from the financial engine and is never re-typed here. Every other
 * value is stated by the person: nothing is estimated and nothing is seeded.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { NativeSheet } from "@/components/design/native-sheet";
import { SectionHeader } from "@/components/design/section-header";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { AmountInput } from "@/components/transactions/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import {
  EMPTY_NET_WORTH,
  NET_WORTH_CATEGORY_LABELS,
  NET_WORTH_ORDER,
  netWorthMinor,
  type NetWorthCategory,
  type NetWorthItem,
  type NetWorthState,
} from "@/lib/networth/types";

const STORAGE_KEY = "pfos.networth.v1";

export const Route = createFileRoute("/app/networth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Património — Finan." },
      {
        name: "description",
        content: "Tudo o que tens menos o que deves: dinheiro, bens e dívidas.",
      },
      { property: "og:title", content: "Património — Finan." },
      { property: "og:description", content: "Dinheiro, veículos, imóveis, investimentos e dívidas." },
    ],
  }),
  component: NetWorthPage,
});

function load(): NetWorthState {
  if (typeof window === "undefined") return EMPTY_NET_WORTH;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { items: (JSON.parse(raw) as NetWorthState).items ?? [] } : EMPTY_NET_WORTH;
  } catch {
    return EMPTY_NET_WORTH;
  }
}

function NetWorthPage() {
  const { setup } = useSetup();
  const { snapshot } = useLedger();
  const [state, setState] = useState<NetWorthState>(EMPTY_NET_WORTH);
  const [sheet, setSheet] = useState(false);
  const [category, setCategory] = useState<NetWorthCategory>("vehicle");
  const [name, setName] = useState("");
  const [valueMinor, setValueMinor] = useState(0);

  useEffect(() => setState(load()), []);

  function persist(items: NetWorthItem[]) {
    setState({ items });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
  }

  const moneyMinor = snapshot.wealthMinor;
  const total = netWorthMinor(moneyMinor, state.items);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Património"
        subtitle="Tudo o que tens menos o que deves. O dinheiro é só uma parte."
      />

      <section className="card-hero">
        <p className="type-meta">Património líquido</p>
        <p className="type-hero mt-2">
          <Money minor={total} options={{ withSymbol: false, compactDecimals: true }} />
          <span className="type-hero-currency"> {setup.currencyCode}</span>
        </p>
      </section>

      <section>
        <SectionHeader title="Dinheiro" actionLabel="Ver" to="/app/money" />
        <ul className="list-group">
          <li className="list-row justify-between">
            <span>Dinheiro nas contas</span>
            <Money minor={moneyMinor} className="font-medium" />
          </li>
        </ul>
      </section>

      {NET_WORTH_ORDER.map((key) => {
        const items = state.items.filter((item) => item.category === key);
        if (items.length === 0) return null;
        const sum = items.reduce((acc, item) => acc + item.valueMinor, 0);
        return (
          <section key={key}>
            <SectionHeader title={NET_WORTH_CATEGORY_LABELS[key]} />
            <ul className="list-group">
              {items.map((item) => (
                <li key={item.id} className="list-row justify-between">
                  <span>{item.name}</span>
                  <span className="flex items-center gap-3">
                    <Money minor={item.valueMinor} className="font-medium" />
                    <button
                      type="button"
                      className="text-sm text-muted-foreground"
                      onClick={() => persist(state.items.filter((entry) => entry.id !== item.id))}
                    >
                      Remover
                    </button>
                  </span>
                </li>
              ))}
              <li className="list-row justify-between">
                <span className="type-meta">Subtotal</span>
                <Money minor={key === "liability" ? -sum : sum} className="type-meta" />
              </li>
            </ul>
          </section>
        );
      })}

      {state.items.length === 0 ? (
        <section className="card-standard text-center">
          <p className="type-secondary">
            Ainda só registaste dinheiro. Podes acrescentar o que tens — um carro, um terreno, um
            investimento — e o que deves.
          </p>
        </section>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button onClick={() => setSheet(true)}>Adicionar bem ou dívida</Button>
        <Button variant="ghost" asChild>
          <Link to="/app/money">Voltar ao dinheiro</Link>
        </Button>
      </div>

      <p className="type-meta">
        Comprar um bem não faz o património desaparecer: o dinheiro desce e o bem entra pelo valor
        que indicares. Dinheiro de um negócio não é património pessoal.
      </p>

      <NativeSheet
        open={sheet}
        onOpenChange={setSheet}
        title="Adicionar ao património"
        description="O valor é o que tu indicares. Nada é estimado."
      >
        <div className="space-y-4">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="O que é? (ex.: carro, terreno, empréstimo)"
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            {NET_WORTH_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  category === key ? "bg-primary text-primary-foreground" : "bg-subtle text-muted-foreground"
                }`}
              >
                {NET_WORTH_CATEGORY_LABELS[key]}
              </button>
            ))}
          </div>
          <AmountInput
            valueMinor={valueMinor}
            onChange={setValueMinor}
            currencyCode={setup.currencyCode}
            label={category === "liability" ? "Quanto deves" : "Quanto vale"}
          />
          <Button
            className="w-full"
            disabled={!name.trim() || valueMinor <= 0}
            onClick={() => {
              persist([
                ...state.items,
                {
                  id: crypto.randomUUID(),
                  category,
                  name: name.trim(),
                  valueMinor,
                  updatedAt: new Date().toISOString(),
                },
              ]);
              setName("");
              setValueMinor(0);
              setSheet(false);
            }}
          >
            Guardar
          </Button>
        </div>
      </NativeSheet>
    </div>
  );
}
