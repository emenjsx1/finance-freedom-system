import { Button } from "@/components/ui/button";
import { PROGRAM_ITEM_TYPE_LABELS } from "@/lib/development/types";
import type { PreparedPersonalAction } from "@/lib/agent/types";

const TITLES: Record<PreparedPersonalAction["type"], string> = {
  create_program: "Programa proposto",
  create_action: "Ação proposta",
  update_direction: "Juntar à tua direção",
  record_decision: "Guardar esta decisão",
  save_context: "Guardar isto sobre ti",
  create_reminder: "Lembrete proposto",
};

/**
 * A personal proposal. Nothing is written until the person says yes — the same
 * rule as money, but calmer: no amounts are involved.
 */
export function PreparedPersonalCard({
  action,
  status,
  onConfirm,
  onCancel,
}: {
  action: PreparedPersonalAction;
  status: "pending" | "confirmed" | "cancelled";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-border/70 bg-surface p-4">
      <p className="type-meta">{TITLES[action.type]}</p>
      <p className="mt-1 text-sm font-medium">{action.title ?? action.content ?? action.summary}</p>
      {action.purpose ? <p className="type-secondary mt-1">{action.purpose}</p> : null}
      {action.reason ? <p className="type-secondary mt-1">{action.reason}</p> : null}

      {action.type === "create_program" ? (
        <p className="type-meta mt-2">{action.durationDays ?? 7} dias</p>
      ) : null}
      {action.date ? (
        <p className="type-meta mt-1">
          {action.date}
          {action.time ? ` · ${action.time}` : ""}
        </p>
      ) : null}

      {action.items?.length ? (
        <ul className="mt-3 space-y-1.5">
          {action.items.map((item, index) => (
            <li key={`${item.title}-${index}`} className="text-sm">
              <span className="type-meta">
                Dia {item.day} · {PROGRAM_ITEM_TYPE_LABELS[item.type]}
              </span>
              <span className="block">{item.title}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {status === "pending" ? (
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={onConfirm}>
            Confirmar
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Agora não
          </Button>
        </div>
      ) : (
        <p className="type-meta mt-3">
          {status === "confirmed" ? "Criado." : "Não foi guardado."}
        </p>
      )}
    </div>
  );
}
