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
        "relative flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface hover:text-foreground",
        className,
      )}
    >
      <Bell className="size-[18px]" />
      {unread > 0 ? (
        <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
