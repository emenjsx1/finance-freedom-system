import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  BookUser,
  Brain,
  CircleHelp,
  Download,
  Info,
  Landmark,
  KeyRound,
  ListTree,
  LifeBuoy,
  LogOut,
  MessageSquare,
  Palette,
  ShieldCheck,
  Sliders,
  Target,
  Wallet,
  Zap,
  Link2,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { APP_VERSION } from "@/lib/app-info";

import { SettingsGroup, SettingsRow } from "@/components/design/settings-list";
import { UserAvatar } from "@/components/design/user-avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useSetup } from "@/hooks/use-setup";
import { queryClientFreeSignOut } from "@/lib/auth/sign-out";

export const Route = createFileRoute("/app/profile/")({
  head: () => ({
    meta: [
      { title: "Conta — Norte" },
      { name: "description", content: "A tua conta: dados pessoais, acesso e segurança, finanças e aplicação." },
      { property: "og:title", content: "Conta — Norte" },
      { property: "og:description", content: "Gere o teu perfil, acesso e preferências." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const { setup } = useSetup();
  const navigate = useNavigate();
  const [confirmOut, setConfirmOut] = useState(false);

  const displayName = profile?.preferred_name || profile?.full_name || setup.fullName || "A tua conta";

  async function handleSignOut() {
    await queryClientFreeSignOut(signOut);
    setConfirmOut(false);
    toast.success("Sessão terminada.");
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-8 pb-6">
      <header className="pt-1">
        <div className="flex items-center gap-4">
          <UserAvatar
            size="lg"
            name={displayName}
            email={user?.email ?? null}
            imageUrl={profile?.avatar_url ?? null}
          />
          <div className="min-w-0">
            <h1 className="type-title truncate">{displayName}</h1>
            <p className="type-secondary truncate">{user?.email ?? "Sessão não iniciada"}</p>
          </div>
        </div>

        {user ? (
          <Button asChild variant="secondary" size="sm" className="mt-5">
            <Link to="/app/profile/personal">Gerir conta</Link>
          </Button>
        ) : (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button asChild size="sm">
              <Link to="/auth">Entrar ou criar conta</Link>
            </Button>
            <p className="type-meta">Os teus dados continuam neste dispositivo.</p>
          </div>
        )}
      </header>

      <SettingsGroup title="Conta">
        <SettingsRow icon={BookUser} label="Informação pessoal" to="/app/profile/personal" />
        <SettingsRow icon={ShieldCheck} label="Acesso e segurança" to="/app/profile/security" />
        <SettingsRow icon={Link2} label="Métodos de acesso" to="/app/profile/methods" />
      </SettingsGroup>

      <SettingsGroup title="Finanças">
        <SettingsRow icon={Landmark} label="Contas" value={`${setup.accounts.length}`} to="/app/accounts" />
        <SettingsRow icon={Wallet} label="Organização do dinheiro" value={`${setup.ruleItems.length}`} to="/app/wallets" />
        <SettingsRow icon={Target} label="Objetivos" to="/app/goals" />
        <SettingsRow icon={ListTree} label="Categorias" to="/app/analytics" />
      </SettingsGroup>

      <SettingsGroup title="Agente">
        <SettingsRow icon={MessageSquare} label="O meu Agente" to="/app/agent" />
        <SettingsRow icon={Brain} label="Memória do Agente" to="/app/agent-settings" />
        <SettingsRow icon={Sliders} label="Personalização" to="/app/personalization" />
        <SettingsRow icon={Bell} label="Notificações" to="/app/notification-settings" />
        <SettingsRow icon={Zap} label="Automações" to="/app/automations" />
      </SettingsGroup>

      <SettingsGroup title="Aplicação">
        <SettingsRow icon={Palette} label="Aparência" to="/app/personalization" />
        <SettingsRow icon={EyeOff} label="Privacidade e dados" to="/app/privacy" />
        <SettingsRow icon={KeyRound} label="Segurança" to="/app/profile/security" />
        <SettingsRow icon={Download} label="Exportar dados" to="/app/privacy" />
      </SettingsGroup>

      <SettingsGroup title="Ajuda e legal">
        <SettingsRow icon={CircleHelp} label="Ajuda e legal" to="/app/help" />
        <SettingsRow icon={LifeBuoy} label="Falar com o apoio" onSelect={() => window.open("/support", "_blank")} />
        <SettingsRow icon={Info} label="Sobre" value={`Norte ${APP_VERSION}`} />
      </SettingsGroup>

      {user ? (
        <div className="list-group">
          <SettingsRow icon={LogOut} label="Sair" destructive onSelect={() => setConfirmOut(true)} />
        </div>
      ) : null}

      <AlertDialog open={confirmOut} onOpenChange={setConfirmOut}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminar sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Podes voltar a entrar quando quiseres. Nada é apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleSignOut()}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
