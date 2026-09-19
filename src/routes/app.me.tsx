import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { SectionHeader } from "@/components/design/section-header";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { PlanCard } from "@/components/personal/plan-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
import { goalPace, planConflicts } from "@/lib/personal/engine";
import { DIRECTION_HORIZON_LABELS } from "@/lib/personal/types";

export const Route = createFileRoute("/app/me")({
  head: () => ({
    meta: [
      { title: "Eu — Norte" },
      { name: "description", content: "Direção, planos, estratégia e o que o Agente sabe sobre ti." },
      { property: "og:title", content: "Eu — Norte" },
      { property: "og:description", content: "O teu espaço pessoal dentro da aplicação." },
    ],
  }),
  component: MePage,
});

function MePage() {
  const { state } = usePersonal();
  const { profile } = useAuth();
  const { snapshot } = useLedger();

  const activePlans = state.plans.filter((p) => p.status === "active");

  const savedFor = (walletId?: string) =>
    walletId ? (snapshot.wallets.find((w) => w.id === walletId)?.balanceMinor ?? 0) : 0;

  /** Capacity is only what is genuinely free today — never a projection. */
  const conflict = useMemo(
    () =>
      planConflicts(
        activePlans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          requiredMonthlyMinor: goalPace(plan, savedFor(plan.walletId))?.requiredMonthlyMinor ?? null,
        })),
        snapshot.spendableMinor,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePlans, snapshot.spendableMinor, snapshot.wallets],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={profile?.preferred_name ? profile.preferred_name : "Eu"}
        subtitle={state.headline ?? "O teu espaço: direção, planos e o que o Agente sabe."}
      />

      {(() => {
        /* Meu momento: only what the person has written themselves. */
        const agora = state.direction.filter((d) => d.horizon === "now");
        const questoes = state.direction.filter((d) => d.horizon === "exploring");
        const prioridades = activePlans.filter((p) => p.priority === "now");
        if (!agora.length && !questoes.length && !prioridades.length) return null;
        return (
          <section className="card-standard space-y-4">
            <p className="type-meta">Meu momento</p>
            {agora.length ? (
              <div>
                <p className="type-meta">Agora</p>
                {agora.slice(0, 2).map((item) => (
                  <p key={item.id} className="type-heading mt-1">{item.content}</p>
                ))}
              </div>
            ) : null}
            {prioridades.length ? (
              <div>
                <p className="type-meta">Prioridades atuais</p>
                {prioridades.slice(0, 3).map((plan) => (
                  <p key={plan.id} className="type-secondary mt-1">{plan.name}</p>
                ))}
              </div>
            ) : null}
            {questoes.length ? (
              <div>
                <p className="type-meta">Questões em aberto</p>
                {questoes.slice(0, 3).map((item) => (
                  <p key={item.id} className="type-secondary mt-1">{item.content}</p>
                ))}
              </div>
            ) : null}
          </section>
        );
      })()}

      <section className="list-group">
        <Link to="/app/direction" className="list-row justify-between">
          <span>Direção</span>
          <span className="type-meta">
            {state.direction.length ? `${state.direction.length} notas` : "Por escrever"}
          </span>
        </Link>
        <Link to="/app/development" className="list-row justify-between">
          <span>Meu desenvolvimento</span>
          <span className="type-meta">
            {state.development.programs.filter((p) => p.status === "active").length
              ? `${state.development.programs.filter((p) => p.status === "active").length} a decorrer`
              : "Explorar"}
          </span>
        </Link>
        <Link to="/app/plans" className="list-row justify-between">
          <span>Planos</span>
          <span className="type-meta">{state.plans.length || "Nenhum"}</span>
        </Link>
        <Link to="/app/development/programs" className="list-row justify-between">
          <span>Os meus programas</span>
          <span className="type-meta">{state.development.programs.length || "Nenhum"}</span>
        </Link>
        <Link to="/app/development/evolution" className="list-row justify-between">
          <span>A minha evolução</span>
          <span className="type-meta">{state.development.evolution.length || "Ainda nada"}</span>
        </Link>
        <Link to="/app/development/decisions" className="list-row justify-between">
          <span>As minhas decisões</span>
          <span className="type-meta">{state.development.decisions.length || "Nenhuma"}</span>
        </Link>
        <Link to="/app/strategy" className="list-row justify-between">
          <span>Estratégia</span>
          <span className="type-meta">{state.strategy?.name ?? "Sem regra"}</span>
        </Link>
        <Link to="/app/context" className="list-row justify-between">
          <span>O que o sistema sabe sobre mim</span>
          <span className="type-meta">{state.context.length || "Nada"}</span>
        </Link>
        <Link to="/app/reminders" className="list-row justify-between">
          <span>Os meus lembretes</span>
          <span className="type-meta">O que pediste para lembrar</span>
        </Link>
        <Link to="/app/review" className="list-row justify-between">
          <span>Revisão</span>
          <span className="type-meta">Sem pontuações</span>
        </Link>
      </section>

      {state.direction.length ? (
        <section>
          <SectionHeader title="A tua direção" />
          <div className="list-group">
            {state.direction.slice(0, 4).map((item) => (
              <div key={item.id} className="list-row justify-between">
                <span className="text-sm">{item.content}</span>
                <span className="type-meta">{DIRECTION_HORIZON_LABELS[item.horizon]}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activePlans.length ? (
        <section>
          <SectionHeader title="Planos ativos" actionLabel="Ver todos" to="/app/plans" />
          <div className="space-y-3">
            {activePlans.slice(0, 3).map((plan) => (
              <PlanCard key={plan.id} plan={plan} savedMinor={savedFor(plan.walletId)} />
            ))}
          </div>
        </section>
      ) : (
        <section className="card-standard text-center">
          <p className="type-secondary">Ainda não há planos. Não há pressa.</p>
          <Button className="mt-4" asChild>
            <Link to="/app/plans">Criar o primeiro plano</Link>
          </Button>
        </section>
      )}

      {conflict ? (
        <section className="card-standard">
          <SectionHeader title="Os teus planos não cabem todos ao mesmo tempo" />
          <p className="type-secondary mt-1">
            Para cumprir todas as datas precisarias de{" "}
            <Money minor={conflict.requiredMinor} options={{ compactDecimals: true }} /> por mês e tens{" "}
            <Money minor={conflict.monthlyCapacityMinor} options={{ compactDecimals: true }} /> disponíveis.
          </p>
          <p className="type-meta mt-2">
            Isto não é um erro. Podes adiar uma data, baixar um valor ou deixar um plano em pausa.
          </p>
        </section>
      ) : null}

      <div className="border-t border-border/60 pt-6">
        <SectionHeader title="Conta" />
        <section className="list-group">
          <Link to="/app/profile/personal" className="list-row justify-between">
            <span>Perfil e dados pessoais</span>
            <span className="type-meta">{profile?.preferred_name ?? "Informação pessoal"}</span>
          </Link>
          <Link to="/app/profile/security" className="list-row justify-between">
            <span>Acesso e segurança</span>
            <span className="type-meta" aria-hidden>
              ›
            </span>
          </Link>
          <Link to="/app/personalization" className="list-row justify-between">
            <span>Aparência</span>
            <span className="type-meta" aria-hidden>
              ›
            </span>
          </Link>
          <Link to="/app/notification-settings" className="list-row justify-between">
            <span>Notificações</span>
            <span className="type-meta" aria-hidden>
              ›
            </span>
          </Link>
          <Link to="/app/privacy" className="list-row justify-between">
            <span>Privacidade e dados</span>
            <span className="type-meta" aria-hidden>
              ›
            </span>
          </Link>
          <Link to="/app/help" className="list-row justify-between">
            <span>Ajuda e legal</span>
            <span className="type-meta" aria-hidden>
              ›
            </span>
          </Link>
          <Link to="/app/profile" className="list-row justify-between">
            <span>Conta e definições</span>
            <span className="type-meta" aria-hidden>
              ›
            </span>
          </Link>
        </section>
      </div>
    </div>
  );
}
