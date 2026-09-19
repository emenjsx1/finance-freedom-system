import type { ReactNode } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** iOS-style bottom sheet: drag handle, large title, safe-area padding. */
export function NativeSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-[var(--r-hero)] border-0 bg-elevated px-0 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-[var(--shadow-raised)]",
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border" aria-hidden />
        <SheetHeader className="px-5 pt-3 text-left">
          <SheetTitle className="type-title">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="type-secondary">{description}</SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="px-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
