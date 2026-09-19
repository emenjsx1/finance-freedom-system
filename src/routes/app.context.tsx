import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";

import { SectionHeader } from "@/components/design/section-header";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePersonal } from "@/hooks/use-personal";
import {
  CONTEXT_CATEGORY_LABELS,
  CONTEXT_SOURCE_LABELS,
  type ContextCategory,
} from "@/lib/personal/types";

export const Route = createFileRoute("/app/context")({
  head: () => ({
    meta: [
      { title: "O que o Agente sabe — Norte" },
      { name: "description", content: "Tudo o que está guardado sobre ti, visível e editável." },
      { property: "og:title", content: "O que o Agente sabe — Norte" },
      { property: "og:description", content: "Contexto pessoal, sempre teu, sempre removível." },
    ],
  }),
  component: ContextPage,
});

const CATEGORIES = Object.keys(CONTEXT_CATEGORY_LABELS) as ContextCategory[];

function ContextPage() {
  const { state, addContext, updateContext, removeContext, setPermissions } = usePersonal();
  const [category, setCategory] = useState<ContextCategory>("about");
  const [content, setContent] = useState("");

  return (
    <div className="space-y-8">
      <PageHeader
        title="O que o Agente sabe"
        subtitle="Nada é guardado sem a tua confirmação. Podes apagar tudo a qualquer momento."
      />

      <section className="card-standard space-y-4">
        <SectionHeader title="O que o Agente pode consultar" />
        {(
          [
            ["financial", "O teu dinheiro", "Saldos, movimentos e reservas calculados pela aplicação."],
            ["plans", "Os teus planos", "Nomes, valores e datas dos planos que criaste."],
            ["personalContext", "Contexto pessoal", "As notas desta página."],
            ["documents", "Documentos e comprovativos", "Imagens e ficheiros que envies."],
          ] as const
        ).map(([key, title, hint]) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="type-meta">{hint}</p>
            </div>
            <Switch
              checked={state.permissions[key]}
              onCheckedChange={(checked) => setPermissions({ [key]: checked })}
              aria-label={title}
            />
          </div>
        ))}
      </section>

      <section className="card-standard space-y-4">
        <SectionHeader title="Acrescentar contexto" />
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as ContextCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((key) => (
                <SelectItem key={key} value={key}>
                  {CONTEXT_CATEGORY_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ex.: prefiro decidir sozinho antes de guardar dinheiro."
        />
        <Button
          disabled={!content.trim()}
          onClick={() => {
            addContext({ category, content: content.trim(), source: "user" });
            setContent("");
          }}
        >
          Guardar
        </Button>
      </section>

      {CATEGORIES.map((key) => {
        const items = state.context.filter((item) => item.category === key);
        if (items.length === 0) return null;
        return (
          <section key={key}>
            <SectionHeader title={CONTEXT_CATEGORY_LABELS[key]} />
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="card-compact">
                  <p className="text-sm">{item.content}</p>
                  <p className="type-meta mt-2">
                    {CONTEXT_SOURCE_LABELS[item.source]}
                    {item.state === "outdated" ? " · marcado como desatualizado" : null}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        updateContext(item.id, {
                          state: "active",
                          reviewedAt: new Date().toISOString(),
                        })
                      }
                    >
                      Ainda é verdade
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateContext(item.id, { state: "outdated" })}
                    >
                      Já mudou
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      aria-label="Apagar"
                      onClick={() => removeContext(item.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {state.context.length === 0 ? (
        <p className="card-standard type-secondary">
          Ainda não há nada guardado sobre ti.
        </p>
      ) : null}
    </div>
  );
}
