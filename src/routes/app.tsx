import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { TransactionLauncherProvider } from "@/components/transactions/transaction-launcher";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  return (
    <TransactionLauncherProvider>
      <AppShell />
    </TransactionLauncherProvider>
  );
}
