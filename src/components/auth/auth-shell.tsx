import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { AppleMark, GoogleMark } from "@/components/auth/provider-marks";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand/brand-mark";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col justify-center overflow-y-auto bg-background px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.5rem)] sm:px-6">
      <div className="mx-auto w-full max-w-sm">
        <Link to="/" aria-label="Norte" className="mb-8 block">
          <BrandMark size="lg" />
        </Link>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="type-meta">{label}</Label>
      {children}
    </div>
  );
}

/** Apple first, as Apple's own guidance recommends on iOS. */
export function ProviderButtons({
  busy,
  onProvider,
}: {
  busy: null | "email" | "google" | "apple";
  onProvider: (provider: "apple" | "google") => void;
}) {
  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="secondary"
        className="h-12 w-full justify-center gap-2.5"
        disabled={busy !== null}
        onClick={() => onProvider("apple")}
      >
        {busy === "apple" ? <Loader2 className="animate-spin" /> : <AppleMark />}
        Continuar com a Apple
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="h-12 w-full justify-center gap-2.5"
        disabled={busy !== null}
        onClick={() => onProvider("google")}
      >
        {busy === "google" ? <Loader2 className="animate-spin" /> : <GoogleMark />}
        Continuar com Google
      </Button>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-7 flex items-center gap-4">
      <span className="h-px flex-1 bg-border/70" />
      <span className="type-meta">ou</span>
      <span className="h-px flex-1 bg-border/70" />
    </div>
  );
}

/** Shown before account creation, never as a pre-ticked marketing consent. */
export function LegalNotice() {
  return (
    <p className="type-meta mt-6 text-center leading-relaxed">
      Ao continuares, aceitas os{" "}
      <Link to="/terms" className="text-primary underline">
        Termos de Utilização
      </Link>{" "}
      e reconheces a{" "}
      <Link to="/privacy" className="text-primary underline">
        Política de Privacidade
      </Link>
      .
    </p>
  );
}
