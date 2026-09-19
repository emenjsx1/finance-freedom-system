import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Subtle tinted card for deterministic observations. Never for invented text. */
export function InsightTile({
  eyebrow,
  title,
  children,
  className,
  footer,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <section className={cn("card-tinted", className)}>
      {eyebrow ? <p className="type-meta">{eyebrow}</p> : null}
      <p className="mt-1 text-[0.9375rem] font-semibold leading-snug">{title}</p>
      {children ? <div className="mt-1.5 text-sm text-muted-foreground">{children}</div> : null}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </section>
  );
}
