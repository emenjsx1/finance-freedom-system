import type { ReactNode } from "react";

/** Editorial page header: large title, calm supporting line, optional action. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-7 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
      <div className="min-w-0">
        <h1 className="type-title">{title}</h1>
        {subtitle ? <p className="type-secondary mt-2">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}
