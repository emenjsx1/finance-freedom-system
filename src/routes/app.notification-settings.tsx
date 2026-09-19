import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNotifications } from "@/hooks/use-notifications";
import {
  BRIEF_SECTION_LABELS,
  FREQUENCY_LABELS,
  PREF_LABELS,
  PREVIEW_LABELS,
  type BriefSection,
  type Channel,
  type FrequencyPreset,
  type PrefKey,
  type PreviewPrivacy,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notification-settings")({
  head: () => ({
    meta: [
      { title: "Notificações e avisos — Finance OS" },
      { name: "description", content: "Escolhe o que queres saber, quando e com que privacidade." },
      { property: "og:title", content: "Notificações e avisos — Finance OS" },
      { property: "og:description", content: "Escolhe o que queres saber, quando e com que privacidade." },
    ],
  }),
  component: NotificationSettingsPage,
});

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const CHANNELS: { key: Channel; label: string }[] = [
  { key: "inApp", label: "Na app" },
  { key: "push", label: "Push" },
  { key: "email", label: "Email" },
];

function NotificationSettingsPage() {
  const { state, updatePrefs, enablePush, forgetDevice } = useNotifications();
  const prefs = state.prefs;
  const [busy, setBusy] = useState(false);

  function setCategory(key: PrefKey, channel: Channel, value: boolean) {
    updatePrefs({
      categories: { ...prefs.categories, [key]: { ...prefs.categories[key], [channel]: value } },
    });
  }

  function toggleSection(section: BriefSection) {
    const sections = prefs.dailyBrief.sections.includes(section)
      ? prefs.dailyBrief.sections.filter((s) => s !== section)
      : [...prefs.dailyBrief.sections, section];
    updatePrefs({ dailyBrief: { ...prefs.dailyBrief, sections } });
  }

  async function requestPush() {
    setBusy(true);
    const status = await enablePush();
    setBusy(false);
    if (status === "registered") toast.success("Este dispositivo vai receber avisos.");
    else if (status === "open-in-new-tab") toast.info("Abre a app num separador próprio para autorizar os avisos.");
    else if (status === "denied") toast.info("Os avisos estão bloqueados nas definições do navegador.");
    else toast.info("Este dispositivo não suporta avisos.");
  }

  return (
    <div className="pb-8">
      <PageHeader title="Notificações" subtitle="Importante, não frequente. Tu decides o que merece interromper-te." />

      <Section title="Geral">
        <ToggleRow
          label="Receber notificações"
          description="Desliga tudo de uma vez, sem perder as tuas escolhas."
          checked={prefs.enabled}
          onChange={(v) => updatePrefs({ enabled: v })}
        />
        <div className="grid gap-2 pt-2 sm:grid-cols-2">
          {(Object.keys(FREQUENCY_LABELS) as FrequencyPreset[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => updatePrefs({ frequency: key })}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                prefs.frequency === key ? "border-primary/40 bg-primary/[0.06]" : "border-border/70 hover:bg-surface",
              )}
            >
              <p className="text-sm font-medium">{FREQUENCY_LABELS[key].label}</p>
              <p className="type-meta mt-0.5">{FREQUENCY_LABELS[key].description}</p>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Horário silencioso" description="Durante este período, só o que é urgente chega na hora. O resto espera.">
        <ToggleRow
          label="Ativar"
          checked={prefs.quietHours.enabled}
          onChange={(v) => updatePrefs({ quietHours: { ...prefs.quietHours, enabled: v } })}
        />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Field label="Início">
            <Input
              type="time"
              value={prefs.quietHours.start}
              onChange={(e) => updatePrefs({ quietHours: { ...prefs.quietHours, start: e.target.value } })}
            />
          </Field>
          <Field label="Fim">
            <Input
              type="time"
              value={prefs.quietHours.end}
              onChange={(e) => updatePrefs({ quietHours: { ...prefs.quietHours, end: e.target.value } })}
            />
          </Field>
        </div>
        <p className="type-meta mt-2">Fuso horário: {prefs.timezone}</p>
      </Section>

      <Section title="Resumo diário" description="Curto, de manhã, com o que escolheres.">
        <ToggleRow
          label="Ativar resumo diário"
          checked={prefs.dailyBrief.enabled}
          onChange={(v) => updatePrefs({ dailyBrief: { ...prefs.dailyBrief, enabled: v } })}
        />
        <Field label="Hora">
          <Input
            type="time"
            value={prefs.dailyBrief.time}
            onChange={(e) => updatePrefs({ dailyBrief: { ...prefs.dailyBrief, time: e.target.value } })}
          />
        </Field>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(Object.keys(BRIEF_SECTION_LABELS) as BriefSection[]).map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => toggleSection(section)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                prefs.dailyBrief.sections.includes(section)
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/70 text-muted-foreground",
              )}
            >
              {BRIEF_SECTION_LABELS[section]}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Resumos periódicos">
        <ToggleRow
          label="Resumo semanal"
          checked={prefs.weeklyReview.enabled}
          onChange={(v) => updatePrefs({ weeklyReview: { ...prefs.weeklyReview, enabled: v } })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dia">
            <select
              className="h-10 w-full rounded-lg border border-border/70 bg-background px-3 text-sm"
              value={prefs.weeklyReview.weekday ?? 0}
              onChange={(e) => updatePrefs({ weeklyReview: { ...prefs.weeklyReview, weekday: Number(e.target.value) } })}
            >
              {WEEKDAYS.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hora">
            <Input
              type="time"
              value={prefs.weeklyReview.time}
              onChange={(e) => updatePrefs({ weeklyReview: { ...prefs.weeklyReview, time: e.target.value } })}
            />
          </Field>
        </div>
        <div className="pt-3">
          <ToggleRow
            label="Fecho do mês"
            checked={prefs.monthlyReview.enabled}
            onChange={(v) => updatePrefs({ monthlyReview: { ...prefs.monthlyReview, enabled: v } })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dia do mês">
              <Input
                type="number"
                min={1}
                max={28}
                value={prefs.monthlyReview.day ?? 1}
                onChange={(e) => updatePrefs({ monthlyReview: { ...prefs.monthlyReview, day: Number(e.target.value) } })}
              />
            </Field>
            <Field label="Hora">
              <Input
                type="time"
                value={prefs.monthlyReview.time}
                onChange={(e) => updatePrefs({ monthlyReview: { ...prefs.monthlyReview, time: e.target.value } })}
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="O que queres saber" description="Cada assunto tem os seus canais. Desligar um assunto desliga-o em todo o lado.">
        <div className="space-y-3">
          {(Object.keys(PREF_LABELS) as PrefKey[]).map((key) => (
            <div key={key} className="rounded-xl border border-border/70 p-3">
              <p className="text-sm font-medium">{PREF_LABELS[key].label}</p>
              <p className="type-meta mt-0.5">{PREF_LABELS[key].description}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {CHANNELS.map((channel) => (
                  <label key={channel.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={prefs.categories[key]?.[channel.key] ?? false}
                      onCheckedChange={(v) => setCategory(key, channel.key, v)}
                    />
                    {channel.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Privacidade dos avisos" description="O que pode aparecer no ecrã bloqueado antes de abrires a app.">
        <div className="space-y-2">
          {(Object.keys(PREVIEW_LABELS) as PreviewPrivacy[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => updatePrefs({ preview: key })}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-colors",
                prefs.preview === key ? "border-primary/40 bg-primary/[0.06]" : "border-border/70 hover:bg-surface",
              )}
            >
              <p className="text-sm font-medium">{PREVIEW_LABELS[key].label}</p>
              <p className="type-meta mt-0.5">{PREVIEW_LABELS[key].description}</p>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Dispositivos" description="Avisos fora da app. Nenhum outro utilizador vê os teus dispositivos.">
        <Button variant="secondary" onClick={requestPush} disabled={busy}>
          Autorizar avisos neste dispositivo
        </Button>
        <ul className="mt-3 space-y-2">
          {state.devices.length === 0 ? (
            <li className="type-meta">Sem dispositivos associados.</li>
          ) : (
            state.devices.map((device) => (
              <li key={device.id} className="flex items-center justify-between rounded-xl border border-border/70 p-3 text-sm">
                <span className="truncate pr-3">{device.label || device.platform}</span>
                <Button size="xs" variant="ghost" onClick={() => forgetDevice(device.id)}>
                  Remover
                </Button>
              </li>
            ))
          )}
        </ul>
      </Section>

      <Section title="Limite diário" description="Quantos avisos não urgentes podes receber por dia.">
        <Input
          type="number"
          min={1}
          max={10}
          value={prefs.dailyBudget}
          onChange={(e) => updatePrefs({ dailyBudget: Math.max(1, Number(e.target.value) || 1) })}
          className="w-24"
        />
      </Section>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl border border-border/70 bg-surface p-4">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {description ? <p className="type-meta mb-3 mt-0.5">{description}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="type-meta mt-0.5">{description}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-2">
      <Label className="type-meta mb-1 block">{label}</Label>
      {children}
    </div>
  );
}
