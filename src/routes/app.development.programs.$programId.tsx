import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft } from "lucide-react";

import { SectionHeader } from "@/components/design/section-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePersonal } from "@/hooks/use-personal";
import { programProgress, toDateKey } from "@/lib/development/engine";
import { PROGRAM_ITEM_TYPE_LABELS, PROGRAM_STATUS_LABELS } from "@/lib/development/types";

export const Route = createFileRoute("/app/development/programs/$programId")({
  head: () => ({
    meta: [
      { title: "Programa — Finan." },
      { name: "description", content: "Os dias deste programa e o que mudou de facto." },
      { property: "og:title", content: "Programa — Finan." },
      { property: "og:description", content: "Sem pontuações: só o que fizeste e o que deixaste." },
    ],
  }),
  component: ProgramDetail,
});

function ProgramDetail() {
  const { programId } = Route.useParams();
  const navigate = useNavigate();
  const { state, updateProgram, setProgramItemStatus, completeProgram, removeProgram, addReflection } =
    usePersonal();
  const today = toDateKey(new Date());
  const program = state.development.programs.find((p) => p.id === programId);
  const [note, setNote] = useState("");

  if (!program) {
    return (
      <div className="space-y-6">
        <PageHeader title="Programa" subtitle="Este programa já não existe." />
        <Button variant="secondary" asChild>
          <Link to="/app/development/programs">Voltar aos programas</Link>
        </Button>
      </div>
    );
  }

  const progress = programProgress(program, today);
  const plan = program.planId ? state.plans.find((p) => p.id === program.planId) : undefined;
  const reflections = state.development.reflections.filter((r) => r.programId === program.id);

  return (
    <div className="space-y-8">
      <Link
        to="/app/development/programs"
        className="type-meta inline-flex items-center gap-1 hover:underline"
      >
        <ChevronLeft className="size-3.5" aria-hidden /> Programas
      </Link>

      <PageHeader title={program.title} {...(program.purpose ? { subtitle: program.purpose } : {})} />

      <section className="card-standard">
        <p className="type-meta">{PROGRAM_STATUS_LABELS[program.status]}</p>
        <p className="type-heading mt-1">
          {progress.currentDay
            ? `Dia ${progress.currentDay} de ${progress.daysTotal}`
            : progress.finished
              ? "Terminado"
              : `Começa em ${program.startDate}`}
        </p>
        <p className="type-secondary mt-1">
          {progress.done} feitos · {progress.skipped} deixados · {progress.pending} por fazer
        </p>
        {plan ? (
          <p className="type-meta mt-3">
            Ligado ao plano{" "}
            <Link to="/app/plans/$planId" params={{ planId: plan.id }} className="underline">
              {plan.name}
            </Link>
          </p>
        ) : null}
      </section>

      <section>
        <SectionHeader title="Os dias" />
        <div className="list-group">
          {program.items
            .slice()
            .sort((a, b) => (a.day === b.day ? a.order - b.order : a.day - b.day))
            .map((item) => (
              <div key={item.id} className="list-row justify-between gap-3">
                <span className="min-w-0">
                  <span className="type-meta block">
                    Dia {item.day} · {PROGRAM_ITEM_TYPE_LABELS[item.type]}
                  </span>
                  <span
                    className={
                      item.status === "done"
                        ? "text-sm text-muted-foreground line-through"
                        : "text-sm"
                    }
                  >
                    {item.title}
                  </span>
                </span>
                {item.status === "pending" ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setProgramItemStatus(program.id, item.id, "skipped")}
                    >
                      Deixar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Marcar ${item.title} como feito`}
                      onClick={() => setProgramItemStatus(program.id, item.id, "done")}
                    >
                      <Check className="size-4" aria-hidden />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProgramItemStatus(program.id, item.id, "pending")}
                  >
                    Repor
                  </Button>
                )}
              </div>
            ))}
        </div>
      </section>

      {progress.finished && program.status === "active" ? (
        <section className="card-standard">
          <p className="type-heading">Chegaste ao fim destes {program.durationDays} dias.</p>
          <p className="type-secondary mt-1">
            Queres rever o que mudou? Não há nota nem pontuação — só o que aconteceu.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => completeProgram(program.id)}>Terminar programa</Button>
            <Button variant="secondary" asChild>
              <Link to="/app/review">Ver a minha revisão</Link>
            </Button>
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader title="Notas" />
        {reflections.length ? (
          <div className="list-group mb-3">
            {reflections.map((r) => (
              <div key={r.id} className="list-row">
                <span className="min-w-0">
                  <span className="type-meta block">{r.date}</span>
                  <span className="text-sm">{r.content}</span>
                </span>
              </div>
            ))}
          </div>
        ) : null}
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="O que notaste hoje (opcional)"
        />
        <Button
          className="mt-2"
          variant="secondary"
          disabled={!note.trim()}
          onClick={() => {
            addReflection({ date: today, content: note.trim(), programId: program.id });
            setNote("");
          }}
        >
          Guardar nota
        </Button>
      </section>

      <section className="flex flex-wrap gap-2">
        {program.status === "active" ? (
          <Button variant="secondary" onClick={() => updateProgram(program.id, { status: "paused" })}>
            Pausar
          </Button>
        ) : null}
        {program.status === "paused" ? (
          <Button variant="secondary" onClick={() => updateProgram(program.id, { status: "active" })}>
            Retomar
          </Button>
        ) : null}
        {program.status !== "completed" ? (
          <Button variant="secondary" onClick={() => completeProgram(program.id)}>
            Terminar
          </Button>
        ) : null}
        <Button
          variant="ghost"
          onClick={() => {
            removeProgram(program.id);
            void navigate({ to: "/app/development/programs" });
          }}
        >
          Remover
        </Button>
      </section>
    </div>
  );
}
