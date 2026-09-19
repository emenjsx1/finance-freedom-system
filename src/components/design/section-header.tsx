import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Editorial section header: title on the left, one optional quiet action.
 * Used instead of wrapping every section in a card.
 */
export function SectionHeader({
  title,
  actionLabel,
  to,
  onAction,
  className,
  children,
}: {
  title: string;
  actionLabel?: string;
  to?: string;
  onAction?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const action = actionLabel ? (
    <span className="flex items-center gap-0.5 text-[0.8125rem] font-medium text-muted-foreground">
      {actionLabel}
      <ChevronRight className="size-3.5" aria-hidden />
    </span>
  ) : null;

  return (
    <div className={cn("mb-3 flex items-baseline justify-between gap-3", className)}>
      <h2 className="type-heading">{title}</h2>
      {children ??
        (action && to ? (
          <Link to={to}>{action}</Link>
        ) : action && onAction ? (
          <button type="button" onClick={onAction}>
            {action}
          </button>
        ) : null)}
    </div>
  );
}
