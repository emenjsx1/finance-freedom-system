import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ArrowLeftRight, Minus, PiggyBank, Plus, Shuffle } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

      <Sheet open={quickOpen} onOpenChange={setQuickOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-border bg-surface pb-[max(env(safe-area-inset-bottom),1rem)]">
          <SheetHeader className="px-4">
            <SheetTitle>O que queres registar?</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 px-4 pb-4">
            {ACTIONS.map((action) => (
              <button
                key={action.kind}
                type="button"
                onClick={() => openComposer({ kind: action.kind })}
                className="flex w-full items-center gap-4 rounded-2xl border border-border bg-background px-4 py-3.5 text-left transition-colors hover:border-muted-foreground/40"
              >
                <span className={`flex size-10 items-center justify-center rounded-xl bg-muted ${action.tone}`}>
                  <action.icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{action.label}</span>
                  <span className="block text-xs text-muted-foreground">{action.hint}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => openComposer({ kind: "expense", quick: true })}
              className="w-full rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
            >
              Registo rápido de despesa
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={composer !== null} onOpenChange={(open) => !open && setComposer(null)}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className="overflow-y-auto rounded-t-3xl border-border bg-background sm:max-w-lg"
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
