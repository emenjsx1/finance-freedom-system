import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgent } from "@/hooks/use-agent";
import { usePrefs } from "@/hooks/use-prefs";
import {
  FOCUS_OPTIONS,
  MEMORY_CATEGORY_LABELS,
  type MemoryCategory,
} from "@/lib/agent/types";
import type { AgentStyle } from "@/lib/prefs/types";

export const Route = createFileRoute("/app/agent-settings")({
  head: () => ({
    meta: [
      { title: "Agente · Definições — Finance OS" },
      {
        name: "description",
        content: "Nome, estilo de comunicação, perfil pessoal e memória do teu assistente.",
      },
      { property: "og:title", content: "Agente · Definições — Finance OS" },
      { property: "og:description", content: "Controla o que o teu assistente sabe sobre ti." },
    ],
  }),
  component: AgentSettingsPage,
});

const STYLE_LABELS: Record<AgentStyle, string> = {
  concise: "Conciso",
  balanced: "Equilibrado",
  detailed: "Detalhado",
};

function AgentSettingsPage() {
  const { prefs, update } = usePrefs();
  const { state, addMemory, deleteMemory, updateMemory, updateProfile } = useAgent();
  const [newMemory, setNewMemory] = useState("");
  const [newCategory, setNewCategory] = useState<MemoryCategory>("goals");

  return (
    <div className="space-y-9">
      <PageHeader title="Agente" subtitle="Personaliza o assistente e controla o que ele recorda." />

      <section className="card-standard space-y-4">
        <h2 className="type-section">Personalização</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="agent-name">Nome do assistente</Label>
            <Input
              id="agent-name"
              value={prefs.agentName}
              maxLength={24}
              onChange={(e) => update({ agentName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="agent-style">Estilo de comunicação</Label>
            <Select
              value={prefs.agentStyle}
              onValueChange={(value) => update({ agentStyle: value as AgentStyle })}
            >
              <SelectTrigger id="agent-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STYLE_LABELS) as AgentStyle[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {STYLE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ToggleRow
          label="Resumos proativos"
          description="Mostrar o resumo do dia no Início."
          checked={prefs.agentProactiveSummaries}
          onChange={(v) => update({ agentProactiveSummaries: v })}
        />
        <ToggleRow
          label="Observações factuais"
          description="Padrões calculados a partir dos teus movimentos."
          checked={prefs.agentInsights}
          onChange={(v) => update({ agentInsights: v })}
        />
      </section>

      <section className="card-standard space-y-4">
        <div>
          <h2 className="type-section">Perfil</h2>
          <p className="type-caption mt-1">Opcional. Só o que quiseres partilhar.</p>
        </div>
        <div>
          <Label htmlFor="preferred-name">Como queres ser tratado?</Label>
          <Input
            id="preferred-name"
            value={state.profile.preferredName}
            onChange={(e) => updateProfile({ preferredName: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="focus">Em que estás focado agora?</Label>
          <Select
            {...(state.profile.focus ? { value: state.profile.focus } : {})}
            onValueChange={(value) => updateProfile({ focus: value })}
          >
            <SelectTrigger id="focus">
              <SelectValue placeholder="Escolher" />
            </SelectTrigger>
            <SelectContent>
              {FOCUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="priorities">Quais são os teus principais objetivos?</Label>
          <Textarea
            id="priorities"
            rows={3}
            value={state.profile.priorities}
            onChange={(e) => updateProfile({ priorities: e.target.value })}
          />
        </div>
      </section>

      <section className="card-standard space-y-4">
        <div>
          <h2 className="type-section">Memória</h2>
          <p className="type-caption mt-1">
            Tudo o que o assistente recorda está aqui. Podes ver, editar e apagar a qualquer momento.
          </p>
        </div>

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newMemory.trim()) return;
            addMemory({ category: newCategory, content: newMemory.trim(), source: "user" });
            setNewMemory("");
          }}
        >
          <Label htmlFor="memory-content">Adicionar memória</Label>
          <Textarea
            id="memory-content"
            rows={2}
            value={newMemory}
            placeholder="Ex.: Quero viajar em dezembro."
            onChange={(e) => setNewMemory(e.target.value)}
          />
          <div className="flex gap-2">
            <Select value={newCategory} onValueChange={(v) => setNewCategory(v as MemoryCategory)}>
              <SelectTrigger aria-label="Categoria da memória" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MEMORY_CATEGORY_LABELS) as MemoryCategory[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {MEMORY_CATEGORY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" size="sm">
              Guardar
            </Button>
          </div>
        </form>

        {state.memories.length === 0 ? (
          <p className="type-caption">O assistente ainda não recorda nada sobre ti.</p>
        ) : (
          <ul className="space-y-2">
            {state.memories.map((memory) => (
              <li key={memory.id} className="card-compact flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="type-meta">{MEMORY_CATEGORY_LABELS[memory.category]}</p>
                  <Textarea
                    rows={2}
                    aria-label="Conteúdo da memória"
                    className="mt-1 border-0 bg-transparent p-0 focus-visible:ring-0"
                    value={memory.content}
                    onChange={(e) => updateMemory(memory.id, { content: e.target.value })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Apagar memória"
                  onClick={() => deleteMemory(memory.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="type-caption">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
