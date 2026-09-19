import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { ActionSheet } from "@/components/development/action-sheet";
import { ProgramSheet } from "@/components/development/program-sheet";
import { SectionHeader } from "@/components/design/section-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { usePersonal } from "@/hooks/use-personal";
import {
  evolutionTimeline,
  programProgress,
  sortActions,
  toDateKey,
  todayFeed,
} from "@/lib/development/engine";
import { DIRECTION_HORIZON_LABELS } from "@/lib/personal/types";

export const Route = createFileRoute("/app/development/")({
  head: () => ({
    meta: [
      { title: "Desenvolvimento — Norte" },
      {
        name: "description",
        content: "O que estás a trabalhar, o que vem a seguir e o que mudou de facto.",
      },
      { property: "og:title", content: "Desenvolvimento — Norte" },
      {
        property: "og:description",
        content: "Direção, programas, ações e evolução — sem pontuações.",
      },
    ],
  }),
  component: DevelopmentHome,
});

function DevelopmentHome() {
  const { state } = usePersonal();
  const dev = state.development;
  const today = toDateKey(new Date());
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [creatingAction, setCreatingAction] = useState(false);

  const feed = useMemo(
    () => todayFeed({ actions: dev.actions, programs: dev.programs }, today, 4),
    [dev.actions, dev.programs, today],
  );

  const activePrograms = dev.programs.filter((p) => p.status === "active");
  const nowDirection = state.direction.filter((d) => d.horizon === "now");
  const upcoming = sortActions(
    dev.actions.filter((a) => a.status === "pending" && !a.programItemId),
    today,
  ).slice(0, 4);
  const recent = evolutionTimeline(dev.evolution)[0]?.events.slice(0, 3) ?? [];

  const everythingEmpty =
    nowDirection.length === 0 &&
    activePrograms.length === 0 &&
    dev.actions.length === 0 &&
    dev.evolution.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Desenvolvimento"
        subtitle="O que estás a construir na tua vida, não só no teu dinheiro."
      />

      {everythingEmpty ? (
        <section className="card-standard space-y-4 text-center">
          <p className="type-secondary">
            Não precisas de ter a vida decidida para começar. Podes só escrever onde estás, ou falar
            com o Agente e ver o que aparece.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link to="/app/agent">Falar sobre a minha vida</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/app/direction">Escrever a minha direção</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {nowDirection.length ? (
        <section>
          <SectionHeader title="A minha direção" actionLabel="Ver" to="/app/direction" />
          <div className="list-group">
            {nowDirection.slice(0, 3).map((item) => (
              <div key={item.id} className="list-row justify-between">
                <span className="text-sm">{item.content}</span>
                <span className="type-meta">{DIRECTION_HORIZON_LABELS[item.horizon]}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader title="Agora" actionLabel="Hoje" to="/app/development/today" />
        {feed.empty ? (
          <div className="card-standard flex items-center justify-between gap-3">
            <p className="type-secondary">Nada marcado para hoje.</p>
            <Button size="sm" variant="secondary" onClick={() => setCreatingAction(true)}>
              <Plus className="size-4" aria-hidden /> Ação
            </Button>
          </div>
        ) : (
          <div className="list-group">
            {feed.entries.map((entry) => (
              <div key={entry.id} className="list-row justify-between">
                <span className="min-w-0">
                  <span className="text-sm">{entry.title}</span>
                  {entry.detail ? <span className="type-meta block">{entry.detail}</span> : null}
                </span>
                <span className="type-meta">
                  {entry.state === "overdue" ? "Atrasada" : (entry.time ?? "Hoje")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Programas" actionLabel="Ver todos" to="/app/development/programs" />
        {activePrograms.length ? (
          <div className="space-y-3">
            {activePrograms.slice(0, 2).map((program) => {
              const progress = programProgress(program, today);
              return (
                <Link
                  key={program.id}
                  to="/app/development/programs/$programId"
                  params={{ programId: program.id }}
                  className="card-standard block"
                >
                  <p className="type-heading">{program.title}</p>
                  <p className="type-meta mt-1">
                    {progress.currentDay
                      ? `Dia ${progress.currentDay} de ${progress.daysTotal}`
                      : `${progress.daysTotal} dias`}{" "}
                    · {progress.done} de {progress.total} feitos
                  </p>
                  {progress.nextItem ? (
                    <p className="type-secondary mt-2">A seguir: {progress.nextItem.title}</p>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="card-standard flex items-center justify-between gap-3">
            <p className="type-secondary">Sem programas a decorrer.</p>
            <Button size="sm" variant="secondary" onClick={() => setCreatingProgram(true)}>
              Criar
            </Button>
          </div>
        )}
      </section>

      {upcoming.length ? (
        <section>
          <SectionHeader title="Próximas ações" actionLabel="Ver" to="/app/development/today" />
          <div className="list-group">
            {upcoming.map((action) => (
              <div key={action.id} className="list-row justify-between">
                <span className="text-sm">{action.title}</span>
                <span className="type-meta">{action.scheduledDate ?? "Sem data"}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="list-group">
        <Link to="/app/development/evolution" className="list-row justify-between">
          <span>A minha evolução</span>
          <span className="type-meta">{dev.evolution.length || "Ainda nada"}</span>
        </Link>
        <Link to="/app/development/decisions" className="list-row justify-between">
          <span>As minhas decisões</span>
          <span className="type-meta">{dev.decisions.length || "Nenhuma"}</span>
        </Link>
        <Link to="/app/review" className="list-row justify-between">
          <span>A minha revisão</span>
          <span className="type-meta">Semana e mês</span>
        </Link>
      </section>

      {recent.length ? (
        <section>
          <SectionHeader title="Mudanças recentes" actionLabel="Ver" to="/app/development/evolution" />
          <div className="list-group">
            {recent.map((event) => (
              <div key={event.id} className="list-row justify-between">
                <span className="text-sm">{event.title}</span>
                <span className="type-meta">{event.at.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card-standard">
        <p className="type-secondary">
          Podes simplesmente falar. O Agente ouve, pergunta e só guarda alguma coisa se lhe disseres
          que sim.
        </p>
        <Button className="mt-4" variant="secondary" asChild>
          <Link to="/app/agent">Falar sobre a minha vida</Link>
        </Button>
      </section>

      <ProgramSheet open={creatingProgram} onOpenChange={setCreatingProgram} />
      <ActionSheet open={creatingAction} onOpenChange={setCreatingAction} />
    </div>
  );
}
