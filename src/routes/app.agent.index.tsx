import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useAgent } from "@/hooks/use-agent";
import { usePrefs } from "@/hooks/use-prefs";
import { AGENT_SUGGESTIONS } from "@/lib/agent/types";

export const Route = createFileRoute("/app/agent/")({
  component: AgentIndex,
});

function AgentIndex() {
  const { createConversation, send } = useAgent();
  const { prefs } = usePrefs();
  const navigate = useNavigate();

  async function startWith(question?: string) {
    const id = createConversation();
    await navigate({ to: "/app/agent/$conversationId", params: { conversationId: id } });
    if (question) void send(id, question);
  }

  return (
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
  );
}
