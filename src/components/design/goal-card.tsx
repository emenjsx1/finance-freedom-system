import { Link } from "@tanstack/react-router";
import { ChevronRight, Target } from "lucide-react";

import { Money } from "@/components/money";
import { ProgressIndicator } from "@/components/design/progress-indicator";
import { cn } from "@/lib/utils";

/**
 * Aspirational goal card. The cover image is optional — without one the card
 * falls back to an elegant icon tile, never to a placeholder photo.
 */
export function GoalCard({
  name,
  balanceMinor,
  targetMinor,
  targetDate,
  coverImageUrl,
  icon,
  to,
  className,
}: {
  name: string;
  balanceMinor: number;
  targetMinor?: number | undefined;
  targetDate?: string | undefined;
  coverImageUrl?: string | undefined;
  icon?: string | undefined;
  to: { to: string; params?: Record<string, string> };
  className?: string;
}) {
  const ratio = targetMinor && targetMinor > 0 ? balanceMinor / targetMinor : null;

  return (
    <Link
      to={to.to}
      params={to.params as never}
      className={cn("card-interactive block overflow-hidden p-0", className)}
    >
      <div className="flex items-center gap-3 p-4">
        <span className="icon-tile bg-accent text-accent-foreground" aria-hidden>
          {icon ? <span className="text-lg leading-none">{icon}</span> : <Target className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-semibold">{name}</span>
          <span className="type-meta block truncate">
            <Money minor={balanceMinor} options={{ withSymbol: false, compactDecimals: true }} />
            {targetMinor ? (
              <>
                {" / "}
                <Money minor={targetMinor} options={{ withSymbol: false, compactDecimals: true }} />
              </>
            ) : null}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>

      {ratio !== null ? (
        <div className="px-4 pb-4">
          <ProgressIndicator value={ratio} size="sm" label={`Progresso de ${name}`} />
          <p className="type-meta mt-2">
            {Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%
            {targetDate ? ` · até ${new Date(targetDate).toLocaleDateString("pt-PT")}` : ""}
          </p>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <p className="type-meta">Sem meta definida.</p>
        </div>
      )}

      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt=""
          loading="lazy"
          className="h-24 w-full object-cover"
          width={480}
          height={192}
        />
      ) : null}
    </Link>
  );
}
