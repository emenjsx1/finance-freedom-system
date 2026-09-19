import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { MessageSquare, Plus, Search, Settings2, Trash2, Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAgent } from "@/hooks/use-agent";
import { usePrefs } from "@/hooks/use-prefs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/agent")({
  head: () => ({
    meta: [
      { title: "Agente — Finance OS" },
      {
        name: "description",
        content: "O teu assistente pessoal: compreende o teu dinheiro, organiza objetivos e prepara ações.",
      },
      { property: "og:title", content: "Agente — Finance OS" },
      { property: "og:description", content: "O teu assistente pessoal de organização financeira." },
    ],
  }),
  component: AgentLayout,
});

function AgentLayout() {
  const { state, createConversation, deleteConversation, renameConversation } = useAgent();
  const { prefs } = usePrefs();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const conversations = state.conversations.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  function startNew() {
    const id = createConversation();
    void navigate({ to: "/app/agent/$conversationId", params: { conversationId: id } });
  }

  return (
    <div className="lg:grid lg:grid-cols-[17rem_1fr] lg:gap-8">
      <aside className="mb-6 lg:mb-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="type-title">{prefs.agentName}</h1>
            <p className="type-caption">O teu assistente pessoal</p>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon-sm" aria-label="Definições do agente">
              <Link to="/app/agent-settings">
                <Settings2 />
              </Link>
            </Button>
            <Button size="icon-sm" aria-label="Nova conversa" onClick={startNew}>
              <Plus />
            </Button>
          </div>
        </div>

        {state.conversations.length > 0 ? (
          <>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Procurar conversas"
                aria-label="Procurar conversas"
                className="pl-9"
              />
            </div>

            <ul className="mt-3 space-y-1">
              {conversations.map((conversation) => {
                const active = pathname.endsWith(conversation.id);
                return (
                  <li key={conversation.id} className="flex items-center gap-1">
                    {renaming === conversation.id ? (
                      <form
                        className="flex flex-1 gap-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          renameConversation(conversation.id, draftTitle.trim() || conversation.title);
                          setRenaming(null);
                        }}
                      >
                        <Input
                          autoFocus
                          value={draftTitle}
                          aria-label="Nome da conversa"
                          onChange={(e) => setDraftTitle(e.target.value)}
                        />
                        <Button type="submit" size="sm">
                          Guardar
                        </Button>
                      </form>
                    ) : (
                      <>
                        <Link
                          to="/app/agent/$conversationId"
                          params={{ conversationId: conversation.id }}
                          className={cn(
                            "min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-sm transition-colors",
                            active ? "bg-elevated font-medium" : "text-muted-foreground hover:bg-elevated",
                          )}
                        >
                          {conversation.title}
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Renomear ${conversation.title}`}
                          onClick={() => {
                            setRenaming(conversation.id);
                            setDraftTitle(conversation.title);
                          }}
                        >
                          <Pencil />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${conversation.title}`}>
                              <Trash2 />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar esta conversa?</AlertDialogTitle>
                              <AlertDialogDescription>
                                As tuas transações não são afetadas. Apenas a conversa é removida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  deleteConversation(conversation.id);
                                  if (active) void navigate({ to: "/app/agent" });
                                }}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </li>
                );
              })}
              {conversations.length === 0 ? (
                <li className="type-caption px-3 py-2">Nenhuma conversa encontrada.</li>
              ) : null}
            </ul>
          </>
        ) : (
          <p className="type-caption mt-4 flex items-center gap-2">
            <MessageSquare className="size-4" aria-hidden />
            Ainda não tens conversas.
          </p>
        )}
      </aside>

      <Outlet />
    </div>
  );
}
