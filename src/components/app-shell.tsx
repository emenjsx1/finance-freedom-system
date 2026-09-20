import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Home, Plus, LayoutGrid, MessageSquare, User } from "lucide-react";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";
import { useTransactionLauncher } from "@/components/transactions/transaction-launcher";
import { NativeSheet } from "@/components/design/native-sheet";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { PreparedMovementSheet } from "@/components/notifications/prepared-movement";
import { haptic } from "@/hooks/use-ledger";
import { usePrefs } from "@/hooks/use-prefs";
import { useSetup } from "@/hooks/use-setup";
import { BrandMark } from "@/components/brand/brand-mark";
import { NAV_GROUPS } from "@/lib/nav/catalogue";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

/** Mobile: four destinations plus the action, and "Secções" opens everything. */
const mobileLeft: NavItem[] = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/app/agent", label: "Agente", icon: MessageSquare },
];
const mobileRight: NavItem[] = [{ to: "/app/me", label: "Eu", icon: User }];

const desktopGroups: { title: string; items: NavItem[] }[] = NAV_GROUPS;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { openQuickActions, openComposer } = useTransactionLauncher();
  const { setup } = useSetup();
  const { prefs } = usePrefs();

  // Privacy mode hides every monetary value, including screens that format money directly.
  useEffect(() => {
    document.documentElement.classList.toggle("privacy-mode", setup.privacyMode);
  }, [setup.privacyMode]);

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
    <div className="min-h-dvh bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <BrandMark showName={false} />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Norte</p>
            <p className="type-meta">Sistema pessoal</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
          {desktopGroups.map((group) => (
            <div key={group.title}>
              <p className="type-section mb-2 px-3">{group.title}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active =
                    item.to === "/app" ? pathname === "/app" : pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                      )}
                    >
                      <item.icon
                        className={cn("size-4", active ? "text-primary" : "text-muted-foreground")}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <button
          type="button"
          onClick={openQuickActions}
          className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Adicionar
        </button>
      </aside>

      <main className="pb-[calc(6.75rem+env(safe-area-inset-bottom))] lg:ml-64 lg:pb-12">
        <div className="mx-auto w-full max-w-2xl px-4 pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-5 lg:max-w-4xl lg:px-10 lg:pt-6">
          <div className="sticky top-[max(env(safe-area-inset-top),0.75rem)] z-30 mb-2 flex h-11 items-center justify-end gap-1 pointer-events-none">
            <Link
              to="/app/all"
              aria-label="Tudo"
              className="pointer-events-auto flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <LayoutGrid className="size-5" />
            </Link>
            <NotificationBell className="pointer-events-auto" />
          </div>
          <Outlet />
        </div>
      </main>

      <PreparedMovementSheet />

      {/* The action lives inside the bar, not floating above it. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-elevated/92 backdrop-blur-xl lg:hidden" aria-label="Navegação principal">
        <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-1.5">
          {mobileLeft.map((item) => (
            <BottomLink
              key={item.to}
              item={item}
              active={item.to === "/app" ? pathname === "/app" : pathname.startsWith(item.to)}
            />
          ))}
          <div className="flex justify-center">
            <button
              type="button"
              aria-label="Adicionar"
              onClick={handleAddClick}
              onPointerDown={startHold}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              onContextMenu={(e) => e.preventDefault()}
              className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-medium)] transition-transform active:scale-95"
            >
              <Plus className="size-5" />
            </button>
          </div>
          {mobileRight.map((item) => (
            <BottomLink key={item.to} item={item} active={pathname.startsWith(item.to)} />
          ))}
        </div>
      </nav>

      {prefs.density === "compact" ? null : null}
    </div>
  );
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.to}
      className={cn(
        "flex min-w-0 flex-col items-center gap-1 rounded-lg py-1.5 transition-colors",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <item.icon className={cn("size-5", active && "text-primary")} />
      <span className="w-full truncate text-center text-[10.5px] font-medium">{item.label}</span>
    </Link>
  );
}
