import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { NativeSheet } from "@/components/design/native-sheet";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { AmountInput } from "@/components/transactions/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePersonal } from "@/hooks/use-personal";
import { useSetup } from "@/hooks/use-setup";
import {
  COMMITMENT_CADENCE_LABELS,
  type CommitmentCadence,
} from "@/lib/personal/types";

export const Route = createFileRoute("/app/commitments")({
  head: () => ({
    meta: [
      { title: "Compromissos — Norte" },
      { name: "description", content: "O que esperas pagar: renda, internet, apoio à família." },
      { property: "og:title", content: "Compromissos — Norte" },
      { property: "og:description", content: "Compromissos esperados, nunca descontados antes de acontecerem." },
    ],
  }),
  component: CommitmentsPage,
});

/** The next date a monthly commitment falls due, in the person's own calendar. */
function nextDue(dueDay?: number): string | null {
  if (!dueDay) return null;
  const now = new Date();
  const candidate = new Date(now.getFullYear(), now.getMonth(), dueDay);
  if (candidate < now) candidate.setMonth(candidate.getMonth() + 1);
  return candidate.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}

function CommitmentsPage() {
  const { state, addCommitment, removeCommitment } = usePersonal();
  const { setup } = useSetup();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amountMinor, setAmountMinor] = useState(0);
  const [cadence, setCadence] = useState<CommitmentCadence>("monthly");
  const [dueDay, setDueDay] = useState("1");
  const [accountId, setAccountId] = useState<string>("");

  const accounts = setup.accounts.filter((a) => !a.archived);

  function submit() {
    addCommitment({
      name: name.trim(),
      amountMinor,
      cadence,
      active: true,
      ...(cadence === "monthly" ? { dueDay: Number(dueDay) } : {}),
      ...(accountId ? { accountId } : {}),
    });
    setOpen(false);
    setName("");
    setAmountMinor(0);
    setCadence("monthly");
    setDueDay("1");
    setAccountId("");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Compromissos"
        subtitle="O que esperas pagar. Nada sai do teu saldo antes de acontecer."
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Adicionar
          </Button>
        }
      />

      {state.commitments.length === 0 ? (
        <section className="card-standard text-center">
          <p className="type-secondary">
            Ainda não registaste compromissos como renda, internet ou propinas.
          </p>
          <Button className="mt-4" onClick={() => setOpen(true)}>
            Adicionar compromisso
          </Button>
        </section>
      ) : (
        <div className="space-y-3">
          {state.commitments.map((commitment) => {
            const account = accounts.find((a) => a.id === commitment.accountId);
            const due = nextDue(commitment.dueDay);
            return (
              <div key={commitment.id} className="card-compact flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{commitment.name}</p>
                  <p className="type-section mt-1">
                    <Money minor={commitment.amountMinor} options={{ compactDecimals: true }} />
                  </p>
                  <p className="type-meta mt-1">
                    {COMMITMENT_CADENCE_LABELS[commitment.cadence]}
                    {due ? ` · próximo a ${due}` : ""}
                    {account ? ` · ${account.name}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover ${commitment.name}`}
                  onClick={() => removeCommitment(commitment.id)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <NativeSheet open={open} onOpenChange={setOpen} title="Novo compromisso">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="commitment-name">O que é</Label>
            <Input
              id="commitment-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="Renda, internet, propinas…"
            />
          </div>

          <AmountInput
            valueMinor={amountMinor}
            onChange={setAmountMinor}
            currencyCode={setup.currencyCode}
            label="Quanto"
          />

          <div className="space-y-2">
            <Label>Com que frequência</Label>
            <Select value={cadence} onValueChange={(value) => setCadence(value as CommitmentCadence)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COMMITMENT_CADENCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {cadence === "monthly" ? (
            <div className="space-y-2">
              <Label htmlFor="commitment-day">Dia do mês</Label>
              <Input
                id="commitment-day"
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
          ) : null}

          {accounts.length > 0 ? (
            <div className="space-y-2">
              <Label>De que conta costuma sair</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <Button className="w-full" disabled={!name.trim() || amountMinor <= 0} onClick={submit}>
            Guardar compromisso
          </Button>
          <p className="type-meta">
            Um compromisso é esperado, não gasto. Só conta como despesa quando acontecer.
          </p>
        </div>
      </NativeSheet>
    </div>
  );
}
