import { Link } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeftRight, ArrowUp, Diamond, Plus } from "lucide-react";


import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NativeSheet } from "@/components/design/native-sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { haptic } from "@/lib/ios/haptics";
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
  { kind: "income", label: "Entrada", hint: "Dinheiro que recebeste", icon: ArrowUp, tone: "text-income" },
  { kind: "expense", label: "Despesa", hint: "Dinheiro que gastaste", icon: ArrowDown, tone: "text-expense" },
  { kind: "transfer", label: "Transferência", hint: "Entre contas", icon: ArrowLeftRight, tone: "text-info" },
  { kind: "reservation", label: "Guardar", hint: "Dar um propósito a dinheiro que já tens", icon: Diamond, tone: "text-wealth" },
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
    reservation: "Guardar dinheiro",
    release: "Libertar dinheiro",
    reallocation: "Mudar propósito",
    adjustment: "Ajuste de saldo",
  };

  return (
    <LauncherContext.Provider value={value}>
      {children}

      <NativeSheet open={quickOpen} onOpenChange={setQuickOpen} title="Novo movimento">
        <div className="grid grid-cols-2 gap-3 pt-1">
          {ACTIONS.map((action) => (
            <button
              key={action.kind}
              type="button"
              onClick={() => {
                haptic("confirm");
                openComposer({ kind: action.kind });
              }}
              className="card-interactive flex flex-col items-start gap-3 p-4 text-left"
            >
              <span className={`icon-tile ${action.tone}`}>
                <action.icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-semibold">{action.label}</span>
                <span className="type-meta block truncate">{action.hint}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="list-group mt-4">
          <Link to="/app/plans" onClick={() => setQuickOpen(false)} className="list-row justify-between">
            <span>Criar plano</span>
            <span className="type-meta">Algo que queres construir</span>
          </Link>
          <Link
            to="/app/commitments"
            onClick={() => setQuickOpen(false)}
            className="list-row justify-between"
          >
            <span>Adicionar compromisso</span>
            <span className="type-meta">Renda, internet, propinas</span>
          </Link>
          <Link
            to="/app/reminders"
            onClick={() => setQuickOpen(false)}
            className="list-row justify-between"
          >
            <span>Criar lembrete</span>
            <span className="type-meta">Algo para lembrares a uma hora</span>
          </Link>
          <button
            type="button"
            onClick={() => openComposer({ kind: "adjustment" })}
            className="list-row w-full justify-between text-left"
          >
            <span>Ajustar saldo de uma conta</span>
            <span className="type-meta">Conferir com a realidade</span>
          </button>
        </div>
      </NativeSheet>

      <Sheet open={composer !== null} onOpenChange={(open) => !open && setComposer(null)}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className="max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-border/70 bg-background sm:max-w-lg"
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
