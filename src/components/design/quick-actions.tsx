import { ArrowLeftRight, MoreHorizontal, Plus, Target } from "lucide-react";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export interface QuickActionItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onSelect: () => void;
  primary?: boolean;
}

/** Compact rounded action controls — never full-width CTAs. */
export function QuickActions({ items, className }: { items: QuickActionItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-4 gap-3", className)}>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onSelect}
          className="group flex flex-col items-center gap-2"
        >
          <span
            className={cn(
              "grid h-14 w-full place-items-center rounded-[var(--r-xl)] transition-transform duration-150 group-active:scale-95",
              item.primary
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-medium)]"
                : "bg-surface text-foreground shadow-[var(--shadow-soft)]",
            )}
          >
            <item.icon className="size-5" aria-hidden />
          </span>
          <span className="text-[0.8125rem] font-medium text-foreground">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export const quickActionIcons = { Plus, ArrowLeftRight, Target, MoreHorizontal };
