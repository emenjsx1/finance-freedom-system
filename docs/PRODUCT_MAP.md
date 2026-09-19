# PRODUCT_MAP — Finan. Personal OS (frozen for backend implementation)

North star: **"A minha vida, organizada."** Not a bank dashboard, not a budget sheet,
not a chatbot with finance features.

## Conceptual hierarchy

```text
EU
├── Direção
├── Planos            (Goal = measurable target inside a Plan)
├── Dinheiro
│   ├── Contas        (WHERE money is)
│   ├── Movimentos
│   ├── Disponível
│   ├── Reservado     (PURPOSE — a classification, never new money)
│   └── Compromissos  (expected, never deducted)
├── Estratégia        (how new money should be organized)
├── Revisão
└── Agente
```

WHERE (accounts) and PURPOSE (protected / plans / commitments / unassigned) describe the
same money. They never sum together.

## Primary navigation (5 destinations)

`Início · Planos · + · Agente · Eu`

Atividade and Análise are reachable destinations, not tabs.

## Route map

| Route | Purpose | Entry points |
| --- | --- | --- |
| `/app` | Home: greeting, money hero, quick actions, plans, one insight, recent activity | tab bar |
| `/app/money` | Financial structure: total/available/reserved, WHERE, FOR WHAT, commitments | money hero, Eu |
| `/app/money-map` | WHERE vs PURPOSE teaching view | /app/money |
| `/app/accounts`, `/app/accounts/$accountId` | Accounts and account detail | /app/money |
| `/app/activity` | Full movements: search, filters, month navigation, detail | Home preview, /app/money |
| `/app/analytics` | Patterns and categories | /app/money, review, agent |
| `/app/plans`, `/app/plans/$planId` | Plans list (Ativos/Ideias/Concluídos) and plan detail | tab bar, Home, Eu |
| `/app/goals`, `/app/goals/$goalId` | Measurable financial targets tied to purpose wallets | plans, money |
| `/app/commitments` | Expected recurring money | /app/money, + sheet |
| `/app/strategy` | How new money is organized; gallery, rules, simulator | Eu, /app/money |
| `/app/direction` | Agora / A seguir / Mais tarde | Eu |
| `/app/context` | What the system knows, with source and status | Eu |
| `/app/review` | Weekly / monthly calm review | Eu |
| `/app/agent`, `/app/agent/$conversationId` | Conversational interface | tab bar |
| `/app/me` | Personal area + quiet settings below a separator | avatar, tab bar |
| `/app/profile/*` | Personal info, security, access methods | Eu |
| `/app/privacy`, `/app/help`, `/app/notifications` | Data, legal, notification center | Eu, Home bell |
| `/privacy`, `/terms`, `/ai-data`, `/support` | Public legal surfaces | auth, help |

Every route has a purpose, an entry point, back behaviour, and an empty state.

## Home structure (final)

Greeting → Money hero → Quick actions → Current plans → one contextual insight → recent
activity preview (max 3, "Ver todas" → `/app/activity`). Nothing else.

## Central +

A bottom sheet, never a full-screen form: Entrada, Despesa, Transferência, Guardar;
secondary: Criar plano, Adicionar compromisso, Ajustar saldo.

## Terminology (fixed)

Dinheiro · Disponível · Reservado · Plano · Objetivo · Estratégia · Conta · Movimento ·
Compromisso · Direção · Revisão · Agente.

## Product freeze

The architecture above is frozen. Open decisions are listed in `MIGRATION_PLAN.md`.

## Correção — planos, organização e "Eu"

- Separar dinheiro para um plano: "Começar a guardar" (ou "Adicionar dinheiro") abre uma folha com
  quanto e de que conta, seguida de uma revisão. A conta mantém o saldo; muda só o propósito, e a
  reserva guarda a conta de origem.
- Percentagem de progresso (reservado ÷ alvo) é automática. Percentagem de regra só existe na
  Estratégia, para dinheiro futuro, e nunca é obrigatória.
- Organizar dinheiro existente trabalha sempre com valores reais; a percentagem aparece apenas como
  informação secundária.
- Dinheiro: Total, Disponível, Reservado, Livre após compromissos, Onde está, Para quê, Património.
- Património (/app/networth): dinheiro do motor financeiro mais bens e dívidas indicados pela pessoa.
  Dinheiro de negócio nunca entra como património pessoal.
- "Eu" é o único destino pessoal. Perfil e definições vivem dentro de Eu; o avatar abre Eu e a
  navegação lateral deixou de ter uma entrada de perfil concorrente.

## Desenvolvimento pessoal (domínio de primeira classe)

O produto tem dois lados com o mesmo peso: DINHEIRO (determinístico, rígido) e
DESENVOLVIMENTO (flexível, conversacional). O Agente é a mesma interface para os dois.

Quatro camadas: COMPREENDER → DIREÇÃO → AÇÃO → REVISÃO.

Destinos:
- `/app/development` — casa do desenvolvimento: direção, agora, programas, próximas ações, evolução, decisões, revisão.
- `/app/development/today` — Hoje: atrasadas, hoje, a seguir, um dia, feitas, itens de programa.
- `/app/development/programs` e `/app/development/programs/:id` — caminhos temporários (3/7/14/30/90 dias).
- `/app/development/evolution` — linha do tempo de mudanças reais, com opção de ocultar.
- `/app/development/decisions` — decisões explícitas (ativa / rever / mudou).
- `/app/review` — revisão semanal e mensal, agora com factos de desenvolvimento.
- `/app/context` — contexto pessoal aprovado (o que o sistema sabe).
- `/app/me` — centro pessoal, começa por "Meu momento".

Regras de produto:
- Um único domínio Plan (financeiro, não financeiro ou misto). Nunca PersonalPlan separado.
- Plano = resultado. Programa = caminho estruturado. Um plano pode ter programa; um programa pode existir sozinho.
- Ação ≠ Compromisso (dinheiro) e Ação ≠ Lembrete (notificação da ação).
- Prioridade humana: Agora / Importante / Depois.
- Sem pontuações, sem streaks, sem culpa. Uma ação passada da data fica "atrasada", nunca "falhada".
- Nada pessoal é guardado sem a pessoa dizer que sim.

## Modelo de dinheiro (limpeza crítica)

- Conta = onde o dinheiro está (BIM, M-Pesa, e-Mola, Cash). Só contas físicas reais.
- Propósito = para que serve (Turquia, Carro, Protegido, Compromisso). Nunca é conta.
- Estratégia = como organizar dinheiro futuro. Modos: none, manual, suggest, automatic, paused.
- Disponível é calculado, não é conta nem propósito.
- Nova entrada não tem bloco de distribuição. Depois de registada, a pessoa pode
  escolher "Organizar esta entrada".
- Guardar = conta → propósito (Quanto? De onde? Para quê?). Mudar propósito =
  propósito → propósito. Transferência = conta → conta. Três fluxos distintos.
- Detalhe em docs/FINANCIAL_ENGINE.md.
