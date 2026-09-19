import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Phase 06 button system. Variants map to intent, not colour:
 * primary (default), secondary, ghost, danger, icon, fab, compact, link.
 * Every variant shares proportions, focus ring, pressed and disabled states.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "cursor-pointer select-none transition-[background-color,color,border-color,transform,opacity] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "rounded-xl bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "rounded-xl border border-border bg-surface text-foreground hover:bg-elevated hover:border-foreground/20",
        outline: "rounded-xl border border-border bg-transparent text-foreground hover:bg-elevated",
        ghost: "rounded-xl bg-transparent text-muted-foreground hover:bg-elevated hover:text-foreground",
        danger: "rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90",
        destructive: "rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90",
        fab: "rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-raised)] hover:bg-primary/90",
        compact:
          "rounded-lg border border-border bg-transparent text-foreground hover:bg-elevated",
        link: "rounded-md text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 text-sm",
        sm: "h-9 px-3 text-sm",
        xs: "h-8 px-2.5 text-[0.8125rem]",
        lg: "h-12 px-6 text-[0.9375rem]",
        icon: "size-10 rounded-xl p-0",
        "icon-sm": "size-8 rounded-lg p-0",
        fab: "size-14 p-0",
        full: "h-12 w-full px-5 text-[0.9375rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner and blocks interaction; keeps width stable. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        aria-busy={loading || undefined}
        {...props}
        disabled={loading || props.disabled}
      >
        {loading ? (
          <>
            <span className="invisible contents">{children}</span>
            <Loader2 className="absolute animate-spin" aria-hidden />
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
