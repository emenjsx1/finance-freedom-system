import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { UserAvatar } from "@/components/design/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useSetup } from "@/hooks/use-setup";
import { authErrorMessage } from "@/lib/auth/errors";

export const Route = createFileRoute("/app/profile/personal")({
  head: () => ({
    meta: [
      { title: "Informação pessoal — Finance OS" },
      { name: "description", content: "Fotografia, nome preferido, idioma, moeda base e fuso horário." },
      { property: "og:title", content: "Informação pessoal — Finance OS" },
      { property: "og:description", content: "Os teus dados pessoais no Finance OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PersonalInfoPage,
});

const CURRENCIES = ["MZN", "ZAR", "USD", "EUR", "GBP", "TRY"];
const TIMEZONES = [
  "Africa/Maputo",
  "Africa/Johannesburg",
  "Europe/Lisbon",
  "Europe/London",
  "America/New_York",
  "UTC",
];

function PersonalInfoPage() {
  const { user, profile, updateProfile } = useAuth();
  const { setup, update: updateSetup } = useSetup();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preferredName, setPreferredName] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState("pt");
  const [currency, setCurrency] = useState("MZN");
  const [timezone, setTimezone] = useState("Africa/Maputo");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPreferredName(profile?.preferred_name ?? setup.fullName.split(" ")[0] ?? "");
    setFullName(profile?.full_name ?? setup.fullName);
    setAvatarUrl(profile?.avatar_url ?? null);
    setLanguage(profile?.language ?? "pt");
    setCurrency(profile?.base_currency ?? setup.currencyCode);
    setTimezone(profile?.timezone ?? "Africa/Maputo");
  }, [profile, setup.fullName, setup.currencyCode]);

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Informação pessoal" subtitle="Inicia sessão para guardares o teu perfil na conta." />
        <Button asChild>
          <Link to="/auth">Entrar</Link>
        </Button>
      </div>
    );
  }

  async function handlePhoto(file: File) {
    if (file.size > 3_000_000) {
      toast.error("Escolhe uma imagem com menos de 3 MB.");
      return;
    }
    const dataUrl = await resizeToDataUrl(file, 320);
    setAvatarUrl(dataUrl);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        preferred_name: preferredName.trim() || null,
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl,
        language,
        base_currency: currency,
        timezone,
      });
      // Keep the on-device money architecture aligned with the account profile.
      updateSetup({ fullName: fullName.trim() || preferredName.trim() });
      toast.success("Informação atualizada.");
    } catch (error) {
      toast.error(authErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <PageHeader title="Informação pessoal" subtitle="Como te tratamos e como o dinheiro é apresentado." />

      <div className="flex items-center gap-4">
        <UserAvatar size="lg" name={preferredName || fullName} email={user.email} imageUrl={avatarUrl} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            Alterar fotografia
          </Button>
          {avatarUrl ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarUrl(null)}>
              Remover
            </Button>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Escolher fotografia de perfil"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handlePhoto(file);
            }}
          />
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="space-y-2">
          <Label className="type-meta">Nome preferido</Label>
          <Input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} placeholder="Emen" />
        </div>

        <div className="space-y-2">
          <Label className="type-meta">Nome completo</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Emen Joseph Silva" />
        </div>

        <div className="space-y-2">
          <Label className="type-meta">Email</Label>
          <div className="list-row items-center justify-between">
            <span className="text-[0.9375rem]">{user.email}</span>
          </div>
          <p className="type-meta">
            O email de acesso só pode ser alterado através do fluxo seguro em Acesso e segurança.
          </p>
        </div>

        <NativeSelect label="Idioma" value={language} onChange={setLanguage} options={[["pt", "Português"]]} />
        <NativeSelect
          label="Moeda base"
          value={currency}
          onChange={setCurrency}
          options={CURRENCIES.map((c) => [c, c] as [string, string])}
        />
        <NativeSelect
          label="Fuso horário"
          value={timezone}
          onChange={setTimezone}
          options={TIMEZONES.map((t) => [t, t.replace("_", " ")] as [string, string])}
        />

        <Button type="submit" className="h-12 w-full" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          Guardar alterações
        </Button>
      </form>
    </div>
  );
}

function NativeSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="space-y-2">
      <Label className="type-meta">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-[var(--r-md)] border border-border/70 bg-surface px-3 text-[0.9375rem] text-foreground"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Keeps profile photos small enough to store safely. */
async function resizeToDataUrl(file: File, max: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}
