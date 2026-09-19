# Sistema de avisos e lembretes

Uma notificação **existe dentro da app**. O push é apenas um canal de entrega —
nunca a notificação em si. Se o push falhar, estiver negado ou não for suportado,
o aviso continua a existir no centro de notificações.

## Cadeia

```text
evento de domínio → motor de avisos → registo de notificação
                                   → (opcional) scheduler → Web Push → service worker → dispositivo
```

## Eventos de domínio

`income_recorded`, `expense_recorded`, `commitment_created`, `commitment_due_soon`,
`plan_created`, `plan_review_due`, `program_started`, `program_item_due`,
`action_due`, `review_ready`, `reminder_due`.

Um evento não é uma notificação. O motor avalia preferências, categoria, horas de
silêncio, limite diário, deduplicação (`dedupeKey`, ex. `commitment_due:rent:2026-10`)
e permissões antes de criar alguma coisa.

## Categorias e preferências

`money`, `commitments`, `plans`, `programs`, `personal` (ações, check-ins,
seguimentos do agente), `reminders`, `reviews`, `system`. Cada categoria tem canais
`inApp` / `push` / `email`. Preferências globais: ligar/desligar tudo, frequência,
horas de silêncio (22:30 → 08:00 por omissão), pré-visualização
(detalhada / esconder valores), limite diário.

Lembretes criados explicitamente pela pessoa respeitam a hora que ela marcou; avisos
não urgentes gerados pelo sistema respeitam as horas de silêncio.

## Privacidade

O texto do push é, por omissão, discreto: «O teu lembrete está pronto.»,
«Revisão semanal disponível.», «Compromisso amanhã.». Nunca conteúdo de conversas,
contexto pessoal ou saldos, a não ser que a pessoa escolha pré-visualização detalhada.

## Lembretes (domínio próprio)

`src/lib/reminders/types.ts` + `engine.ts`.

Campos: `id`, `title`, `description?`, `scheduledAt` (instante), `localTime`,
`timezone`, `recurrence?`, `entityType?`/`entityId?`, `status`, `channels`,
`source` (`user` | `agent_confirmed` | `program` | `plan` | `commitment` | `review`),
`snoozedUntil?`, `createdAt`, `updatedAt`, `to` (deep link interno).

Estados: `scheduled`, `completed`, `skipped`, `cancelled`, `expired`. Uma hora que
passou **nunca** se torna «falhado» — fica pendente/atrasado e oferece Concluir,
Adiar, Remarcar, Remover. Adiar (15 min, 1 h, amanhã, personalizado) altera o mesmo
lembrete; nunca cria um duplicado.

Fuso: guardamos o instante e a hora local pretendida. «Todos os dias às 8:00» é hora
local; «daqui a 24 horas» é um instante. Nada é fixado em Maputo nem em UTC.

## Push

- VAPID: a chave pública chega ao cliente por variável de ambiente; **a chave privada
  nunca existe no browser** — vive apenas no servidor de entrega.
- `push_subscriptions`: `id`, `user_id`, `endpoint`, `p256dh`, `auth`, `user_agent`,
  `label`, `status`, `last_success_at`, `last_error`, `UNIQUE(user_id, endpoint)`.
- Vários dispositivos por pessoa. Uma subscrição que devolva 404/410 é marcada como
  inválida e deixa de ser usada.

## Deep links

Cada aviso acionável sabe para onde vai: plano → `/app/plans/:id`, compromisso →
detalhe do compromisso, programa → `/app/development/programs/:id`, ação →
`/app/development/today`, revisão → `/app/review`, lembrete → `/app/reminders`,
seguimento do agente → a conversa exata. O service worker foca a janela existente ou
abre a app. Sem sessão, o destino é guardado, a pessoa entra e só depois é levada lá.

## Scheduler — dependência de servidor

Nada de `setTimeout` para prazos longos. A entrega fiável exige um trabalho agendado
no servidor que leia `reminders` e `notification_events` e envie via Web Push.
**Ainda não está ligado.** Até lá a app mostra o estado real («só dentro da app»)
e nunca afirma que um aviso vai chegar com a app fechada.

## Agente

O agente não tem acesso direto ao push. Prepara → a pessoa confirma → a ação de
domínio cria o lembrete → o motor de avisos decide a entrega.
