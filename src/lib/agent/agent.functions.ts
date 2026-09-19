/**
 * Agent service (server side).
 *
 * The provider is isolated behind one adapter so the model can change without
 * touching the app. The AI key never leaves the server. The model receives
 * already-calculated facts: it explains them and may PREPARE an action, which
 * only the user can confirm and only the financial engine can execute.
 */
import { createOpenAI } from "@ai-sdk/openai";
import { createServerFn } from "@tanstack/react-start";
import { Output, streamText } from "ai";
import { z } from "zod";

const ActionSchema = z.object({
  type: z.enum(["expense", "income", "transfer", "reallocation", "goal_suggestion"]),
  amountMinor: z.number().int().nonnegative(),
  categoryId: z.string().nullable(),
  accountId: z.string().nullable(),
  bucketId: z.string().nullable(),
  fromAccountId: z.string().nullable(),
  toAccountId: z.string().nullable(),
  fromBucketId: z.string().nullable(),
  toBucketId: z.string().nullable(),
  merchant: z.string().nullable(),
  summary: z.string(),
});

const ReplySchema = z.object({
  reply: z.string(),
  action: ActionSchema.nullable(),
  memorySuggestion: z
    .object({
      category: z.enum(["goals", "life", "work", "family", "preferences", "plans", "philosophy", "other"]),
      content: z.string(),
    })
    .nullable(),
});

const RequestSchema = z.object({
  question: z.string().min(1).max(2000),
  agentName: z.string().max(40),
  style: z.enum(["concise", "balanced", "detailed"]),
  /** Deterministic facts calculated by the app's financial engine. */
  context: z.unknown(),
  history: z
    .array(z.object({ role: z.enum(["user", "agent"]), content: z.string().max(4000) }))
    .max(10),
});

const STYLE_HINT: Record<string, string> = {
  concise: "Responde em 1 a 3 frases curtas.",
  balanced: "Responde em 2 a 5 frases.",
  detailed: "Podes explicar com mais detalhe, até 8 frases, usando listas curtas quando ajudar.",
};

function systemPrompt(agentName: string, style: string) {
  return [
    `És "${agentName}", o assistente pessoal de organização financeira e de vida dentro da aplicação Personal Finance OS.`,
    "Escreves sempre em português de Portugal, num tom calmo, direto, analítico e sem julgamentos.",
    "REGRA ABSOLUTA: nunca calculas nem inventas saldos. Todos os valores que usares têm de vir literalmente do objeto `factos` que recebes. Se um valor não estiver nos factos, diz que ainda não tens esse dado.",
    "Não inventes causas para os números. Descreve factos.",
    "Não dás conselhos de investimento nem te apresentas como banco ou profissional financeiro licenciado; ajudas a organizar e compreender.",
    "Evita emojis, entusiasmo artificial, sermões e repetir avisos em todas as mensagens.",
    "Se o utilizador pedir para registar, mover ou redistribuir dinheiro, preenche `action` com os ids corretos vindos de `referencias` e explica em `summary`. Nunca digas que a ação já foi feita — ela só existe depois de o utilizador confirmar.",
    "Preenche `memorySuggestion` apenas quando o utilizador partilhar algo pessoal e duradouro que valha a pena recordar. Caso contrário, deixa a null.",
    "Para cenários hipotéticos, começa a resposta com 'Simulação:'.",
    STYLE_HINT[style] ?? STYLE_HINT['balanced'],
  ].join("\n");
}

export const askAgent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RequestSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) return { ok: false as const, error: "unavailable" as const };

    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const conversation = data.history
      .map((m) => `${m.role === "user" ? "Utilizador" : "Agente"}: ${m.content}`)
      .join("\n");

    const prompt = [
      conversation ? `Conversa anterior:\n${conversation}\n` : "",
      `Factos calculados pela aplicação (única fonte de verdade financeira):\n${JSON.stringify(data.context)}`,
      `\nPergunta do utilizador: ${data.question}`,
    ].join("\n");

    try {
      const result = streamText({
        model: lovable.responses("openai/gpt-6-astra"),
        system: systemPrompt(data.agentName || "Agente", data.style),
        prompt,
        output: Output.object({ schema: ReplySchema }),
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            store: false,
          },
        },
      });

      const output = await result.output;
      return { ok: true as const, ...output };
    } catch (error) {
      // The financial app must keep working when the model is unavailable.
      console.error("agent request failed", error instanceof Error ? error.message : error);
      return { ok: false as const, error: "unavailable" as const };
    }
  });
