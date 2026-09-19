import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { Money } from "@/components/money";
import { ProgressIndicator } from "@/components/design/progress-indicator";
import { Symbol } from "@/lib/icons/symbols";
import { cn } from "@/lib/utils";

function monthYear(date: string): string {
  const label = new Date(date).toLocaleDateString("pt-PT", { month: "short", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

/**
 * A goal card answers, at a glance: what for, how much it costs, how much is
 * already saved, how much is missing, by when, and how far along it is.
 * Imagery is optional — without a cover the card uses the icon family.
 */
export function GoalCard({
  name,
  balanceMinor,
  targetMinor,
  targetDate,
  coverImageUrl,
  icon,
  kindLabel,
  to,
  className,
}: {
  name: string;
  balanceMinor: number;
  targetMinor?: number | undefined;
  targetDate?: string | undefined;
  coverImageUrl?: string | undefined;
  icon?: string | undefined;
  kindLabel?: string | undefined;
  to: { to: string; params?: Record<string, string> };
  className?: string;
}) {
  const ratio = targetMinor && targetMinor > 0 ? balanceMinor / targetMinor : null;
  const remaining = targetMinor ? Math.max(0, targetMinor - balanceMinor) : null;
  const meta = [kindLabel, targetDate ? monthYear(targetDate) : null].filter(Boolean).join(" · ");

  return (
    <Link
      to={to.to}
      params={to.params as never}
      className={cn("card-interactive block overflow-hidden p-0", className)}
    >
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt=""
          loading="lazy"
          className="h-28 w-full object-cover"
          width={720}
          height={224}
        />
      ) : null}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {coverImageUrl ? null : (
            <span className="icon-tile bg-accent text-accent-foreground" aria-hidden>
              <Symbol name={icon} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-semibold uppercase tracking-[0.04em]">
              {name}
            </span>
            {meta ? <span className="type-meta block truncate">{meta}</span> : null}
          </span>
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        <p className="mt-3 flex items-baseline gap-1.5">
          <Money
            minor={balanceMinor}
            options={{ withSymbol: false, compactDecimals: true }}
            className="type-title tabular-nums"
          />
          {targetMinor ? (
            <span className="type-meta">
              de <Money minor={targetMinor} options={{ withSymbol: false, compactDecimals: true }} />
            </span>
          ) : null}
        </p>

        {ratio !== null ? (
          <div className="mt-3">
            <ProgressIndicator value={ratio} size="sm" label={`Progresso de ${name}`} />
            <div className="mt-2 flex items-baseline justify-between">
              <span className="type-meta">{Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%</span>
              {remaining !== null ? (
                <span className="type-meta">
                  Faltam{" "}
                  <Money
                    minor={remaining}
                    options={{ withSymbol: false, compactDecimals: true }}
                    className="font-medium text-foreground"
                  />
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="type-meta mt-2">Sem valor-alvo definido.</p>
        )}
      </div>
    </Link>
  );
}
