import { symbolLabel } from "@/lib/icons/symbols";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Search, Sparkles, Trash2, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSetup } from "@/hooks/use-setup";
import { cn } from "@/lib/utils";
import { isRuleValid, totalPercentage } from "@/lib/finance/allocation";
import { searchCurrencies, toMinorUnits, fromMinorUnits, getCurrency } from "@/lib/finance/currency";
import { DEFAULT_RULE_ITEMS } from "@/lib/storage/local-setup-store";
import { pt } from "@/lib/i18n/pt";
import type { Account, AccountType, AllocationRuleItem } from "@/lib/finance/types";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configuração inicial — Finance OS" },
      { name: "description", content: "Sete passos para montares o teu sistema financeiro pessoal." },
      { property: "og:title", content: "Configuração inicial — Finance OS" },
      { property: "og:description", content: "Sete passos para montares o teu sistema financeiro pessoal." },
    ],
  }),
  component: Onboarding,
});

const TOTAL_STEPS = 7;

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Conta bancária" },
  { value: "mobile_wallet", label: "Carteira móvel" },
  { value: "cash", label: "Numerário" },
  { value: "savings", label: "Poupança" },
  { value: "prepaid_card", label: "Cartão pré-pago" },
  { value: "investment", label: "Investimento" },
  { value: "other", label: "Outro" },
];

const ICONS = ["build", "target", "home", "family", "sparkle", "protected", "education", "car", "food", "gift"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function Onboarding() {
  const navigate = useNavigate();
  const { setup, update } = useSetup();
  const [step, setStep] = useState(1);

  const [name, setName] = useState(setup.fullName);
  const [currencyCode, setCurrencyCode] = useState(setup.currencyCode);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AllocationRuleItem[]>(setup.ruleItems.length ? setup.ruleItems : DEFAULT_RULE_ITEMS);
  const [accounts, setAccounts] = useState<Account[]>(setup.accounts);

  const total = totalPercentage(items);
  const ruleOk = isRuleValid(items);
  const currency = getCurrency(currencyCode);

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  function finish() {
    update({
      fullName: name,
      currencyCode,
      ruleItems: items,
      accounts,
      onboardingCompleted: true,
    });
    navigate({ to: "/app" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-10 pt-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="mb-8 flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i < step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="flex-1">
          {step === 1 ? (
            <StepShell
              title={pt.onboarding.welcomeTitle}
              subtitle="Vamos montar o teu sistema em menos de dois minutos."
            >
              <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Sparkles className="size-6" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Como te chamas?</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="O teu nome" />
              </div>
            </StepShell>
          ) : null}

          {step === 2 ? (
            <StepShell title="Qual é a tua moeda?" subtitle="Usamos esta moeda em todo o sistema.">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Procurar moeda"
                />
              </div>
              <div className="space-y-2">
                {searchCurrencies(query).map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setCurrencyCode(c.code)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                      currencyCode === c.code
                        ? "border-primary bg-primary-soft"
                        : "border-border/70 bg-surface",
                    )}
                  >
                    <span>
                      <span className="block text-sm font-medium">
                        {c.code} · {c.symbol}
                      </span>
                      <span className="block text-xs text-muted-foreground">{c.name}</span>
                    </span>
                    {currencyCode === c.code ? <Check className="size-4 text-primary" /> : null}
                  </button>
                ))}
              </div>
            </StepShell>
          ) : null}

          {step === 3 ? (
            <StepShell title={pt.onboarding.philosophy} subtitle="É por isso que separamos duas coisas.">
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/70 bg-surface p-4">
                  <p className="text-sm font-semibold">Contas</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Onde o dinheiro está fisicamente: banco, carteira móvel, numerário.
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/30 bg-primary-soft p-4">
                  <p className="text-sm font-semibold text-primary">Potes</p>
                  <p className="mt-1 text-sm text-primary/80">
                    Para que serve cada parte do dinheiro: construção, objetivos, vida, família, livre.
                  </p>
                </div>
              </div>
            </StepShell>
          ) : null}

          {step === 4 ? (
            <StepShell
              title="A tua primeira regra de distribuição"
              subtitle="Cada entrada será dividida assim. O total tem de ser 100%."
            >
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-border/70 bg-surface p-3">
                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Ícone"
                        value={item.icon}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) => (i === index ? { ...it, icon: e.target.value } : it)),
                          )
                        }
                        className="h-10 w-28 rounded-lg border border-input bg-background px-2 text-sm"
                      >
                        {ICONS.map((icon) => (
                          <option key={icon} value={icon}>
                            {symbolLabel(icon)}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) => (i === index ? { ...it, name: e.target.value } : it)),
                          )
                        }
                      />
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20 text-right"
                          value={item.percentage}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it, i) =>
                                i === index ? { ...it, percentage: Number(e.target.value) } : it,
                              ),
                            )
                          }
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <button
                        aria-label="Remover"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    { id: uid(), name: "Novo pote", percentage: 0, icon: "✨", kind: "free" },
                  ])
                }
                className="mt-3 w-full rounded-xl border border-dashed border-border/70 py-2.5 text-sm text-muted-foreground"
              >
                Adicionar pote
              </button>

              <div
                className={cn(
                  "mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold",
                  ruleOk ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                <span>Total</span>
                <span className="numeric">{total}%</span>
              </div>
              {!ruleOk ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  O total tem de ser exatamente 100% para continuares.
                </p>
              ) : null}
            </StepShell>
          ) : null}

          {step === 5 ? (
            <StepShell
              title="Onde está o teu dinheiro?"
              subtitle="Adiciona as contas reais, com o nome que usas no dia a dia (BIM, Moza, M-Pesa)."
            >
              <div className="space-y-2">
                {accounts.map((account, index) => (
                  <div key={account.id} className="flex items-center gap-2 rounded-xl border border-border/70 bg-surface p-3">
                    <Input
                      value={account.name}
                      placeholder="Nome da conta"
                      onChange={(e) =>
                        setAccounts((prev) =>
                          prev.map((a, i) => (i === index ? { ...a, name: e.target.value } : a)),
                        )
                      }
                    />
                    <select
                      aria-label="Tipo de conta"
                      value={account.type}
                      onChange={(e) =>
                        setAccounts((prev) =>
                          prev.map((a, i) =>
                            i === index ? { ...a, type: e.target.value as AccountType } : a,
                          ),
                        )
                      }
                      className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <button
                      aria-label="Remover"
                      onClick={() => setAccounts((prev) => prev.filter((_, i) => i !== index))}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                {accounts.length === 0 ? (
                  <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/70 py-10 text-center">
                    <Wallet className="mb-2 size-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Ainda não adicionaste contas.</p>
                  </div>
                ) : null}
              </div>
              <button
                onClick={() =>
                  setAccounts((prev) => [
                    ...prev,
                    { id: uid(), name: "", type: "bank", balanceMinor: 0 },
                  ])
                }
                className="mt-3 w-full rounded-xl border border-dashed border-border/70 py-2.5 text-sm text-muted-foreground"
              >
                Adicionar conta
              </button>
            </StepShell>
          ) : null}

          {step === 6 ? (
            <StepShell
              title="Saldos iniciais"
              subtitle="Opcional. Lembra-te: a conta é o lugar físico, o pote é o propósito."
            >
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Não adicionaste contas — podes fazê-lo mais tarde.</p>
              ) : (
                <div className="space-y-2">
                  {accounts.map((account, index) => (
                    <div key={account.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface p-3">
                      <span className="text-sm font-medium">{account.name || "Conta sem nome"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{currency.symbol}</span>
                        <Input
                          inputMode="decimal"
                          className="w-28 text-right"
                          value={account.balanceMinor ? String(fromMinorUnits(account.balanceMinor, currencyCode)) : ""}
                          placeholder="0"
                          onChange={(e) =>
                            setAccounts((prev) =>
                              prev.map((a, i) =>
                                i === index
                                  ? { ...a, balanceMinor: toMinorUnits(e.target.value, currencyCode) }
                                  : a,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </StepShell>
          ) : null}

          {step === 7 ? (
            <StepShell title={pt.onboarding.readyTitle} subtitle="Está tudo pronto para começares.">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Check className="size-7" />
              </div>
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                <li>Moeda: {currency.code}</li>
                <li>Potes: {items.length}</li>
                <li>Contas: {accounts.length}</li>
              </ul>
            </StepShell>
          ) : null}
        </div>

        <div className="mt-8 flex gap-3">
          {step > 1 ? (
            <Button variant="outline" onClick={back} className="flex-1">
              {pt.common.back}
            </Button>
          ) : null}
          {step < TOTAL_STEPS ? (
            <Button onClick={next} disabled={step === 4 && !ruleOk} className="flex-1">
              {pt.common.continue}
            </Button>
          ) : (
            <Button onClick={finish} className="flex-1">
              {pt.onboarding.enterDashboard}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold leading-snug tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
