import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useRef } from "react";
import {
  Home,
  ArrowLeftRight,
  Plus,
  Target,
  MoreHorizontal,
  Wallet,
  PieChart,
  Repeat,
  Settings,
  Landmark,
  Map,
} from "lucide-react";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";
import { pt } from "@/lib/i18n/pt";
import { useTransactionLauncher } from "@/components/transactions/transaction-launcher";
import { haptic } from "@/hooks/use-ledger";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const primaryNav: NavItem[] = [
  { to: "/app", label: pt.nav.home, icon: Home },
  { to: "/app/transactions", label: pt.nav.transactions, icon: ArrowLeftRight },
  { to: "/app/goals", label: pt.nav.goals, icon: Target },
];

const desktopNav: NavItem[] = [
  { to: "/app", label: pt.nav.home, icon: Home },
  { to: "/app/transactions", label: pt.nav.transactions, icon: ArrowLeftRight },
  { to: "/app/recurring", label: "Recorrentes", icon: Repeat },
  { to: "/app/accounts", label: "Contas", icon: Landmark },
  { to: "/app/wallets", label: "Carteiras", icon: Wallet },
  { to: "/app/money-map", label: "Mapa do dinheiro", icon: Map },
  { to: "/app/goals", label: pt.nav.goals, icon: Target },
  { to: "/app/reports", label: pt.nav.reports, icon: PieChart },
  { to: "/app/settings", label: pt.nav.settings, icon: Settings },
];

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { openQuickActions, openComposer } = useTransactionLauncher();
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);

  function startHold() {
    heldRef.current = false;
    holdTimer.current = setTimeout(() => {
      heldRef.current = true;
      haptic("selection");
      openComposer({ kind: "expense", quick: true });
    }, 500);
  }

  function endHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }

  function handleAddClick() {
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    openQuickActions();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-5 lg:flex">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Finance OS</p>
            <p className="text-xs text-muted-foreground">Pessoal</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {desktopNav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={openQuickActions}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          {pt.nav.add}
        </button>
      </aside>

      <main className="pb-28 lg:ml-64 lg:pb-10">
        <div className="mx-auto w-full max-w-3xl px-4 pt-6 lg:max-w-4xl lg:px-8 lg:pt-10">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
          {primaryNav.slice(0, 2).map((item) => (
            <BottomLink key={item.to} item={item} active={pathname === item.to} />
          ))}
          <div className="flex justify-center">
            <button
              type="button"
              aria-label={`${pt.nav.add} transação`}
              onClick={handleAddClick}
              onPointerDown={startHold}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              onContextMenu={(e) => e.preventDefault()}
              className="-mt-7 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-95"
            >
              <Plus className="size-6" />
            </button>
          </div>
          {primaryNav.slice(2).map((item) => (
            <BottomLink key={item.to} item={item} active={pathname === item.to} />
          ))}
          <BottomLink
            item={{ to: "/app/settings", label: pt.nav.more, icon: MoreHorizontal }}
            active={pathname.startsWith("/app/settings") || pathname === "/app/wallets"}
          />
        </div>
      </nav>
    </div>
  );
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.to}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <item.icon className="size-5" />
      {item.label}
    </Link>
  );
}
