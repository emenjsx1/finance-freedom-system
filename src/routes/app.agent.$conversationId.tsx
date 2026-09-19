import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { PreparedActionCard } from "@/components/agent/prepared-action-card";
import { Button } from "@/components/ui/button";
import { useAgent } from "@/hooks/use-agent";
import { usePrefs } from "@/hooks/use-prefs";
import { AGENT_SUGGESTIONS } from "@/lib/agent/types";

export const Route = createFileRoute("/app/agent/$conversationId")({
  component: AgentChat,
});

function AgentChat() {
  const { conversationId } = Route.useParams();
  const { state, send, sending, resolveAction, hydrated } = useAgent();
  const { prefs } = usePrefs();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const conversation = state.conversations.find((c) => c.id === conversationId);

  useEffect(() => {
    if (hydrated && !conversation) void navigate({ to: "/app/agent" });
  }, [hydrated, conversation, navigate]);

  // The composer keeps focus through sending and thread switches.
  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversationId, sending]);

  if (!conversation) return null;

  return (
    <section className="flex h-[calc(100dvh-13rem)] flex-col lg:h-[calc(100dvh-10rem)]">
      <Conversation className="flex-1">
        <ConversationContent className="gap-5">
          {conversation.messages.length === 0 ? (
            <ConversationEmptyState
              title={`Fala com o ${prefs.agentName}`}
              description="Pergunta sobre o teu dinheiro. Os valores vêm sempre dos cálculos da aplicação."
            >
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {AGENT_SUGGESTIONS.slice(0, 4).map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="secondary"
                    size="sm"
                    onClick={() => void send(conversationId, suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : null}

          {conversation.messages.map((message) => (
            <Message key={message.id} from={message.role === "user" ? "user" : "assistant"}>
              <MessageContent>
                <MessageResponse>{message.content}</MessageResponse>
                {message.action && message.actionStatus ? (
                  <PreparedActionCard
                    action={message.action}
                    status={message.actionStatus}
                    onConfirm={() => resolveAction(conversationId, message.id, true)}
                    onCancel={() => resolveAction(conversationId, message.id, false)}
                  />
                ) : null}
              </MessageContent>
            </Message>
          ))}

          {sending ? (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>A pensar...</Shimmer>
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        className="mt-4"
        onSubmit={(message, event) => {
          event.preventDefault();
          const text = message.text?.trim();
          if (!text) return;
          event.currentTarget.reset();
          void send(conversationId, text);
        }}
      >
        <PromptInputTextarea
          ref={textareaRef}
          name="message"
          placeholder={`Pergunta ao ${prefs.agentName}...`}
        />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit {...(sending ? { status: "submitted" as const } : {})} disabled={sending} />
        </PromptInputFooter>
      </PromptInput>
    </section>
  );
}
