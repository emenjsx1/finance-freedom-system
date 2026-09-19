import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

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
  const imageRef = useRef<HTMLInputElement | null>(null);
  const [pendingImages, setPendingImages] = useState<{ mime: string; dataUrl: string; name: string }[]>([]);

  async function addImages(list: FileList | null) {
    if (!list?.length) return;
    const next: { mime: string; dataUrl: string; name: string }[] = [];
    for (const file of Array.from(list).slice(0, 3)) {
      if (!file.type.startsWith("image/")) {
        toast.error("Só consigo ler imagens por agora.");
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem é demasiado grande (máx. 5 MB).");
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read_failed"));
        reader.readAsDataURL(file);
      });
      next.push({ mime: file.type, dataUrl, name: file.name });
    }
    setPendingImages((prev) => [...prev, ...next].slice(0, 3));
    if (imageRef.current) imageRef.current.value = "";
  }


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
        onSubmit={(message) => {
          // PromptInput already resets the form before calling this.
          const text = message.text?.trim() ?? "";
          if (!text && pendingImages.length === 0) return;
          const images = pendingImages.map(({ mime, dataUrl }) => ({ mime, dataUrl }));
          setPendingImages([]);
          void send(conversationId, text, images);
        }}
      >
        <PromptInputTextarea
          ref={textareaRef}
          name="message"
          placeholder={`Pergunta ao ${prefs.agentName}...`}
        />
        {pendingImages.length ? (
          <ul className="flex gap-2 px-3 pt-3">
            {pendingImages.map((image) => (
              <li key={image.dataUrl.slice(-24)} className="relative">
                <img src={image.dataUrl} alt={image.name} className="size-14 rounded-lg object-cover" />
                <button
                  type="button"
                  aria-label={`Remover ${image.name}`}
                  onClick={() => setPendingImages((prev) => prev.filter((i) => i !== image))}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-foreground p-0.5 text-background"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <input
          ref={imageRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => void addImages(e.target.files)}
        />

        <PromptInputFooter className="justify-between">
          <button
            type="button"
            aria-label="Anexar imagem ou recibo"
            onClick={() => imageRef.current?.click()}
            className="flex size-9 items-center justify-center rounded-full border border-border/70 text-muted-foreground"
          >
            <Plus className="size-4" aria-hidden />
          </button>
          <PromptInputSubmit {...(sending ? { status: "submitted" as const } : {})} disabled={sending} />
        </PromptInputFooter>
      </PromptInput>
    </section>
  );
}
