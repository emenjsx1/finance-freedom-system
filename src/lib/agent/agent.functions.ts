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

/**
 * Personal domain proposals. The Agent may only PREPARE these; the person
 * confirms, and the app writes. Nothing personal is ever saved silently.
 */
const PersonalActionSchema = z.object({
  type: z.enum([
    "create_program",
    "create_action",
    "update_direction",
    "record_decision",
    "save_context",
    "create_reminder",
  ]),
  summary: z.string(),
  title: z.string().nullable(),
  purpose: z.string().nullable(),
  durationDays: z.number().int().positive().max(365).nullable(),
  items: z
    .array(
      z.object({
        type: z.enum(["action", "reflection", "checkin", "review", "milestone"]),
        title: z.string(),
        day: z.number().int().positive().max(365),
      }),
    )
    .max(40)
    .nullable(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  priority: z.enum(["now", "important", "later"]).nullable(),
  horizon: z.enum(["now", "year", "later", "exploring"]).nullable(),
  content: z.string().nullable(),
  reason: z.string().nullable(),
  category: z
    .enum(["goals", "life", "work", "family", "preferences", "plans", "philosophy", "other"])
    .nullable(),
});

const ReplySchema = z.object({
  reply: z.string(),
  action: ActionSchema.nullable(),
  personalAction: PersonalActionSchema.nullable(),
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
  /** "conversar" is the deep conversation mode: listen first, do not push actions. */
  mode: z.enum(["normal", "conversar"]).default("normal"),
  /** Deterministic facts calculated by the app's financial engine. */
  context: z.unknown(),
  history: z
    .array(z.object({ role: z.enum(["user", "agent"]), content: z.string().max(4000) }))
    .max(10),
  /** Receipts or screenshots the person attached to this message. */
  images: z
    .array(
      z.object({
        mime: z.string().max(80),
        /** data: URL, read on the device and never stored by the agent. */
        dataUrl: z.string().max(8_000_000),
      }),
    )
    .max(3)
    .optional(),
});

const STYLE_HINT: Record<string, string> = {
  concise: "Responde em 1 a 3 frases curtas.",
  balanced: "Responde em 2 a 5 frases.",
  detailed: "Podes explicar com mais detalhe, até 8 frases, usando listas curtas quando ajudar.",
};

const CONVERSATION_RULES = [
  "MODO CONVERSAR: a pessoa quer pensar em voz alta. Ouve primeiro. Faz UMA pergunta de cada vez, escolhida pelo que ela disse — nunca um questionário numerado.",
  "Trabalha só com o que a pessoa disse explicitamente. Não diagnosticas nada (sobretudo nada de saúde mental), não atribuis traços psicológicos, não afirmas conhecê-la melhor do que ela.",
  "Podes separar problema de sintoma, apontar contradições com respeito, clarificar trocas e ajudar a organizar o pensamento.",
  "Não forces um plano, um programa ou uma ação no fim. Às vezes a conversa útil é o resultado.",
  "Quando houver material suficiente, podes perguntar: \"Queres que eu organize o que saiu desta conversa?\" e só então apresentar um resumo com O QUE PARECE IMPORTAR AGORA, QUESTÕES EM ABERTO e POSSÍVEIS PRÓXIMOS PASSOS — como rascunho editável.",
  "Nada é guardado sem a pessoa dizer que sim. `personalAction` é apenas uma proposta.",
].join("\n");

function systemPrompt(agentName: string, style: string, mode: "normal" | "conversar") {
  return [
    `És "${agentName}", o assistente pessoal de organização financeira e de vida dentro da aplicação Personal Finance OS.`,
    "Escreves sempre em português de Portugal, num tom calmo, direto, analítico e sem julgamentos.",
    "REGRA ABSOLUTA: nunca calculas nem inventas SALDOS, TOTAIS ou HISTÓRICO. Esses valores têm de vir literalmente do objeto `factos`. Se um deles não estiver nos factos, diz que ainda não tens esse dado.",
    "Montantes, datas e descrições indicados pelo próprio utilizador são válidos e devem ser usados tal como ele os disse — sobretudo ao preparar uma ação. Não peças confirmação de um valor que o utilizador já escreveu.",
    "Não inventes causas para os números. Descreve factos.",
    "Não dás conselhos de investimento nem te apresentas como banco ou profissional financeiro licenciado; ajudas a organizar e compreender.",
    "Evita emojis, entusiasmo artificial, sermões e repetir avisos em todas as mensagens.",
    "Sempre que o utilizador descrever um movimento com um montante (gastei, recebi, transfere, coloca X de A para B), TENS de preencher `action` com os ids corretos vindos de `referencias`. Nunca recuses por o montante não estar nos factos: o montante vem do utilizador. Saldo insuficiente também não impede preparar — menciona-o apenas no texto.",
    "`amountMinor` é em unidades mínimas: multiplica o valor por 100 (1.500 MZN = 150000).",
    "Nunca digas que a ação já foi feita — ela só existe depois de o utilizador confirmar.",
    "Preenche `memorySuggestion` apenas quando o utilizador partilhar algo pessoal e duradouro que valha a pena recordar. Caso contrário, deixa a null.",
    "Separar dinheiro para um plano é uma `reallocation` com o `bucketId` do plano e, quando o utilizador disser de que conta vem, o `accountId` dessa conta. Separar não muda o saldo da conta: muda só o propósito do dinheiro. Nunca peças uma percentagem para alimentar um plano — percentagens só existem em regras para dinheiro futuro.",
    "Para cenários hipotéticos, começa a resposta com 'Simulação:'.",
    "Quando o utilizador não souber como organizar o dinheiro, usa APENAS as opções de `factos.simulate_organization`: apresenta-as como caminhos diferentes, explica as consequências, nunca digas que uma é a melhor e nunca inventes valores. Para aplicar, encaminha para o ecrã \"Ajuda-me a organizar\" — organizar nunca acontece dentro da conversa sem confirmação.",
    "Se receberes uma imagem (recibo, fatura, captura de ecrã), lê o que conseguires e apresenta os valores como SUGESTÃO a confirmar. Preenche `action` com o total e o comerciante que leste, e diz claramente que o utilizador deve confirmar antes de registares.",
    "Podes propor uma ação pessoal em `personalAction`: criar um programa (caminho curto com dias), criar uma ação, acrescentar algo à direção, registar uma decisão ou guardar contexto pessoal. Preenche só os campos que fazem sentido para o tipo e deixa os outros a null. Nunca digas que já criaste alguma coisa: a pessoa confirma primeiro.",
    "Podes propor um lembrete em `personalAction` com type \"create_reminder\": preenche `title` com o que lembrar, `date` (AAAA-MM-DD) e `time` (HH:MM). Se a pessoa não disser a hora ou o dia, PERGUNTA — nunca inventes uma hora em silêncio. Um lembrete não é uma ação nem um compromisso financeiro.",
    "Um programa é um caminho temporário com dias numerados (dia 1, dia 2, ...) e no máximo 3, 7, 14, 30 ou 90 dias. Não gamificas, não falas em sequências nem em falhar.",
    "Se uma ação ficar por fazer, nunca dizes que a pessoa falhou; perguntas se quer remarcar, ajustar ou remover.",
    "Nunca inventes história pessoal. Se não existir contexto guardado sobre algo, diz que não tens essa informação.",
    mode === "conversar" ? CONVERSATION_RULES : "",
    STYLE_HINT[style] ?? STYLE_HINT['balanced'],
  ]
    .filter(Boolean)
    .join("\n");
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
      const images = data.images ?? [];
      const messages = [
        {
          role: "user" as const,
          content: [
            { type: "text" as const, text: prompt },
            ...images.map((image) => ({ type: "image" as const, image: image.dataUrl })),
          ],
        },
      ];

      const result = streamText({
        model: lovable.responses("openai/gpt-6-astra"),
        system: systemPrompt(data.agentName || "Agente", data.style, data.mode),
        ...(images.length ? { messages } : { prompt }),
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
