import { cn } from "@/lib/utils";

/** Restrained horizontal progress track. Values are always clamped, never invented. */
export function ProgressIndicator({
  value,
  className,
  size = "md",
  label,
}: {
  /** 0–1 ratio. */
  value: number;
  className?: string;
  size?: "sm" | "md";
  label?: string;
}) {
  const ratio = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-primary-soft",
        size === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      aria-label={label}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
