/**
 * Criar ou remarcar um lembrete.
 *
 * Two things only: what, and when. Delivery is shown honestly — if push is not
 * available on this device, the sheet says the reminder lives inside the app.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { NativeSheet } from "@/components/design/native-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotifications } from "@/hooks/use-notifications";
import { usePwa } from "@/hooks/use-pwa";
import { localTimezone, resolveInstant, toDateKey } from "@/lib/reminders/engine";
import { permissionState, pushSupport } from "@/lib/push/client";
import {
  RECURRENCE_LABELS,
  type RecurrenceKind,
  type Reminder,
  type ReminderEntityType,
} from "@/lib/reminders/types";
import { cn } from "@/lib/utils";

const RECURRENCES: RecurrenceKind[] = ["none", "daily", "weekly", "monthly", "yearly"];

export function ReminderSheet({
  open,
  onOpenChange,
  reminder,
  defaultTitle,
  entityType,
  entityId,
  to,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When present the sheet edits/reschedules instead of creating. */
  reminder?: Reminder;
  defaultTitle?: string;
  entityType?: ReminderEntityType;
  entityId?: string;
  to?: string;
}) {
  const { addReminder, rescheduleReminder, updateReminder } = useNotifications();
  const { standalone } = usePwa();

  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return toDateKey(date);
  }, []);

  const [title, setTitle] = useState(defaultTitle ?? "");
  const [dateKey, setDateKey] = useState(tomorrow);
  const [time, setTime] = useState("19:00");
  const [recurrence, setRecurrence] = useState<RecurrenceKind>("none");

  useEffect(() => {
    if (!open) return;
    if (reminder) {
      const at = new Date(reminder.snoozedUntil ?? reminder.scheduledAt);
      setTitle(reminder.title);
      setDateKey(toDateKey(at));
      setTime(reminder.localTime);
      setRecurrence(reminder.recurrence.kind);
    } else {
      setTitle(defaultTitle ?? "");
      setDateKey(tomorrow);
      setTime("19:00");
      setRecurrence("none");
    }
  }, [open, reminder, defaultTitle, tomorrow]);

  const support = pushSupport(standalone);
  const permission = permissionState();
  const deliveryLine =
    support === "supported" && permission === "granted"
      ? "Vais receber um aviso no telemóvel."
      : support === "needs_install"
        ? "Neste iPhone, os avisos fora da app só funcionam depois de a instalares no ecrã principal. Até lá, o lembrete aparece dentro da app."
        : permission === "denied"
          ? "Os avisos estão bloqueados no navegador. O lembrete aparece dentro da app."
          : "Por agora o lembrete aparece dentro da app.";

  const instant = resolveInstant(dateKey, time);
  const valid = title.trim().length > 0 && !Number.isNaN(instant.getTime());

  function save() {
    if (!valid) return;
    if (reminder) {
      rescheduleReminder(reminder.id, instant, time);
      updateReminder(reminder.id, { title: title.trim(), recurrence: { kind: recurrence } });
      toast.success("Lembrete atualizado.");
    } else {
      addReminder({
        title: title.trim(),
        scheduledAt: instant.toISOString(),
        localTime: time,
        timezone: localTimezone(),
        recurrence: { kind: recurrence },
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
        ...(to ? { to } : {}),
      });
      toast.success("Lembrete marcado.");
    }
    onOpenChange(false);
  }

  return (
    <NativeSheet
      open={open}
      onOpenChange={onOpenChange}
      title={reminder ? "Remarcar lembrete" : "Novo lembrete"}
      description="O que queres lembrar, e quando."
    >
      <div className="space-y-5 pb-2">
        <div className="space-y-2">
          <Label htmlFor="reminder-title">O quê?</Label>
          <Input
            id="reminder-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Rever gastos"
            autoComplete="off"
            enterKeyHint="done"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="reminder-date">Dia</Label>
            <Input
              id="reminder-date"
              type="date"
              value={dateKey}
              onChange={(event) => setDateKey(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reminder-time">Hora</Label>
            <Input
              id="reminder-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Repetir</Label>
          <div className="flex flex-wrap gap-2">
            {RECURRENCES.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setRecurrence(kind)}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm",
                  recurrence === kind
                    ? "border-transparent bg-foreground text-background"
                    : "border-border text-muted-foreground",
                )}
              >
                {RECURRENCE_LABELS[kind]}
              </button>
            ))}
          </div>
        </div>

        <p className="type-secondary">{deliveryLine}</p>

        <Button className="min-h-12 w-full" disabled={!valid} onClick={save}>
          {reminder ? "Guardar alterações" : "Marcar lembrete"}
        </Button>
      </div>
    </NativeSheet>
  );
}
