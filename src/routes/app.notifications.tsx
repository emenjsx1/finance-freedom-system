import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  Compass,
  Lock,
  Receipt,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlarmClock,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronRight,
  Settings2,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import { filterNotifications } from "@/lib/notifications/service";
import { relativeTime } from "@/lib/notifications/time";
import {
  ACTION_LABELS,
  CATEGORY_LABELS,
  type AppNotification,
  type NotificationFilter,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notificações — Norte" },
      { name: "description", content: "O que aconteceu com o teu dinheiro e o que precisa de atenção." },
      { property: "og:title", content: "Notificações — Norte" },
      { property: "og:description", content: "O que aconteceu com o teu dinheiro e o que precisa de atenção." },
    ],
  }),
  component: NotificationsPage,
});

const FILTERS: { key: NotificationFilter; label: string }[] = [
  { key: "unread", label: "Por ler" },
  { key: "all", label: "Tudo" },
  { key: "financial", label: "Financeiro" },
  { key: "goals", label: "Objetivos" },
  { key: "planning", label: "Planeamento" },
  { key: "agent", label: "Agente" },
];

const ICONS: Record<string, LucideIcon> = {
  upcoming_payment: CalendarDays,
  payments_digest: CalendarDays,
  goal_milestone: Target,
  goal_funded: Target,
  goal_deadline: Target,
  goal_contribution: Target,
  unallocated_money: Compass,
  protected_withdrawal: Lock,
  large_expense: Receipt,
  low_wallet_balance: TriangleAlert,
  low_account_balance: TriangleAlert,
  insight: Sparkles,
  daily_brief: Sun,
  weekly_review: CalendarRange,
  monthly_review: BookOpen,
  security: ShieldCheck,
  system: Settings2,
};

function NotificationsPage() {
  const { visible, unread, markRead, markAllRead, dismiss, snooze, act } = useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>("unread");
  const navigate = useNavigate();

  const list = useMemo(() => filterNotifications(visible, filter), [visible, filter]);

  function openNotification(notification: AppNotification) {
    markRead(notification.id);
    if (notification.to) navigate({ to: notification.to });
  }

  function handleAction(notification: AppNotification, action: string) {
    if (action === "remind_later") return;
    act(notification, action);
    if ((action === "view" || action === "open_report" || action === "distribute") && notification.to) {
      navigate({ to: notification.to });
    }
    if (action === "ask_agent") navigate({ to: "/app/agent" });
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <PageHeader
          title="Notificações"
          subtitle={unread ? `${unread} por ler` : "Tudo visto."}
        />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={markAllRead} disabled={!unread}>
            <CheckCheck className="size-4" />
            Marcar lidas
          </Button>
          <Link
            to="/app/notification-settings"
            aria-label="Definições de notificações"
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <Settings2 className="size-[18px]" />
          </Link>
        </div>
      </div>

      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === item.key
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-border/70 text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={filter === "unread" ? BellOff : Bell}
          title={filter === "unread" ? "Nada por ler" : "Ainda sem notificações"}
          description="Avisamos-te quando algo merecer a tua atenção. Importante, não frequente."
        />
      ) : (
        <ul className="space-y-2">
          {list.map((notification) => (
            <li
              key={notification.id}
              className={cn(
                "rounded-2xl border border-border/70 bg-surface p-4 transition-colors",
                !notification.read && "border-primary/25 bg-primary/[0.04]",
              )}
            >
              <div className="flex gap-3">
                <span aria-hidden className="icon-tile mt-0.5 size-9 shrink-0">
                  {(() => {
                    const Icon = ICONS[notification.payload.kind] ?? Sparkles;
                    return <Icon className="size-4 text-muted-foreground" />;
                  })()}
                </span>
                <button
                  type="button"
                  onClick={() => openNotification(notification)}
                  className="flex-1 text-left"
                >
                  <p className="text-sm font-medium leading-snug">{notification.title}</p>
                  {notification.body ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{notification.body}</p>
                  ) : null}
                  <p className="type-meta mt-1.5">
                    {CATEGORY_LABELS[notification.category]} · {relativeTime(notification.createdAt)}
                  </p>
                </button>
                <button
                  type="button"
                  aria-label="Remover"
                  onClick={() => dismiss(notification.id)}
                  className="size-7 shrink-0 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <X className="mx-auto size-4" />
                </button>
              </div>

              {notification.actions.length ? (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-8">
                  {notification.actions.map((action) =>
                    action === "remind_later" ? (
                      <SnoozeMenu
                        key={action}
                        onPick={(until) => snooze(notification.id, until)}
                      />
                    ) : (
                      <Button
                        key={action}
                        size="xs"
                        variant={action === "view" ? "ghost" : "secondary"}
                        onClick={() => handleAction(notification, action)}
                      >
                        {action === "view" ? (
                          <>
                            {ACTION_LABELS[action]}
                            <ChevronRight className="size-3.5" />
                          </>
                        ) : (
                          <>
                            {action === "mark_paid" ? <Check className="size-3.5" /> : null}
                            {ACTION_LABELS[action]}
                          </>
                        )}
                      </Button>
                    ),
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SnoozeMenu({ onPick }: { onPick: (until: Date) => void }) {
  function inHours(hours: number) {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date;
  }
  function tomorrowMorning() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
    return date;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="xs" variant="secondary">
          <AlarmClock className="size-3.5" />
          Lembrar mais tarde
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onPick(inHours(1))}>Daqui a 1 hora</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPick(inHours(4))}>Ainda hoje</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPick(tomorrowMorning())}>Amanhã de manhã</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPick(inHours(72))}>Daqui a 3 dias</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
