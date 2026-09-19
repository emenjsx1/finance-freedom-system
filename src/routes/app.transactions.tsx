import { createFileRoute, redirect } from "@tanstack/react-router";

/** Activity is now a primary destination: keep old links working. */
export const Route = createFileRoute("/app/transactions")({
  beforeLoad: () => {
    throw redirect({ to: "/app/activity", replace: true });
  },
  component: () => null,
});
