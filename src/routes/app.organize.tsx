/**
 * "Ajuda-me a organizar" — guided organisation of money that already exists.
 *
 * One decision per screen. The engine proposes options, the person decides, and
 * nothing is applied before an explicit confirmation. Applying an organisation
 * only changes the PURPOSE of money: account balances never move.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { NativeSheet } from "@/components/design/native-sheet";
import { SectionHeader } from "@/components/design/section-header";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { AmountInput } from "@/components/transactions/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLedger } from "@/hooks/use-ledger";
import { usePersonal } from "@/hooks/use-personal";
import { useSetup } from "@/hooks/use-setup";
import { upsertWallet } from "@/lib/finance/setup-ops";
import type { AllocationRuleItem } from "@/lib/finance/types";
import { checkAllocation, fundingMap, generateScenarios } from "@/lib/organize/engine";
import {
  FLEXIBILITY_HINTS,
  FLEXIBILITY_LABELS,
  INCOME_SHAPE_LABELS,
  type FlexibilityChoice,
  type IncomeShape,
  type OrganizeDraft,
  type OrganizePlanInput,
  type OrganizeScenario,
  type ScenarioLine,
} from "@/lib/organize/types";
import { PLAN_PRIORITY_LABELS, type PlanPriority } from "@/lib/personal/types";

export const Route = createFileRoute("/app/organize")({
  head: () => ({
    meta: [
      { title: "Ajuda-me a organizar — Finan." },
      {
        name: "description",
        content:
          "Responde a algumas perguntas e vê formas de organizar o dinheiro que já tens.",
      },
      { property: "og:title", content: "Ajuda-me a organizar — Finan." },
      {
        property: "og:description",
        content: "Opções de organização a partir do dinheiro real das tuas contas.",
      },
    ],
  }),
  component: OrganizePage,
});

type Step =
  | "money"
  | "protection"
  | "plans"
  | "commitments"
  | "income"
  | "flexibility"
  | "scenarios"
  | "adjust"
  | "review"
  | "done";

const ORDER: Step[] = [
  "money",
  "protection",
  "plans",
  "commitments",
  "income",
  "flexibility",
  "scenarios",
];

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function Choice({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected ?? false}
      className={`w-full rounded-2xl border px-5 py-4 text-left transition-colors ${
        selected ? "border-primary bg-primary/10" : "border-border/70 bg-surface hover:bg-muted/40"
      }`}
    >
      <span className="block text-base font-medium">{label}</span>
      {hint ? <span className="mt-1 block text-sm text-muted-foreground">{hint}</span> : null}
    </button>
  );
}

function OrganizePage() {
  const navigate = useNavigate();
  const { setup, update } = useSetup();
  const { snapshot, addTransaction } = useLedger();
  const { state, createPlan, updatePlan } = usePersonal();

  const accounts = useMemo(
    () =>
      [...setup.accounts]
        .filter((a) => !a.archived)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((a) => ({ id: a.id, name: a.name, balanceMinor: snapshot.accountBalances[a.id] ?? 0 })),
    [setup.accounts, snapshot.accountBalances],
  );

  const totalMinor = snapshot.wealthMinor;

  const monthlyCommitments = state.commitments
    .filter((c) => c.active && c.cadence === "monthly")
    .reduce((sum, c) => sum + c.amountMinor, 0);

  const [step, setStep] = useState<Step>("money");
  const [declaredMinor, setDeclaredMinor] = useState<number | null>(null);
  const [declareOpen, setDeclareOpen] = useState(false);

  const [protection, setProtection] = useState<OrganizeDraft["protection"]>("unsure");
  const [protectionMinor, setProtectionMinor] = useState(0);
  const [protectionReason, setProtectionReason] = useState("");

  const [planInputs, setPlanInputs] = useState<OrganizePlanInput[]>(() =>
    state.plans
      .filter((plan) => plan.status === "active" || plan.status === "idea")
      .map((plan) => ({
        planId: plan.id,
        name: plan.name,
        priority: plan.priority,
        targetMinor: plan.targetMinor,
        targetDate: plan.targetDate,
        reservedMinor: plan.walletId ? (snapshot.bucketBalances[plan.walletId] ?? 0) : 0,
        include: plan.status === "active",
      })),
  );
  const [planSheet, setPlanSheet] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanTarget, setNewPlanTarget] = useState(0);
  const [newPlanDate, setNewPlanDate] = useState("");
  const [newPlanPriority, setNewPlanPriority] = useState<PlanPriority>("important");

  const [reserveCommitments, setReserveCommitments] = useState(false);
  const [income, setIncome] = useState<IncomeShape>("unsure");
  const [flexibility, setFlexibility] = useState<FlexibilityChoice>("balanced");
  const [minAvailableMinor, setMinAvailableMinor] = useState(0);

  const [chosen, setChosen] = useState<OrganizeScenario | null>(null);
  const [lines, setLines] = useState<ScenarioLine[]>([]);
  const [applied, setApplied] = useState<{ reserved: number; available: number } | null>(null);

  const draft: OrganizeDraft = useMemo(
    () => ({
      totalMinor,
      currencyCode: setup.currencyCode,
      protection,
      protectionMinor: protection === "amount" ? protectionMinor : undefined,
      protectionReason: protectionReason || undefined,
      plans: planInputs,
      commitmentsMonthlyMinor: monthlyCommitments,
      reserveCommitments,
      income,
      ownership: "personal",
      flexibility,
      minAvailableMinor,
      updatedAt: new Date().toISOString(),
    }),
    [
      totalMinor,
      setup.currencyCode,
      protection,
      protectionMinor,
      protectionReason,
      planInputs,
      monthlyCommitments,
      reserveCommitments,
      income,
      flexibility,
      minAvailableMinor,
    ],
  );

  const scenarios = useMemo(() => generateScenarios(draft), [draft]);
  const check = checkAllocation(lines, totalMinor);
  const map = useMemo(() => fundingMap(lines, accounts), [lines, accounts]);

  const next = () => {
    const index = ORDER.indexOf(step);
    if (index >= 0 && index < ORDER.length - 1) setStep(ORDER[index + 1]!);
  };
  const back = () => {
    const index = ORDER.indexOf(step);
    if (index > 0) setStep(ORDER[index - 1]!);
  };

  /* ---------------- apply ---------------- */

  function ensureWallet(
    name: string,
    kind: AllocationRuleItem["kind"],
    icon: string,
    existingId?: string,
  ): { id: string; items: AllocationRuleItem[] } | null {
    const existing = existingId
      ? setup.ruleItems.find((item) => item.id === existingId)
      : setup.ruleItems.find((item) => !item.archived && item.kind === kind && item.name === name);
    if (existing) return { id: existing.id, items: setup.ruleItems };
    const wallet: AllocationRuleItem = {
      id: newId(),
      name,
      percentage: 0,
      icon,
      kind,
      order: setup.ruleItems.length,
    };
    const patch = upsertWallet({ ...setup, ruleItems: setup.ruleItems }, wallet);
    const items = patch.ruleItems ?? setup.ruleItems;
    update(patch);
    return { id: wallet.id, items };
  }

  function apply() {
    if (!check.ok) return;

    // 1. Resolve the purpose wallet behind each line. Purposes are never accounts.
    const targets: Array<{ walletId: string; amountMinor: number }> = [];
    let items = setup.ruleItems;

    for (const line of lines) {
      if (line.kind === "available" || line.amountMinor <= 0) continue;
      if (line.kind === "protected") {
        const wallet = ensureWallet("Protegido", "protected", "protected");
        if (!wallet) continue;
        items = wallet.items;
        targets.push({ walletId: wallet.id, amountMinor: line.amountMinor });
      } else if (line.kind === "commitments") {
        const wallet = ensureWallet("Compromissos", "goals", "calendar");
        if (!wallet) continue;
        items = wallet.items;
        targets.push({ walletId: wallet.id, amountMinor: line.amountMinor });
      } else if (line.kind === "plan") {
        const plan = line.planId ? state.plans.find((p) => p.id === line.planId) : undefined;
        const wallet = ensureWallet(line.label, "goals", "target", plan?.walletId);
        if (!wallet) continue;
        items = wallet.items;
        if (plan && plan.walletId !== wallet.id) updatePlan(plan.id, { walletId: wallet.id });
        targets.push({ walletId: wallet.id, amountMinor: line.amountMinor });
      }
    }

    // 2. Deltas against what each purpose already holds. Releases run first so
    //    the money they free can fund the increases.
    const now = new Date().toISOString();
    const deltas = targets.map((target) => ({
      ...target,
      delta: target.amountMinor - (snapshot.bucketBalances[target.walletId] ?? 0),
    }));

    let failures = 0;
    for (const target of deltas.filter((d) => d.delta < 0)) {
      const ok = addTransaction({
        id: newId(),
        kind: "reallocation",
        amountMinor: -target.delta,
        occurredAt: now,
        createdAt: now,
        moneyType: "personal",
        tags: ["organizacao"],
        attachments: [],
        description: "Organização — libertado",
        fromBucketId: target.walletId,
      });
      if (!ok) failures += 1;
    }

    // Money with no purpose funds the increases first; spendable purposes after.
    const spendableSources = items
      .filter((item) => !item.archived)
      .filter((item) => (item.includedInAvailable ?? ["life", "family", "free"].includes(item.kind)))
      .map((item) => ({ id: item.id, left: snapshot.bucketBalances[item.id] ?? 0 }));
    let unassignedLeft = snapshot.unallocatedMinor;

    for (const target of deltas.filter((d) => d.delta > 0)) {
      let left = target.delta;
      const fromUnassigned = Math.min(left, Math.max(0, unassignedLeft));
      if (fromUnassigned > 0) {
        unassignedLeft -= fromUnassigned;
        left -= fromUnassigned;
        const ok = addTransaction({
          id: newId(),
          kind: "reallocation",
          amountMinor: fromUnassigned,
          occurredAt: now,
          createdAt: now,
          moneyType: "personal",
          tags: ["organizacao"],
          attachments: [],
          description: "Organização",
          toBucketId: target.walletId,
        });
        if (!ok) failures += 1;
      }
      for (const source of spendableSources) {
        if (left <= 0) break;
        if (source.left <= 0) continue;
        const take = Math.min(source.left, left);
        source.left -= take;
        left -= take;
        const ok = addTransaction({
          id: newId(),
          kind: "reallocation",
          amountMinor: take,
          occurredAt: now,
          createdAt: now,
          moneyType: "personal",
          tags: ["organizacao"],
          attachments: [],
          description: "Organização",
          fromBucketId: source.id,
          toBucketId: target.walletId,
        });
        if (!ok) failures += 1;
      }
    }

    if (failures > 0) {
      toast.error("Parte da organização não foi aplicada. Revê os valores.");
      return;
    }

    const reserved = lines
      .filter((line) => line.kind !== "available")
      .reduce((sum, line) => sum + line.amountMinor, 0);
    setApplied({ reserved, available: totalMinor - reserved });
    setStep("done");
  }

  /* ---------------- empty and zero states ---------------- */

  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ajuda-me a organizar" subtitle="Primeiro, onde guardas o teu dinheiro?" />
        <section className="card-standard text-center">
          <p className="type-secondary">
            Para organizar dinheiro real, o sistema precisa de saber onde ele está.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/app/accounts">Adicionar primeira conta</Link>
          </Button>
        </section>
      </div>
    );
  }

  if (totalMinor <= 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ajuda-me a organizar" subtitle="Ainda não há dinheiro para organizar." />
        <section className="card-standard text-center">
          <p className="type-secondary">
            Podes criar planos agora e organizar o dinheiro quando ele chegar.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/app/plans">Criar um plano</Link>
          </Button>
        </section>
      </div>
    );
  }

  /* ---------------- steps ---------------- */

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Ajuda-me a organizar"
        subtitle="Responde a algumas perguntas e vê formas de organizar o teu dinheiro."
        {...(step !== "done"
          ? {
              action: (
                <button
                  type="button"
                  className="text-sm text-muted-foreground"
                  onClick={() => navigate({ to: "/app/money" })}
                >
                  Sair
                </button>
              ),
            }
          : {})}
      />

      {step === "money" ? (
        <section className="space-y-5">
          <div className="card-hero">
            <p className="type-meta">O sistema encontrou nas tuas contas</p>
            <p className="type-hero mt-2">
              <Money minor={totalMinor} options={{ withSymbol: false, compactDecimals: true }} />
              <span className="type-hero-currency"> {setup.currencyCode}</span>
            </p>
          </div>
          <ul className="list-group">
            {accounts.map((account) => (
              <li key={account.id} className="list-row">
                <span>{account.name}</span>
                <Money minor={account.balanceMinor} className="font-medium" />
              </li>
            ))}
          </ul>
          {declaredMinor !== null && declaredMinor !== totalMinor ? (
            <div className="card-standard">
              <p className="type-secondary">
                As contas registadas somam <Money minor={totalMinor} />. Não vamos inventar a
                diferença.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <Button variant="secondary" asChild>
                  <Link to="/app/accounts">Rever contas</Link>
                </Button>
                <Button variant="ghost" onClick={() => setDeclaredMinor(null)}>
                  Continuar com os valores registados
                </Button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Button onClick={next}>Usar estes valores</Button>
            <Button variant="secondary" onClick={() => setDeclareOpen(true)}>
              Tenho um valor diferente
            </Button>
          </div>
        </section>
      ) : null}

      {step === "protection" ? (
        <section className="space-y-4">
          <h2 className="type-section">Há dinheiro que já sabes que não queres tocar?</h2>
          <div className="space-y-2">
            <Choice
              label="Sim, tenho um valor em mente"
              selected={protection === "amount"}
              onClick={() => setProtection("amount")}
            />
            <Choice
              label="Ainda não sei"
              hint="Sem problema. As opções vão mostrar níveis de proteção diferentes."
              selected={protection === "unsure"}
              onClick={() => setProtection("unsure")}
            />
            <Choice label="Não" selected={protection === "none"} onClick={() => setProtection("none")} />
          </div>
          {protection === "amount" ? (
            <div className="card-standard space-y-4">
              <AmountInput
                valueMinor={protectionMinor}
                onChange={setProtectionMinor}
                currencyCode={setup.currencyCode}
                label="Quanto queres manter protegido"
              />
              <Input
                value={protectionReason}
                onChange={(event) => setProtectionReason(event.target.value)}
                placeholder="Porquê? (opcional)"
              />
            </div>
          ) : null}
          <StepNav onBack={back} onNext={next} />
        </section>
      ) : null}

      {step === "plans" ? (
        <section className="space-y-4">
          <h2 className="type-section">
            {planInputs.length ? "Estes planos continuam importantes?" : "Estás a preparar-te para algo?"}
          </h2>
          {planInputs.length === 0 ? (
            <p className="type-secondary">
              Pode ser uma viagem, um carro, casa, estudos, negócio ou uma reserva. Também podes não
              ter nenhum agora.
            </p>
          ) : null}
          <ul className="space-y-2">
            {planInputs.map((plan, index) => (
              <li key={plan.planId ?? plan.name}>
                <button
                  type="button"
                  aria-pressed={plan.include}
                  onClick={() =>
                    setPlanInputs((prev) =>
                      prev.map((p, i) => (i === index ? { ...p, include: !p.include } : p)),
                    )
                  }
                  className={`w-full rounded-2xl border px-5 py-4 text-left ${
                    plan.include ? "border-primary bg-primary/10" : "border-border/70 bg-surface"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-base font-medium">{plan.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {PLAN_PRIORITY_LABELS[plan.priority]}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {plan.targetMinor === undefined ? (
                      "Sem valor definido"
                    ) : (
                      <>
                        Falta <Money minor={Math.max(0, plan.targetMinor - plan.reservedMinor)} />
                      </>
                    )}
                    {plan.include ? "" : " · fora desta organização"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Button variant="secondary" onClick={() => setPlanSheet(true)}>
            Criar um plano aqui
          </Button>
          <StepNav onBack={back} onNext={next} />
        </section>
      ) : null}

      {step === "commitments" ? (
        <section className="space-y-4">
          <h2 className="type-section">Compromissos que já conheces</h2>
          {state.commitments.filter((c) => c.active).length === 0 ? (
            <p className="type-secondary">
              Ainda não registaste compromissos como renda, internet ou propinas.
            </p>
          ) : (
            <ul className="list-group">
              {state.commitments
                .filter((c) => c.active)
                .map((commitment) => (
                  <li key={commitment.id} className="list-row">
                    <span>{commitment.name}</span>
                    <Money minor={commitment.amountMinor} className="font-medium" />
                  </li>
                ))}
            </ul>
          )}
          {monthlyCommitments > 0 ? (
            <Choice
              label="Reservar os compromissos deste mês"
              hint="Um compromisso só é gasto quando acontece. Reservar apenas separa o dinheiro."
              selected={reserveCommitments}
              onClick={() => setReserveCommitments((value) => !value)}
            />
          ) : null}
          <Button variant="ghost" asChild>
            <Link to="/app/commitments">Adicionar compromisso</Link>
          </Button>
          <StepNav onBack={back} onNext={next} />
        </section>
      ) : null}

      {step === "income" ? (
        <section className="space-y-4">
          <h2 className="type-section">Como costuma entrar o teu dinheiro?</h2>
          <div className="space-y-2">
            {(Object.keys(INCOME_SHAPE_LABELS) as IncomeShape[]).map((shape) => (
              <Choice
                key={shape}
                label={INCOME_SHAPE_LABELS[shape]}
                selected={income === shape}
                onClick={() => setIncome(shape)}
              />
            ))}
          </div>
          <StepNav onBack={back} onNext={next} />
        </section>
      ) : null}

      {step === "flexibility" ? (
        <section className="space-y-4">
          <h2 className="type-section">Quanto conforto queres manter no dinheiro disponível?</h2>
          <div className="space-y-2">
            {(Object.keys(FLEXIBILITY_LABELS) as FlexibilityChoice[]).map((choice) => (
              <Choice
                key={choice}
                label={FLEXIBILITY_LABELS[choice]}
                hint={FLEXIBILITY_HINTS[choice]}
                selected={flexibility === choice}
                onClick={() => setFlexibility(choice)}
              />
            ))}
          </div>
          <div className="card-standard">
            <AmountInput
              valueMinor={minAvailableMinor}
              onChange={setMinAvailableMinor}
              currencyCode={setup.currencyCode}
              label="Manter sempre disponível pelo menos"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Este limite nunca é ultrapassado pelas opções.
            </p>
          </div>
          <StepNav onBack={back} onNext={next} nextLabel="Ver opções" />
        </section>
      ) : null}

      {step === "scenarios" ? (
        <section className="space-y-5">
          <p className="type-secondary">
            Com base no que disseste, aqui estão algumas formas de organizar. Nenhuma é a correta —
            são caminhos diferentes.
          </p>
          {scenarios.map((scenario) => (
            <article key={scenario.id} className="card-standard space-y-3">
              <header>
                <h3 className="text-base font-semibold">{scenario.title}</h3>
                <p className="text-sm text-muted-foreground">{scenario.subtitle}</p>
              </header>
              <ul className="space-y-1">
                {scenario.lines.map((line) => (
                  <li key={line.key} className="flex items-center justify-between text-sm">
                    <span className={line.kind === "available" ? "text-muted-foreground" : ""}>
                      {line.label}
                    </span>
                    <Money minor={line.amountMinor} className="font-medium" />
                  </li>
                ))}
              </ul>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {scenario.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setChosen(scenario);
                    setLines(scenario.lines);
                    setStep("review");
                  }}
                >
                  Usar esta organização
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setChosen(scenario);
                    setLines(scenario.lines);
                    setStep("adjust");
                  }}
                >
                  Ajustar
                </Button>
              </div>
            </article>
          ))}
          <Button variant="ghost" onClick={back}>
            Mudar as respostas
          </Button>
        </section>
      ) : null}

      {step === "adjust" ? (
        <section className="space-y-4">
          <h2 className="type-section">Ajustar {chosen?.title.toLowerCase()}</h2>
          <div className="space-y-4">
            {lines
              .filter((line) => line.kind !== "available")
              .map((line) => (
                <div key={line.key} className="card-standard">
                  <AmountInput
                    valueMinor={line.amountMinor}
                    onChange={(value) =>
                      setLines((prev) => {
                        const updated = prev.map((item) =>
                          item.key === line.key ? { ...item, amountMinor: value } : item,
                        );
                        const assigned = updated
                          .filter((item) => item.kind !== "available")
                          .reduce((sum, item) => sum + item.amountMinor, 0);
                        return updated.map((item) =>
                          item.kind === "available"
                            ? { ...item, amountMinor: totalMinor - assigned }
                            : item,
                        );
                      })
                    }
                    currencyCode={setup.currencyCode}
                    label={line.label}
                  />
                </div>
              ))}
          </div>
          <div className="card-standard flex items-center justify-between">
            <span className="type-secondary">Disponível</span>
            <Money
              minor={lines.find((line) => line.kind === "available")?.amountMinor ?? 0}
              className="font-semibold"
            />
          </div>
          {!check.ok ? (
            <p className="text-sm text-destructive">
              Estás a organizar <Money minor={check.overByMinor} /> a mais do que tens.
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button disabled={!check.ok} onClick={() => setStep("review")}>
              Continuar
            </Button>
            <Button variant="ghost" onClick={() => setStep("scenarios")}>
              Ver outra possibilidade
            </Button>
          </div>
        </section>
      ) : null}

      {step === "review" ? (
        <section className="space-y-5">
          <h2 className="type-section">Rever organização</h2>
          <ul className="list-group">
            <li className="list-row">
              <span>Total</span>
              <Money minor={totalMinor} className="font-semibold" />
            </li>
            {lines.map((line) => (
              <li key={line.key} className="list-row">
                <span className={line.kind === "available" ? "text-muted-foreground" : ""}>
                  {line.label}
                </span>
                <Money minor={line.amountMinor} className="font-medium" />
              </li>
            ))}
          </ul>

          <div>
            <SectionHeader title="Onde está este dinheiro" />
            <ul className="list-group">
              {map.map((entry) => (
                <li key={entry.key} className="flex flex-col gap-1 px-4 py-3">
                  <span className="flex items-center justify-between text-sm font-medium">
                    {entry.label}
                    <Money minor={entry.amountMinor} />
                  </span>
                  {entry.from.map((source) => (
                    <span
                      key={source.accountId}
                      className="flex items-center justify-between text-sm text-muted-foreground"
                    >
                      {source.accountName}
                      <Money minor={source.amountMinor} />
                    </span>
                  ))}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              Nada sai das contas. Organizar muda o propósito do dinheiro, não o sítio onde ele está.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button disabled={!check.ok} onClick={apply}>
              Aplicar organização
            </Button>
            <Button variant="ghost" onClick={() => setStep("adjust")}>
              Ajustar valores
            </Button>
          </div>
        </section>
      ) : null}

      {step === "done" && applied ? (
        <section className="space-y-5">
          <div className="card-hero">
            <p className="type-meta">O teu dinheiro está organizado.</p>
            <p className="type-hero mt-2">
              <Money minor={totalMinor} options={{ withSymbol: false, compactDecimals: true }} />
              <span className="type-hero-currency"> {setup.currencyCode}</span>
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="type-meta">Reservado</p>
                <Money minor={applied.reserved} className="type-section" />
              </div>
              <div>
                <p className="type-meta">Disponível</p>
                <Money minor={applied.available} className="type-section" />
              </div>
            </div>
          </div>
          <div className="card-standard space-y-3">
            <p className="type-secondary">
              Queres que o sistema te ajude também quando entrar dinheiro novo?
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" asChild>
                <Link to="/app/strategy">Sim, mostrar sugestões</Link>
              </Button>
              <Button variant="ghost" onClick={() => navigate({ to: "/app/money" })}>
                Agora não
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Esta organização não cria nenhuma regra futura por si só.
            </p>
          </div>
        </section>
      ) : null}

      <NativeSheet
        open={declareOpen}
        onOpenChange={setDeclareOpen}
        title="Quanto tens atualmente?"
        description="Se o valor for diferente do registado, não alteramos nenhuma conta."
      >
        <AmountInput
          valueMinor={declaredMinor ?? totalMinor}
          onChange={setDeclaredMinor}
          currencyCode={setup.currencyCode}
          label="Valor total"
          autoFocus
        />
        <Button className="mt-4 w-full" onClick={() => setDeclareOpen(false)}>
          Confirmar
        </Button>
      </NativeSheet>

      <NativeSheet
        open={planSheet}
        onOpenChange={setPlanSheet}
        title="Novo plano"
        description="O valor e a data podem ficar por definir."
      >
        <div className="space-y-4">
          <Input
            value={newPlanName}
            onChange={(event) => setNewPlanName(event.target.value)}
            placeholder="O que queres construir?"
            autoFocus
          />
          <AmountInput
            valueMinor={newPlanTarget}
            onChange={setNewPlanTarget}
            currencyCode={setup.currencyCode}
            label="Valor-alvo (opcional)"
          />
          <Input
            type="date"
            value={newPlanDate}
            onChange={(event) => setNewPlanDate(event.target.value)}
          />
          <div className="flex gap-2">
            {(Object.keys(PLAN_PRIORITY_LABELS) as PlanPriority[]).map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => setNewPlanPriority(priority)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  newPlanPriority === priority
                    ? "bg-primary text-primary-foreground"
                    : "bg-subtle text-muted-foreground"
                }`}
              >
                {PLAN_PRIORITY_LABELS[priority]}
              </button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={!newPlanName.trim()}
            onClick={() => {
              const plan = createPlan({
                name: newPlanName.trim(),
                type: "custom",
                status: "active",
                priority: newPlanPriority,
                financial: newPlanTarget > 0,
                ...(newPlanTarget > 0 ? { targetMinor: newPlanTarget } : {}),
                ...(newPlanDate ? { targetDate: newPlanDate } : {}),
              });
              setPlanInputs((prev) => [
                ...prev,
                {
                  planId: plan.id,
                  name: plan.name,
                  priority: plan.priority,
                  targetMinor: plan.targetMinor,
                  targetDate: plan.targetDate,
                  reservedMinor: 0,
                  include: true,
                },
              ]);
              setNewPlanName("");
              setNewPlanTarget(0);
              setNewPlanDate("");
              setPlanSheet(false);
            }}
          >
            Guardar plano
          </Button>
        </div>
      </NativeSheet>
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextLabel = "Continuar",
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <Button variant="ghost" onClick={onBack}>
        Voltar
      </Button>
      <Button className="flex-1" onClick={onNext}>
        {nextLabel}
      </Button>
    </div>
  );
}
