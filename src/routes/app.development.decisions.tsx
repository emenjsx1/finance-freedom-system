import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";

import { NativeSheet } from "@/components/design/native-sheet";
import { SectionHeader } from "@/components/design/section-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePersonal } from "@/hooks/use-personal";
import { toDateKey } from "@/lib/development/engine";
import { DECISION_STATUS_LABELS, type DecisionStatus } from "@/lib/development/types";

const STATUSES: DecisionStatus[] = ["active", "revisit", "changed"];

export const Route = createFileRoute("/app/development/decisions")({
  head: () => ({
    meta: [
      { title: "As minhas decisões — Finan." },
      { name: "description", content: "As decisões que quiseste guardar, com a razão e a data." },
      { property: "og:title", content: "As minhas decisões — Finan." },
      { property: "og:description", content: "Para te lembrares do que já decidiste, e porquê." },
    ],
  }),
  component: DecisionsPage,
});

function DecisionsPage() {
  const { state, addDecision, updateDecision, removeDecision } = usePersonal();
  const decisions = state.development.decisions;
  const [open, setOpen] = useState(false);
  const [statement, setStatement] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(toDateKey(new Date()));

  function submit() {
    addDecision({
      statement: statement.trim(),
      reason: reason.trim() || undefined,
      date,
      source: "user",
    });
    setStatement("");
    setReason("");
    setOpen(false);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="As minhas decisões"
        subtitle="O que já decidiste, para não voltares a decidir a mesma coisa do zero."
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden /> Nova
          </Button>
        }
      />

      {decisions.length === 0 ? (
        <section className="card-standard text-center">
          <p className="type-secondary">
            Ainda não guardaste nenhuma decisão. Por exemplo: "este ano não compro carro".
          </p>
          <Button className="mt-4" onClick={() => setOpen(true)}>
            Guardar uma decisão
          </Button>
        </section>
      ) : (
        <section>
          <SectionHeader title="Guardadas" />
          <div className="space-y-3">
            {decisions.map((decision) => (
              <article key={decision.id} className="card-standard">
                <p className="type-meta">
                  {decision.date} · {DECISION_STATUS_LABELS[decision.status]}
                </p>
                <p className="type-heading mt-1">{decision.statement}</p>
                {decision.reason ? (
                  <p className="type-secondary mt-1">{decision.reason}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUSES.filter((s) => s !== decision.status).map((s) => (
                    <Button
                      key={s}
                      variant="secondary"
                      size="sm"
                      onClick={() => updateDecision(decision.id, { status: s })}
                    >
                      {DECISION_STATUS_LABELS[s]}
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => removeDecision(decision.id)}>
                    Remover
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <NativeSheet
        open={open}
        onOpenChange={setOpen}
        title="Guardar uma decisão"
        description="Escreve-a como a dirias em voz alta."
      >
        <div className="space-y-5 pb-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="decision-statement">A decisão</Label>
            <Input
              id="decision-statement"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Ex.: este ano não compro carro"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="decision-reason">Porquê (opcional)</Label>
            <Textarea
              id="decision-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="decision-date">Quando decidiste</Label>
            <Input
              id="decision-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={!statement.trim()} onClick={submit}>
            Guardar decisão
          </Button>
        </div>
      </NativeSheet>
    </div>
  );
}
