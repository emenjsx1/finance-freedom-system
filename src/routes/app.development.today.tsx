import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";

import { ActionSheet } from "@/components/development/action-sheet";
import { SectionHeader } from "@/components/design/section-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { usePersonal } from "@/hooks/use-personal";
import { ACTION_STATE_LABELS, actionState, sortActions, toDateKey } from "@/lib/development/engine";
import type { PersonalAction } from "@/lib/development/types";

export const Route = createFileRoute("/app/development/today")({
  head: () => ({
    meta: [
      { title: "Hoje — Norte" },
      { name: "description", content: "As próximas ações que escolheste, sem lista infinita." },
      { property: "og:title", content: "Hoje — Norte" },
      { property: "og:description", content: "O que decidiste fazer, e nada mais." },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { state, updateAction, removeAction, setProgramItemStatus } = usePersonal();
  const dev = state.development;
  const today = toDateKey(new Date());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PersonalAction | undefined>(undefined);

  const groups = useMemo(() => {
    const ordered = sortActions(
      dev.actions.filter((a) => a.status === "pending"),
      today,
    );
    return {
      overdue: ordered.filter((a) => actionState(a, today) === "overdue"),
      today: ordered.filter((a) => actionState(a, today) === "today"),
      upcoming: ordered.filter((a) => actionState(a, today) === "upcoming"),
      someday: ordered.filter((a) => actionState(a, today) === "someday"),
      done: dev.actions.filter((a) => a.status === "done").slice(0, 5),
    };
  }, [dev.actions, today]);

  const programToday = dev.programs
    .filter((p) => p.status === "active")
    .flatMap((program) =>
      program.items
        .filter((item) => item.status === "pending")
        .map((item) => ({ program, item })),
    )
    .slice(0, 6);

  const nothing =
    dev.actions.filter((a) => a.status === "pending").length === 0 && programToday.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hoje"
        subtitle="Só o que interessa agora. Nada aqui é uma obrigação."
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden /> Ação
          </Button>
        }
      />

      {nothing ? (
        <section className="card-standard text-center">
          <p className="type-secondary">
            Não tens nada marcado. Isso também é uma resposta válida.
          </p>
          <Button className="mt-4" variant="secondary" onClick={() => setCreating(true)}>
            Acrescentar uma ação
          </Button>
        </section>
      ) : null}

      {programToday.length ? (
        <section>
          <SectionHeader title="Dos teus programas" />
          <div className="list-group">
            {programToday.map(({ program, item }) => (
              <div key={item.id} className="list-row justify-between">
                <span className="min-w-0">
                  <span className="text-sm">{item.title}</span>
                  <Link
                    to="/app/development/programs/$programId"
                    params={{ programId: program.id }}
                    className="type-meta block underline-offset-2 hover:underline"
                  >
                    {program.title} · dia {item.day}
                  </Link>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Marcar ${item.title} como feita`}
                  onClick={() => setProgramItemStatus(program.id, item.id, "done")}
                >
                  <Check className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {(["overdue", "today", "upcoming", "someday"] as const).map((key) => {
        const list = groups[key];
        if (list.length === 0) return null;
        return (
          <section key={key}>
            <SectionHeader title={ACTION_STATE_LABELS[key]} />
            {key === "overdue" ? (
              <p className="type-meta mb-2">
                Passou a data. Podes remarcar, ajustar ou deixar de lado — não falhaste nada.
              </p>
            ) : null}
            <div className="list-group">
              {list.map((action) => (
                <div key={action.id} className="list-row justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setEditing(action)}
                  >
                    <span className="text-sm">{action.title}</span>
                    <span className="type-meta block">
                      {action.scheduledDate ?? "Sem data"}
                      {action.scheduledTime ? ` · ${action.scheduledTime}` : ""}
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateAction(action.id, { status: "skipped" })}
                    >
                      Deixar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Marcar ${action.title} como feita`}
                      onClick={() => updateAction(action.id, { status: "done" })}
                    >
                      <Check className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {groups.done.length ? (
        <section>
          <SectionHeader title="Feitas recentemente" />
          <div className="list-group">
            {groups.done.map((action) => (
              <div key={action.id} className="list-row justify-between">
                <span className="text-sm text-muted-foreground line-through">{action.title}</span>
                <Button variant="ghost" size="sm" onClick={() => removeAction(action.id)}>
                  Remover
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <ActionSheet open={creating} onOpenChange={setCreating} />
      <ActionSheet
        open={editing !== undefined}
        onOpenChange={(open) => (open ? null : setEditing(undefined))}
        action={editing}
      />
    </div>
  );
}
