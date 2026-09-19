import { Symbol } from "@/lib/icons/symbols";
/**
 * Reusable chart primitives (Phase 07).
 *
 * Plain SVG so the charts inherit the Phase 06 tokens, work in dark and light
 * themes, stay readable on a phone and respect privacy mode: when values are
 * hidden, only the shape remains — never a readable number.
 */
import type { ReactNode } from "react";

import { Money } from "@/components/money";
import { useSetup } from "@/hooks/use-setup";
import { cn } from "@/lib/utils";

const ACCENT = "var(--color-primary)";

function useHidden() {
  const { setup } = useSetup();
  return setup.privacyMode;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

/** Line trend with optional point selection. */
export function TrendLine({
  points,
  onSelect,
  selected,
  height = 140,
  ariaLabel,
}: {
  points: SeriesPoint[];
  onSelect?: ((index: number) => void) | undefined;
  selected?: number | undefined;
  height?: number;
  ariaLabel: string;
}) {
  if (points.length === 0) return null;
  const width = 320;
  const max = Math.max(...points.map((p) => p.value), 1);
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: points.length > 1 ? i * step : width / 2,
    y: height - 16 - (p.value / max) * (height - 32),
  }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${path} L${coords[coords.length - 1]!.x},${height} L${coords[0]!.x},${height} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={ariaLabel}>
        <path d={area} fill={ACCENT} opacity={0.12} />
        <path d={path} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle
            key={points[i]!.label + i}
            cx={c.x}
            cy={c.y}
            r={selected === i ? 5 : 3}
            fill={ACCENT}
            className={onSelect ? "cursor-pointer" : undefined}
            onClick={onSelect ? () => onSelect(i) : undefined}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between">
        {points.map((p, i) => (
          <button
            key={p.label + i}
            type="button"
            onClick={onSelect ? () => onSelect(i) : undefined}
            className={cn("type-meta px-1", selected === i && "text-primary")}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Ranked horizontal breakdown, e.g. spending per category. */
export function CategoryBreakdown({
  rows,
  onSelect,
}: {
  rows: { id: string; name: string; icon?: string; amountMinor: number; share: number }[];
  onSelect?: ((id: string) => void) | undefined;
}) {
  const hidden = useHidden();
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const content = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm">
                {row.icon ? <Symbol name={row.icon} className="mr-2 inline size-4 text-muted-foreground" /> : null}
                {row.name}
              </span>
              <span className="type-body tabular-nums">
                <Money minor={row.amountMinor} />
                {!hidden && <span className="type-meta ml-2">{Math.round(row.share * 100)}%</span>}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, row.share * 100)}%` }} />
            </div>
          </>
        );
        return (
          <li key={row.id}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(row.id)} className="w-full text-left">
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Two bars side by side for a period comparison. */
export function ComparisonBars({
  current,
  previous,
  currentLabel,
  previousLabel,
}: {
  current: number;
  previous: number;
  currentLabel: string;
  previousLabel: string;
}) {
  const max = Math.max(current, previous, 1);
  const row = (label: string, value: number, strong: boolean) => (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="type-caption">{label}</span>
        <span className="type-body tabular-nums">
          <Money minor={value} />
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-elevated">
        <div
          className={cn("h-full rounded-full", strong ? "bg-primary" : "bg-muted-foreground/40")}
          style={{ width: `${Math.max(2, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
  return (
    <div className="space-y-3">
      {row(currentLabel, current, true)}
      {row(previousLabel, previous, false)}
    </div>
  );
}

/** Progress toward a target. */
export function ProgressChart({ valueMinor, targetMinor, label }: { valueMinor: number; targetMinor: number; label?: ReactNode }) {
  const share = targetMinor > 0 ? Math.min(1, valueMinor / targetMinor) : 0;
  return (
    <div>
      {label ? <div className="type-caption mb-1.5">{label}</div> : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, share * 100)}%` }} />
      </div>
    </div>
  );
}

/** Net worth over time — bars keep the shape readable on small screens. */
export function NetWorthChart({ points }: { points: SeriesPoint[] }) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="flex h-36 items-end gap-2" role="img" aria-label="Evolução do património">
      {points.map((p) => (
        <div key={p.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-primary/80"
              style={{ height: `${Math.max(4, (p.value / max) * 100)}%` }}
            />
          </div>
          <span className="type-meta">{p.label.slice(0, 3)}</span>
        </div>
      ))}
    </div>
  );
}
