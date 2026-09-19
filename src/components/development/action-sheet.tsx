import { useEffect, useState } from "react";

import { NativeSheet } from "@/components/design/native-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePersonal } from "@/hooks/use-personal";
import { toDateKey } from "@/lib/development/engine";
import { ACTION_PRIORITY_LABELS, type ActionPriority, type PersonalAction } from "@/lib/development/types";
import { cn } from "@/lib/utils";

const PRIORITIES: ActionPriority[] = ["now", "important", "later"];

/**
 * One action. An action is something the person decided to do — it is not a
 * financial commitment and it is not a reminder. The reminder is only the
 * notification attached to it.
 */
export function ActionSheet({
  open,
  onOpenChange,
  action,
  planId,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: PersonalAction | undefined;
  planId?: string | undefined;
  defaultDate?: string | undefined;
}) {
  const { addAction, updateAction, state } = usePersonal();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<ActionPriority>("important");
  const [reminder, setReminder] = useState(false);
  const [linkedPlan, setLinkedPlan] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setTitle(action?.title ?? "");
    setNotes(action?.notes ?? "");
    setDate(action?.scheduledDate ?? defaultDate ?? toDateKey(new Date()));
    setTime(action?.scheduledTime ?? "");
    setPriority(action?.priority ?? "important");
    setReminder(action?.reminder ?? false);
    setLinkedPlan(action?.planId ?? planId ?? "");
  }, [open, action, planId, defaultDate]);

  const plans = state.plans.filter((p) => p.status === "active" || p.status === "idea");

  function submit() {
    const payload = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      priority,
      reminder,
      scheduledDate: date || undefined,
      scheduledTime: time || undefined,
      planId: linkedPlan || undefined,
      source: "user" as const,
    };
    if (action) updateAction(action.id, payload);
    else addAction(payload);
    onOpenChange(false);
  }

  return (
    <NativeSheet
      open={open}
      onOpenChange={onOpenChange}
      title={action ? "Editar ação" : "Nova ação"}
      description="Uma coisa concreta que decidiste fazer."
    >
      <div className="space-y-5 pb-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="action-title">O que vais fazer</Label>
          <Input
            id="action-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: rever os custos mensais"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {PRIORITIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPriority(option)}
              className={cn("card-compact text-sm", priority === option && "ring-2 ring-primary")}
            >
              {ACTION_PRIORITY_LABELS[option]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="action-date">Quando</Label>
            <Input id="action-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action-time">Hora (opcional)</Label>
            <Input id="action-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        {plans.length ? (
          <div className="space-y-2">
            <Label htmlFor="action-plan">Ligada a um plano (opcional)</Label>
            <select
              id="action-plan"
              value={linkedPlan}
              onChange={(e) => setLinkedPlan(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="">Sem plano</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <label className="flex items-center justify-between gap-4">
          <span className="text-sm">
            Lembrar-me
            <span className="type-meta block">Só te avisa se as notificações estiverem ligadas.</span>
          </span>
          <Switch checked={reminder} onCheckedChange={setReminder} />
        </label>

        <div className="space-y-2">
          <Label htmlFor="action-notes">Nota (opcional)</Label>
          <Textarea id="action-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <Button className="w-full" disabled={!title.trim()} onClick={submit}>
          {action ? "Guardar" : "Adicionar ação"}
        </Button>
      </div>
    </NativeSheet>
  );
}
