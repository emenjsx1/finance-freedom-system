import { createFileRoute } from "@tanstack/react-router";
import { Check, Monitor, Moon, RotateCcw, Sun } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePrefs } from "@/hooks/use-prefs";
import { useSetup } from "@/hooks/use-setup";
import {
  ACCENTS,
  DEFAULT_PAGES,
  ANALYTICS_MODULES,
  HOME_MODULES,
  TERMINOLOGY_DEFAULTS,
  type AccentKey,
  type Density,
  type AnalyticsModuleId,
  type HomeModuleId,
  type TerminologyKey,
  type ThemeMode,
} from "@/lib/prefs/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/personalization")({
  head: () => ({
    meta: [
      { title: "Personalização — Norte" },
      {
        name: "description",
        content: "Tema, cor de destaque, densidade, módulos do painel e a tua própria terminologia.",
      },
      { property: "og:title", content: "Personalização — Norte" },
      { property: "og:description", content: "Faz da aplicação um sistema à tua medida." },
    ],
  }),
  component: PersonalizationPage,
});

const THEMES: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
  { key: "dark", label: "Escuro", icon: Moon },
  { key: "light", label: "Claro", icon: Sun },
  { key: "system", label: "Sistema", icon: Monitor },
];

function PersonalizationPage() {
  const { prefs, update, reset } = usePrefs();
  const { setup, update: updateSetup } = useSetup();

  function toggleModule(id: HomeModuleId) {
    update({
      homeModules: prefs.homeModules.includes(id)
        ? prefs.homeModules.filter((m) => m !== id)
        : [...prefs.homeModules, id],
    });
  }

  function toggleAnalyticsModule(id: AnalyticsModuleId) {
    update({
      analyticsModules: prefs.analyticsModules.includes(id)
        ? prefs.analyticsModules.filter((m) => m !== id)
        : [...prefs.analyticsModules, id],
    });
  }

  return (
    <div className="space-y-9">
      <PageHeader title="Personalização" subtitle="A aparência e a linguagem do teu sistema." />

      <section className="card-standard space-y-4">
        <h2 className="type-section">Tema</h2>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.key}
              type="button"
              onClick={() => update({ theme: theme.key })}
              aria-pressed={prefs.theme === theme.key}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm transition-colors",
                prefs.theme === theme.key
                  ? "border-primary bg-primary-soft text-foreground"
                  : "border-border/70 text-muted-foreground hover:border-foreground/25",
              )}
            >
              <theme.icon className="size-4" />
              {theme.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card-standard space-y-4">
        <h2 className="type-section">Cor de destaque</h2>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((accent) => (
            <button
              key={accent.key}
              type="button"
              aria-label={accent.label}
              aria-pressed={prefs.accent === accent.key}
              onClick={() => update({ accent: accent.key as AccentKey })}
              className={cn(
                "flex size-11 items-center justify-center rounded-xl border-2 transition-transform active:scale-95",
                prefs.accent === accent.key ? "border-foreground" : "border-transparent",
              )}
              style={{ backgroundColor: accent.swatch }}
            >
              {prefs.accent === accent.key ? (
                <Check className="size-4 text-background" aria-hidden />
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <section className="card-standard space-y-4">
        <h2 className="type-section">Apresentação</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="density">Densidade</Label>
            <Select value={prefs.density} onValueChange={(v) => update({ density: v as Density })}>
              <SelectTrigger id="density">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Confortável</SelectItem>
                <SelectItem value="compact">Compacta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="default-page">Página inicial</Label>
            <Select value={prefs.defaultPage} onValueChange={(v) => update({ defaultPage: v })}>
              <SelectTrigger id="default-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_PAGES.map((page) => (
                  <SelectItem key={page.to} value={page.to}>
                    {page.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Row
          label="Mostrar código da moeda"
          description="Ex.: 12.500 MZN em vez de apenas 12.500."
          checked={prefs.showCurrencyCode}
          onChange={(v) => update({ showCurrencyCode: v })}
        />
        <Row
          label="Modo privado"
          description="Esconde todos os valores monetários na aplicação."
          checked={setup.privacyMode}
          onChange={(v) => updateSetup({ privacyMode: v })}
        />
      </section>

      <section className="card-standard space-y-3">
        <div>
          <h2 className="type-section">Módulos do painel</h2>
          <p className="type-caption mt-1">O que aparece no Início. A ordem muda-se no próprio painel.</p>
        </div>
        {HOME_MODULES.map((module) => (
          <Row
            key={module.id}
            label={module.label}
            description={module.description}
            checked={prefs.homeModules.includes(module.id)}
            onChange={() => toggleModule(module.id)}
          />
        ))}
      </section>

      <section className="card-standard space-y-3">
        <div>
          <h2 className="type-section">Módulos de análise</h2>
          <p className="type-caption mt-1">O que aparece na secção Análise.</p>
        </div>
        {ANALYTICS_MODULES.map((module) => (
          <Row
            key={module.id}
            label={module.label}
            description="Mostrar na Análise"
            checked={prefs.analyticsModules.includes(module.id)}
            onChange={() => toggleAnalyticsModule(module.id)}
          />
        ))}
      </section>

      <section className="card-standard space-y-3">
        <div>
          <h2 className="type-section">Terminologia</h2>
          <p className="type-caption mt-1">
            Muda apenas os nomes que vês. O comportamento do sistema permanece igual.
          </p>
        </div>
        {(Object.keys(TERMINOLOGY_DEFAULTS) as TerminologyKey[]).map((key) => (
          <div key={key} className="grid gap-1.5">
            <Label htmlFor={`term-${key}`}>{TERMINOLOGY_DEFAULTS[key]}</Label>
            <Input
              id={`term-${key}`}
              value={prefs.terminology[key] ?? ""}
              placeholder={TERMINOLOGY_DEFAULTS[key]}
              onChange={(e) => update({ terminology: { ...prefs.terminology, [key]: e.target.value } })}
            />
          </div>
        ))}
      </section>

      <Button variant="secondary" onClick={reset}>
        <RotateCcw />
        Restaurar predefinições
      </Button>
    </div>
  );
}

function Row({
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
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="type-caption">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
