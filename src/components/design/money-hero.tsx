import { Link } from "@tanstack/react-router";
import { ChevronRight, Eye, EyeOff } from "lucide-react";

import { Money } from "@/components/money";
import { usePrefs } from "@/hooks/use-prefs";
import { useSetup } from "@/hooks/use-setup";
import { cn } from "@/lib/utils";

/**
 * Signature money card. The relationship is always
 * total = available + reserved — both parts come from the engine snapshot.
 */
export function MoneyHero({
  title,
  totalMinor,
  availableMinor,
  reservedMinor,
  availableLabel,
  reservedLabel,
  to,
  note,
  className,
}: {
  title: string;
  totalMinor: number;
  availableMinor: number;
  reservedMinor: number;
  availableLabel: string;
  reservedLabel: string;
  to?: string;
  note?: string;
  className?: string;
}) {
  const { setup, update } = useSetup();
  const { prefs } = usePrefs();
  const ratio = totalMinor > 0 ? Math.min(1, Math.max(0, availableMinor / totalMinor)) : 0;

  return (
    <section className={cn("card-hero rise-in", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="type-heading truncate">{title}</h2>
          <button
            type="button"
            onClick={() => update({ privacyMode: !setup.privacyMode })}
            aria-label={setup.privacyMode ? "Mostrar valores" : "Ocultar valores"}
            className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            {setup.privacyMode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {to ? (
          <Link
            to={to}
            aria-label="Ver detalhe"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </Link>
        ) : null}
      </div>

      <p className="mt-3 flex items-baseline gap-2">
        <Money
          minor={totalMinor}
          className="type-display"
          options={{ withSymbol: false, compactDecimals: true }}
        />
        <span className="text-base font-medium text-muted-foreground">
          {prefs.showCurrencyCode ? setup.currencyCode : ""}
        </span>
      </p>

      <div className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-primary-soft">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="type-meta flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-primary" />
            {availableLabel}
          </p>
          <Money
            minor={availableMinor}
            className="mt-1 block text-xl font-semibold"
            options={{ withSymbol: false, compactDecimals: true }}
          />
        </div>
        <div className="min-w-0 text-right">
          <p className="type-meta flex items-center justify-end gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-primary-soft" />
            {reservedLabel}
          </p>
          <Money
            minor={reservedMinor}
            className="mt-1 block text-xl font-semibold"
            options={{ withSymbol: false, compactDecimals: true }}
          />
        </div>
      </div>

      {note ? <p className="type-meta mt-4">{note}</p> : null}
    </section>
  );
}
