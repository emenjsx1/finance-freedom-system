import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { NativeSheet } from "@/components/design/native-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePersonal } from "@/hooks/use-personal";
import { toDateKey } from "@/lib/development/engine";
import {
  PROGRAM_DURATIONS,
  PROGRAM_ITEM_TYPE_LABELS,
  type ProgramItemType,
} from "@/lib/development/types";
import { cn } from "@/lib/utils";

export interface ProgramDraftItem {
  type: ProgramItemType;
  title: string;
  day: number;
}

export interface ProgramDraft {
  title: string;
  purpose?: string | undefined;
  durationDays: number;
  planId?: string | undefined;
  items: ProgramDraftItem[];
}

const ITEM_TYPES: ProgramItemType[] = ["action", "reflection", "checkin", "review", "milestone"];

/**
 * A program is a temporary, structured path. It is always previewed in full
 * before it exists — nothing is scheduled without the person confirming it,
 * whether the draft came from the person or from the Agent.
 */
export function ProgramSheet({
  open,
  onOpenChange,
  draft,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft?: ProgramDraft | undefined;
  onCreated?: ((programId: string) => void) | undefined;
}) {
  const { createProgram, state } = usePersonal();
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [duration, setDuration] = useState(7);
  const [startDate, setStartDate] = useState(toDateKey(new Date()));
  const [planId, setPlanId] = useState("");
  const [items, setItems] = useState<ProgramDraftItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [newType, setNewType] = useState<ProgramItemType>("action");

  useEffect(() => {
    if (!open) return;
    setTitle(draft?.title ?? "");
    setPurpose(draft?.purpose ?? "");
    setDuration(draft?.durationDays ?? 7);
    setStartDate(toDateKey(new Date()));
    setPlanId(draft?.planId ?? "");
    setItems(draft?.items ?? []);
    setNewItem("");
    setNewType("action");
  }, [open, draft]);

  const plans = state.plans.filter((p) => p.status === "active" || p.status === "idea");

  function submit() {
    const program = createProgram({
      title: title.trim(),
      purpose: purpose.trim() || undefined,
      status: "active",
      startDate,
      durationDays: duration,
      planId: planId || undefined,
      source: draft ? "agent_confirmed" : "user",
      items: items.map((item, index) => ({
        type: item.type,
        title: item.title,
        day: Math.min(Math.max(1, item.day), duration),
        reminder: false,
        order: index,
      })),
    });
    onOpenChange(false);
    onCreated?.(program.id);
  }

  return (
    <NativeSheet
      open={open}
      onOpenChange={onOpenChange}
      title={draft ? "Rever programa" : "Novo programa"}
      description="Um caminho com início e fim. Sem pontuações e sem sequências a manter."
      className="max-h-[92dvh] overflow-y-auto"
    >
      <div className="space-y-5 pb-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="program-title">Nome</Label>
          <Input
            id="program-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: organizar a minha vida financeira"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="program-purpose">Para quê (opcional)</Label>
          <Textarea
            id="program-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={2}
            placeholder="O que queres que esteja diferente no fim."
          />
        </div>

        <div className="space-y-2">
          <Label>Duração</Label>
          <div className="grid grid-cols-5 gap-2">
            {PROGRAM_DURATIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDuration(option)}
                className={cn("card-compact text-sm", duration === option && "ring-2 ring-primary")}
              >
                {option}d
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="program-start">Começa em</Label>
          <Input
            id="program-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        {plans.length ? (
          <div className="space-y-2">
            <Label htmlFor="program-plan">Ligado a um plano (opcional)</Label>
            <select
              id="program-plan"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
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

        <div className="space-y-3">
          <Label>Dias</Label>
          {items.length ? (
            <ul className="list-group">
              {items.map((item, index) => (
                <li key={`${item.title}-${index}`} className="list-row justify-between">
                  <span className="min-w-0">
                    <span className="type-meta block">
                      Dia {item.day} · {PROGRAM_ITEM_TYPE_LABELS[item.type]}
                    </span>
                    <span className="text-sm">{item.title}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${item.title}`}
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-meta">Ainda sem dias. Acrescenta o que queres fazer.</p>
          )}

          <div className="grid grid-cols-5 gap-2">
            {ITEM_TYPES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setNewType(option)}
                className={cn(
                  "card-compact text-[0.7rem] leading-tight",
                  newType === option && "ring-2 ring-primary",
                )}
              >
                {PROGRAM_ITEM_TYPE_LABELS[option]}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder={`Dia ${Math.min(items.length + 1, duration)}`}
            />
            <Button
              variant="secondary"
              disabled={!newItem.trim()}
              onClick={() => {
                setItems((prev) => [
                  ...prev,
                  { type: newType, title: newItem.trim(), day: Math.min(prev.length + 1, duration) },
                ]);
                setNewItem("");
              }}
            >
              Juntar
            </Button>
          </div>
        </div>

        <Button className="w-full" disabled={!title.trim() || items.length === 0} onClick={submit}>
          Criar programa
        </Button>
        <p className="type-meta text-center">
          Podes pausar, ajustar ou terminar o programa a qualquer momento.
        </p>
      </div>
    </NativeSheet>
  );
}
