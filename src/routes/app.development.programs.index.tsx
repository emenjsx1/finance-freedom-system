import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";

import { ProgramSheet } from "@/components/development/program-sheet";
import { SectionHeader } from "@/components/design/section-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { usePersonal } from "@/hooks/use-personal";
import { programProgress, toDateKey } from "@/lib/development/engine";
import { PROGRAM_STATUS_LABELS, type ProgramStatus } from "@/lib/development/types";

const GROUPS: ProgramStatus[] = ["active", "paused", "completed", "cancelled"];

export const Route = createFileRoute("/app/development/programs/")({
  head: () => ({
    meta: [
      { title: "Programas — Norte" },
      { name: "description", content: "Caminhos curtos e estruturados para trabalhar uma coisa de cada vez." },
      { property: "og:title", content: "Programas — Norte" },
      { property: "og:description", content: "3, 7, 14, 30 ou 90 dias. Com início e fim." },
    ],
  }),
  component: ProgramsPage,
});

function ProgramsPage() {
  const { state } = usePersonal();
  const today = toDateKey(new Date());
  const [creating, setCreating] = useState(false);
  const programs = state.development.programs;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Programas"
        subtitle="Um caminho com início e fim, para trabalhar uma coisa durante uns dias."
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden /> Novo
          </Button>
        }
      />

      {programs.length === 0 ? (
        <section className="card-standard text-center">
          <p className="type-secondary">
            Ainda não tens programas. Um programa é só isto: alguns dias com passos claros, que
            acaba quando acaba.
          </p>
          <Button className="mt-4" onClick={() => setCreating(true)}>
            Criar um programa
          </Button>
        </section>
      ) : null}

      {GROUPS.map((status) => {
        const list = programs.filter((p) => p.status === status);
        if (list.length === 0) return null;
        return (
          <section key={status}>
            <SectionHeader title={PROGRAM_STATUS_LABELS[status]} />
            <div className="space-y-3">
              {list.map((program) => {
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
                    {program.purpose ? (
                      <p className="type-secondary mt-2 line-clamp-2">{program.purpose}</p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <ProgramSheet open={creating} onOpenChange={setCreating} />
    </div>
  );
}
