import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

/** Quiet entry point. The badge only counts items that still need attention. */
export function NotificationBell({ className }: { className?: string }) {
  const { unread } = useNotifications();

  return (
    <Link
      to="/app/notifications"
      aria-label={unread ? `Notificações, ${unread} por ler` : "Notificações"}
      className={cn(
        "relative flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border/70 bg-surface text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
    >
      <Bell className="size-[18px]" />
      {unread > 0 ? (
        <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
