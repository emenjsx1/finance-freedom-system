import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useAgent } from "@/hooks/use-agent";
import { usePrefs } from "@/hooks/use-prefs";
import { AGENT_SUGGESTIONS } from "@/lib/agent/types";
import { useNotifications } from "@/hooks/use-notifications";
import { relativeTime } from "@/lib/notifications/time";

export const Route = createFileRoute("/app/agent/")({
  component: AgentIndex,
});

function AgentIndex() {
  const { createConversation, send } = useAgent();
  const { prefs } = usePrefs();
  const navigate = useNavigate();
  const { visible, markRead } = useNotifications();

  // Proactive messages live in their own inbox instead of polluting the chat.
  const updates = visible
    .filter((n) => n.category === "agent" || n.category === "reports")
    .slice(0, 4);

  async function startWith(question?: string) {
    const id = createConversation();
    await navigate({ to: "/app/agent/$conversationId", params: { conversationId: id } });
    if (question) void send(id, question);
  }

  return (
    <div className="space-y-5">
      {updates.length ? (
        <section className="card-standard">
          <h2 className="type-section">Atualizações</h2>
          <ul className="mt-3 space-y-3">
            {updates.map((update) => (
              <li key={update.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium leading-snug">{update.title}</p>
                  {update.body ? <p className="type-meta mt-0.5">{update.body}</p> : null}
                  <p className="type-meta mt-0.5">{relativeTime(update.createdAt)}</p>
                </div>
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => {
                    markRead(update.id);
                    void startWith(
                      update.payload.kind === "weekly_review"
                        ? "Explica o meu resumo semanal com os números da app."
                        : update.payload.kind === "monthly_review"
                          ? "Explica o fecho do mês com os números da app."
                          : `Explica isto: ${update.title}`,
                    );
                  }}
                >
                  Ver
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

    <section className="card-standard">
      <h2 className="type-title">Pergunta ao teu dinheiro</h2>
      <p className="type-secondary mt-2">
        O {prefs.agentName} usa os valores calculados pela aplicação. Não inventa saldos e nunca regista
        nada sem a tua confirmação.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {AGENT_SUGGESTIONS.map((suggestion) => (
          <Button key={suggestion} variant="secondary" size="sm" onClick={() => void startWith(suggestion)}>
            {suggestion}
          </Button>
        ))}
      </div>
      <Button className="mt-6" onClick={() => void startWith()}>
        Nova conversa
      </Button>
    </section>
    </div>
  );
}
