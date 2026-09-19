import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ArrowLeftRight, Minus, PiggyBank, Plus, Shuffle } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NativeSheet } from "@/components/design/native-sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  TransactionComposer,
  type ComposerOptions,
} from "@/components/transactions/transaction-composer";
import type { TxKind } from "@/lib/finance/ledger-types";

interface LauncherContextValue {
  openQuickActions: () => void;
  openComposer: (options: ComposerOptions) => void;
}

const LauncherContext = createContext<LauncherContextValue | null>(null);

const ACTIONS: { kind: TxKind; label: string; hint: string; icon: typeof Plus; tone: string }[] = [
  { kind: "income", label: "Entrada", hint: "Dinheiro que recebeste", icon: Plus, tone: "text-income" },
  { kind: "expense", label: "Despesa", hint: "Dinheiro que gastaste", icon: Minus, tone: "text-expense" },
  { kind: "transfer", label: "Transferência", hint: "Mover dinheiro entre contas", icon: ArrowLeftRight, tone: "text-info" },
  { kind: "reallocation", label: "Guardar", hint: "Reservar dinheiro para um propósito", icon: PiggyBank, tone: "text-wealth" },
];

export function TransactionLauncherProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [quickOpen, setQuickOpen] = useState(false);
  const [composer, setComposer] = useState<ComposerOptions | null>(null);

  const openQuickActions = useCallback(() => setQuickOpen(true), []);
  const openComposer = useCallback((options: ComposerOptions) => {
    setQuickOpen(false);
    setComposer(options);
  }, []);

  const value = useMemo(() => ({ openQuickActions, openComposer }), [openQuickActions, openComposer]);

  const titles: Record<TxKind, string> = {
    income: "Nova entrada",
    expense: "Nova despesa",
    transfer: "Nova transferência",
    reallocation: "Redistribuição",
  adjustment: "Ajuste de saldo",
  };

  return (
    <LauncherContext.Provider value={value}>
      {children}

      <NativeSheet open={quickOpen} onOpenChange={setQuickOpen} title="O que queres fazer?">
        <div className="list-group mt-3">
          {ACTIONS.map((action) => (
            <button
              key={action.kind}
              type="button"
              onClick={() => openComposer({ kind: action.kind })}
              className="list-row"
            >
              <span className={`icon-tile ${action.tone}`}>
                <action.icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-semibold">{action.label}</span>
                <span className="type-meta block">{action.hint}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2 pb-2">
          <button
            type="button"
            onClick={() => openComposer({ kind: "adjustment" })}
            className="flex-1 rounded-[var(--r-lg)] bg-subtle px-4 py-3 text-sm font-medium"
          >
            Ajustar saldo
          </button>
          <button
            type="button"
            onClick={() => openComposer({ kind: "expense", quick: true })}
            className="flex flex-1 items-center justify-center gap-2 rounded-[var(--r-lg)] bg-subtle px-4 py-3 text-sm font-medium"
          >
            <Shuffle className="size-4" aria-hidden />
            Registo rápido
          </button>
        </div>
      </NativeSheet>

      <Sheet open={composer !== null} onOpenChange={(open) => !open && setComposer(null)}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className="overflow-y-auto rounded-t-3xl border-border/70 bg-background sm:max-w-lg"
        >
          <SheetHeader className="px-4">
            <SheetTitle>{composer ? titles[composer.kind] : ""}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
            {composer ? (
              <TransactionComposer options={composer} onDone={() => setComposer(null)} />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </LauncherContext.Provider>
  );
}

export function useTransactionLauncher(): LauncherContextValue {
  const ctx = useContext(LauncherContext);
  if (!ctx) throw new Error("useTransactionLauncher must be used inside TransactionLauncherProvider");
  return ctx;
}
