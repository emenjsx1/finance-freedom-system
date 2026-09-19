import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";

import { SectionHeader } from "@/components/design/section-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePersonal } from "@/hooks/use-personal";
import { DIRECTION_HORIZON_LABELS, type DirectionHorizon } from "@/lib/personal/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/direction")({
  head: () => ({
    meta: [
      { title: "Direção — Norte" },
      { name: "description", content: "Para onde queres ir, por palavras tuas." },
      { property: "og:title", content: "Direção — Norte" },
      { property: "og:description", content: "Agora, a seguir e futuro — escrito por ti." },
    ],
  }),
  component: DirectionPage,
});

const HORIZONS: DirectionHorizon[] = ["now", "next", "later"];

function DirectionPage() {
  const { state, setHeadline, addDirection, removeDirection } = usePersonal();
  const [horizon, setHorizon] = useState<DirectionHorizon>("now");
  const [content, setContent] = useState("");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Direção"
        subtitle="Escrito por ti. A aplicação nunca inventa a tua direção."
      />

      <section className="card-standard space-y-2">
        <Label htmlFor="headline">Numa frase, onde estás agora</Label>
        <Input
          id="headline"
          defaultValue={state.headline ?? ""}
          onBlur={(e) => setHeadline(e.target.value)}
          placeholder="A construir com calma."
        />
      </section>

      <section className="card-standard space-y-4">
        <SectionHeader title="Acrescentar" />
        <div className="grid grid-cols-3 gap-2">
          {HORIZONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setHorizon(option)}
              className={cn("card-compact text-sm", horizon === option && "ring-2 ring-primary")}
            >
              {DIRECTION_HORIZON_LABELS[option]}
            </button>
          ))}
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ex.: sair de casa dos meus pais sem pressa."
        />
        <Button
          disabled={!content.trim()}
          onClick={() => {
            addDirection({ horizon, content: content.trim() });
            setContent("");
          }}
        >
          Guardar
        </Button>
      </section>

      {HORIZONS.map((option) => {
        const items = state.direction.filter((item) => item.horizon === option);
        if (items.length === 0) return null;
        return (
          <section key={option}>
            <SectionHeader title={DIRECTION_HORIZON_LABELS[option]} />
            <div className="list-group">
              {items.map((item) => (
                <div key={item.id} className="list-row justify-between">
                  <span className="text-sm">{item.content}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remover"
                    onClick={() => removeDirection(item.id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
