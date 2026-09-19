import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toasts sit below the status bar / dynamic island, never under it, and the
 * action button wraps instead of covering the text on narrow phones.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      offset="calc(env(safe-area-inset-top) + 0.75rem)"
      mobileOffset={{
        top: "calc(env(safe-area-inset-top) + 0.75rem)",
        left: "0.75rem",
        right: "0.75rem",
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast w-full flex-wrap items-start gap-x-3 gap-y-2 rounded-2xl group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border/70 group-[.toaster]:shadow-lg",
          title: "text-[0.9375rem] font-semibold leading-snug",
          description: "group-[.toast]:text-muted-foreground text-[0.8125rem] leading-snug",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground ml-0 mt-1 shrink-0 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
