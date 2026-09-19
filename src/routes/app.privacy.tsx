import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, EyeOff, FileJson, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { SettingsGroup, SettingsRow } from "@/components/design/settings-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useLedger } from "@/hooks/use-ledger";
import { useSetup } from "@/hooks/use-setup";
import { authErrorMessage } from "@/lib/auth/errors";
import { deleteMyAccount } from "@/lib/account/account.functions";

export const Route = createFileRoute("/app/privacy")({
  head: () => ({
    meta: [
      { title: "Privacidade e dados — Finance OS" },
      { name: "description", content: "Modo privado, exportação de dados e eliminação da conta." },
      { property: "og:title", content: "Privacidade e dados — Finance OS" },
      { property: "og:description", content: "Controla os teus dados: exporta ou elimina quando quiseres." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { setup, update } = useSetup();
  const { ledger } = useLedger();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const remove = useServerFn(deleteMyAccount);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  function exportJson() {
    download(
      "finance-os-dados.json",
      "application/json",
      JSON.stringify({ setup, ledger, exportedAt: new Date().toISOString() }, null, 2),
    );
    toast.success("Exportação criada.");
  }

  function exportCsv() {
    const header = "data;tipo;valor_minor;moeda;conta;categoria;descricao\n";
    const rows = ledger.transactions
      .map((tx) =>
        [
          tx.occurredAt,
          tx.kind,
          tx.amountMinor,
          setup.currencyCode,
          tx.accountId ?? "",
          tx.categoryId ?? "",
          (tx.description ?? tx.merchant ?? "").replaceAll(";", ","),
        ].join(";"),
      )
      .join("\n");
    download("finance-os-movimentos.csv", "text/csv", header + rows);
    toast.success("Exportação criada.");
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await remove({});
      await signOut();
      toast.success("A conta foi eliminada.");
      void navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(authErrorMessage(error));
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <PageHeader title="Privacidade e dados" subtitle="Os teus dados são teus. Leva-os ou apaga-os quando quiseres." />

      <SettingsGroup title="Privacidade">
        <SettingsRow
          icon={EyeOff}
          label="Modo privado"
          trailing={
            <Switch
              checked={setup.privacyMode}
              aria-label="Modo privado"
              onCheckedChange={(checked) => update({ privacyMode: checked })}
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Exportar" footer="A exportação acontece no teu dispositivo.">
        <SettingsRow icon={FileJson} label="Exportar tudo (JSON)" onSelect={exportJson} />
        <SettingsRow icon={Download} label="Exportar movimentos (CSV)" onSelect={exportCsv} />
      </SettingsGroup>

      <SettingsGroup title="Zona sensível" footer="Eliminar a conta é permanente e não pode ser desfeito.">
        {user ? (
          <SettingsRow icon={Trash2} label="Eliminar conta" destructive onSelect={() => setConfirmOpen(true)} />
        ) : (
          <SettingsRow icon={Trash2} label="Eliminar conta" value="Sem sessão" to="/auth" />
        )}
      </SettingsGroup>

      <p className="type-meta">
        Precisas de ajuda? <Link to="/app/profile" className="text-primary">Volta à tua conta</Link>.
      </p>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar a conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto apaga a tua conta e o perfil de forma permanente. Escreve ELIMINAR para confirmares.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="type-meta">Confirmação</Label>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="ELIMINAR" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={confirmText.trim().toUpperCase() !== "ELIMINAR" || busy}
              onClick={() => void handleDelete()}
            >
              {busy ? <Loader2 className="animate-spin" /> : null}
              Eliminar conta
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function download(filename: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
