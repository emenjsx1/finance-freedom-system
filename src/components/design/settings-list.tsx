import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Grouped native-style list, matching the app's warm surface language. */
export function SettingsGroup({
  title,
  children,
  footer,
}: {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section>
      {title ? <h2 className="type-section mb-2 px-1">{title}</h2> : null}
      <div className="list-group">{children}</div>
      {footer ? <p className="type-meta mt-2 px-1">{footer}</p> : null}
    </section>
  );
}

export function SettingsRow({
  icon: Icon,
  label,
  value,
  to,
  onSelect,
  destructive,
  trailing,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value?: ReactNode;
  to?: string;
  onSelect?: () => void;
  destructive?: boolean;
  trailing?: ReactNode;
}) {
  const body = (
    <>
      {Icon ? (
        <span className={cn("icon-tile size-9", destructive ? "text-destructive" : "text-foreground")}>
          <Icon className="size-4" />
        </span>
      ) : null}
      <span className={cn("min-w-0 flex-1 text-[0.9375rem]", destructive && "text-destructive")}>
        {label}
      </span>
      {trailing ?? (
        <span className="flex items-center gap-2 text-right">
          {value ? <span className="type-meta max-w-[10rem] truncate">{value}</span> : null}
          {to || onSelect ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" /> : null}
        </span>
      )}
    </>
  );

  const className = "list-row w-full items-center gap-3 text-left";

  if (to) {
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    );
  }

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={className}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}
