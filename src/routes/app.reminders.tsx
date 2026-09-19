/**
 * Lembretes.
 *
 * A reminder is the person's intention with a time on it. Missing one is never
 * a failure: a past reminder is simply "passou da hora", with the same three
 * calm choices — feito, adiar, remarcar.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlarmClock, Check, Clock3, MoreHorizontal, Plus, Repeat, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ReminderSheet } from "@/components/reminders/reminder-sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import { usePwa } from "@/hooks/use-pwa";
import { SNOOZE_PRESETS, groupOf, sortReminders, type ReminderGroup } from "@/lib/reminders/engine";
import { permissionState, pushSupport } from "@/lib/push/client";
import { REMINDER_STATUS_LABELS, type Reminder } from "@/lib/reminders/types";

export const Route = createFileRoute("/app/reminders")({
  head: () => ({
    meta: [
      { title: "Lembretes — Norte" },
      { name: "description", content: "As coisas que pediste para te lembrar, à hora que escolheste." },
      { property: "og:title", content: "Lembretes — Norte" },
      { property: "og:description", content: "As coisas que pediste para te lembrar, à hora que escolheste." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RemindersPage,
});

const GROUP_LABELS: Record<ReminderGroup, string> = {
  overdue: "Passou da hora",
  today: "Hoje",
  week: "Esta semana",
  later: "Mais tarde",
  done: "Anteriores",
};

const GROUP_ORDER: ReminderGroup[] = ["overdue", "today", "week", "later", "done"];

function whenLabel(reminder: Reminder): string {
  const at = new Date(reminder.snoozedUntil ?? reminder.scheduledAt);
  return at.toLocaleString("pt-PT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RemindersPage() {
  const { reminders, setReminderState, snoozeReminder, deleteReminder } = useNotifications();
  const { standalone } = usePwa();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);

  const now = new Date();
  const grouped = useMemo(() => {
    const map = new Map<ReminderGroup, Reminder[]>();
    for (const reminder of sortReminders(reminders)) {
      const group = groupOf(reminder, now);
      map.set(group, [...(map.get(group) ?? []), reminder]);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders]);

  const support = pushSupport(standalone);
  const permission = permissionState();
  const deliveryNote =
    support === "supported" && permission === "granted"
      ? null
      : support === "needs_install"
        ? "Para receberes avisos fora da app neste iPhone, instala-a no ecrã principal (Partilhar › Adicionar ao ecrã principal)."
        : permission === "denied"
          ? "Os avisos estão bloqueados no navegador, por isso os lembretes aparecem só aqui dentro."
          : "Os lembretes aparecem aqui dentro. Podes ligar os avisos no telemóvel em Eu › Notificações.";

  return (
    <div>
      <PageHeader
        title="Lembretes"
        subtitle="O que pediste para lembrar, à hora que escolheste."
        action={
          <Button size="sm" className="min-h-11" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Novo
          </Button>
        }
      />

      {deliveryNote ? (
        <p className="type-secondary mb-6 rounded-[var(--r-card)] border border-border bg-elevated p-4">
          {deliveryNote}
        </p>
      ) : null}

      {reminders.length === 0 ? (
        <EmptyState
          icon={AlarmClock}
          title="Ainda não tens lembretes."
          description="Marca um aqui, ou pede ao Agente: «Lembra-me amanhã às 19h de rever os gastos.»"
          action={
            <Button className="min-h-12" onClick={() => setCreating(true)}>
              Marcar lembrete
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {GROUP_ORDER.filter((group) => (grouped.get(group) ?? []).length > 0).map((group) => (
            <section key={group}>
              <h2 className="type-eyebrow mb-3">{GROUP_LABELS[group]}</h2>
              <ul className="space-y-2">
                {(grouped.get(group) ?? []).map((reminder) => (
                  <li
                    key={reminder.id}
                    className="rounded-[var(--r-card)] border border-border bg-elevated p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="type-body font-medium">{reminder.title}</p>
                        <p className="type-secondary mt-1 flex flex-wrap items-center gap-2">
                          <Clock3 className="size-3.5" aria-hidden />
                          {whenLabel(reminder)}
                          {reminder.recurrence.kind !== "none" ? (
                            <Repeat className="size-3.5" aria-hidden />
                          ) : null}
                          {reminder.status !== "scheduled" ? (
                            <span>· {REMINDER_STATUS_LABELS[reminder.status]}</span>
                          ) : null}
                          {reminder.source === "agent_confirmed" ? <span>· do Agente</span> : null}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-11" aria-label="Opções do lembrete">
                            <MoreHorizontal className="size-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setReminderState(reminder.id, "completed")}>
                            <Check className="size-4" /> Marcar como feito
                          </DropdownMenuItem>
                          {SNOOZE_PRESETS.map((preset) => (
                            <DropdownMenuItem
                              key={preset.id}
                              onClick={() => snoozeReminder(reminder.id, preset.minutes)}
                            >
                              <Clock3 className="size-4" /> Adiar {preset.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem onClick={() => setEditing(reminder)}>
                            <AlarmClock className="size-4" /> Remarcar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteReminder(reminder.id)}>
                            <Trash2 className="size-4" /> Apagar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ReminderSheet open={creating} onOpenChange={setCreating} />
      <ReminderSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        {...(editing ? { reminder: editing } : {})}
      />
    </div>
  );
}
