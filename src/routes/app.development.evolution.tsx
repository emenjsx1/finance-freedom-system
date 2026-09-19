import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";

import { SectionHeader } from "@/components/design/section-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { usePersonal } from "@/hooks/use-personal";
import { evolutionTimeline } from "@/lib/development/engine";
import { EVOLUTION_KIND_LABELS } from "@/lib/development/types";

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${MONTHS[Number(month) - 1] ?? key} de ${year}`;
}

export const Route = createFileRoute("/app/development/evolution")({
  head: () => ({
    meta: [
      { title: "A minha evolução — Norte" },
      { name: "description", content: "O que mudou de facto, mês a mês. Nada inventado." },
      { property: "og:title", content: "A minha evolução — Norte" },
      { property: "og:description", content: "Só mudanças reais que tu criaste ou confirmaste." },
    ],
  }),
  component: EvolutionPage,
});

function EvolutionPage() {
  const { state, hideEvolution } = usePersonal();
  const events = state.development.evolution;
  const months = useMemo(() => evolutionTimeline(events), [events]);
  const hidden = events.filter((e) => e.hidden);

  return (
    <div className="space-y-8">
      <PageHeader
        title="A minha evolução"
        subtitle="Mudanças reais, pela ordem em que aconteceram. Sem notas e sem pontuações."
      />

      {months.length === 0 ? (
        <section className="card-standard text-center">
          <p className="type-secondary">
            Ainda não há nada para mostrar. Isto preenche-se sozinho à medida que fores decidindo
            coisas.
          </p>
        </section>
      ) : null}

      {months.map((month) => (
        <section key={month.key}>
          <SectionHeader title={monthLabel(month.key)} />
          <div className="list-group">
            {month.events.map((event) => (
              <div key={event.id} className="list-row justify-between gap-3">
                <span className="min-w-0">
                  <span className="type-meta block">{EVOLUTION_KIND_LABELS[event.kind]}</span>
                  <span className="text-sm">{event.title}</span>
                  {event.detail ? <span className="type-meta block">{event.detail}</span> : null}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Esconder ${event.title}`}
                  onClick={() => hideEvolution(event.id, true)}
                >
                  <EyeOff className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {hidden.length ? (
        <section>
          <SectionHeader title="Escondidos" />
          <div className="list-group">
            {hidden.map((event) => (
              <div key={event.id} className="list-row justify-between gap-3">
                <span className="text-sm text-muted-foreground">{event.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Mostrar ${event.title}`}
                  onClick={() => hideEvolution(event.id, false)}
                >
                  <Eye className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
