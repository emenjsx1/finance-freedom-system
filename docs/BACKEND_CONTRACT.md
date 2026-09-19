# BACKEND_CONTRACT — specification for the production backend phase

Everything below is currently device-local (`pfos.*` keys in localStorage) except
`profiles`, `attachments`, and the storage buckets. This document is the source
specification for the next phase. No backend work is implemented yet.

## Principles

- The deterministic financial engine stays the single source of truth for money.
- Every money mutation is atomic and idempotent (client-supplied `request_id`).
- RLS on every table: a row is readable and writable only by its owner.
- Reserved money is a classification. It must never change net worth.
- Invariant enforced server-side: `total = available + reserved`, `reserved >= 0`.

## Domains

| Domain | Entity | Key fields | Notes |
| --- | --- | --- | --- |
| Identity | `profiles` | preferred_name, full_name, avatar_url, language, base_currency, timezone | exists |
| Personal | `personal_context` | content, category, source, state, reviewed_at | source: profile / user / agent / plan / system |
| Personal | `direction_items` | content, horizon (now/next/later), plan_id? | |
| Plans | `plans` | name, why, kind, status, priority, wallet_id?, target_date, cover | status: idea/active/paused/completed/archived |
| Plans | `goals` | plan_id, target_minor, target_date, method | measurable target inside a plan |
| Plans | `plan_milestones` | plan_id, title, done_at | |
| Money | `accounts` | name, type, currency, starting_balance_minor, archived, order | WHERE only |
| Money | `transactions` | kind, money_type, amount_minor, occurred_at, account_id, allocations, tags, notes | append-only history |
| Money | `reservations` | wallet/purpose, amount_minor, source_tx | classification only |
| Money | `commitments` | name, amount_minor, cadence, due_day, account_id, active | expected, never deducted |
| Money | `balance_adjustments` | account_id, delta_minor, reason | auditable reconciliation |
| Strategy | `strategies` | name, mode (suggest/auto/off), active | |
| Strategy | `strategy_rules` | kind (percentage/fixed/priority/surplus/manual), target, value | |
| Review | `reviews` | period, generated_at, snapshot | derived, cacheable |
| Agent | `agent_threads`, `agent_messages` | role, parts, created_at | UIMessage-compatible |
| Agent | `agent_prepared_actions` | payload, status (prepared/confirmed/discarded) | confirmation required |
| Files | `attachments` | storage_path, mime, size, transaction_id | exists, private bucket |
| System | `notifications` | kind, payload, read_at | |
| System | `idempotency_keys` | request_id, result | atomic mutations |

## Server operations required

- `recordTransaction`, `recordTransfer`, `recordReservation`, `releaseReservation`,
  `adjustAccountBalance` — atomic, idempotent, invariant-checked.
- `getFinancialSnapshot` — the only balance source for every client surface.
- `listActivity` — server-paginated, searchable, filterable.
- `getAnalyticsSummary`, `getReview(period)` — derived, read-only.
- Agent read tools and simulation tools (see `AGENT_CONTRACT.md`).

## Non-goals for the backend phase

Monetization, subscriptions, App Store packaging, multi-user sharing.

## Organisation ("Ajuda-me a organizar")

Organising existing money is a classification change, never a transfer. The backend
must guarantee that account balances are untouched by any organisation.

| Entity | Key fields | Notes |
| --- | --- | --- |
| `organization_drafts` | answers (protection, plans, commitments, income, ownership, flexibility), constraints, status, updated_at | resumable; a person may leave and come back |
| `organization_scenarios` | draft_id, variant, lines[{kind,label,amount_minor,plan_id}], notes | generated deterministically server-side from the same engine the UI uses |
| `organization_funding_map` | scenario_id, line_key, account_id, amount_minor | a reading of where the reserved money physically sits |
| `reservations` | purpose, plan_id?, commitment_id?, amount_minor, source_account_id?, created_at, released_at | every reservation tracks its source |
| `organization_applications` | draft_id, scenario_id, request_id, applied_at, resulting_totals | idempotent; one row per applied organisation |
| `organization_history` | application_id, event (applied/adjusted/released/moved/undone), payload, actor (user/agent) | auditable |

Server operations:
- `simulateOrganization(draft)` — deterministic, read-only, returns 2–3 scenarios.
- `applyOrganization({ scenarioId, requestId })` — revalidates ownership, live balances,
  existing reservations, eligible available money, plan existence, currency and version;
  then creates/updates reservations atomically.
- `releaseReservation`, `moveReservationPurpose` — classification only.
- `convertOrganizationToStrategy({ applicationId })` — only on explicit confirmation.
  Accepting one organisation never creates a strategy by itself.

Invariants revalidated server-side on every apply: `total = available + reserved`,
`reserved >= 0`, allocations never exceed eligible money, business money excluded unless
explicitly classified as personal, and future income never counted as current money.

## Desenvolvimento pessoal (contrato de backend)

Tabelas: `programs`, `program_items`, `actions`, `reminders`, `reviews`,
`direction_items`, `priorities`, `decisions`, `personal_context`,
`evolution_events`, `reflections`, `notification_preferences`, `widget_snapshots`.

- `programs`: id, user_id, title, description, purpose, status (draft|active|paused|completed|cancelled), start_date, end_date, duration_days, created_source, linked_plan_id, created_at, updated_at, completed_at.
- `program_items`: id, program_id, type (action|reflection|checkin|review|milestone), title, description, day, scheduled_date, scheduled_time, status, order, reminder, linked_action_id.
- `actions`: id, user_id, title, description, status (pending|done|skipped), priority (now|important|later), scheduled_date, scheduled_time, due_date, linked_plan_id, linked_program_id, reminder, created_source, completed_at.
- `decisions`: statement, reason, date, status (active|revisit|changed), linked_plan_id, linked_direction_id, source.
- `personal_context`: content, category, source, state (active|needs_review|archived), created_at, updated_at, reviewed_at.
- `evolution_events`: kind, title, at, hidden.
- `reviews`: type (weekly|monthly|program|plan), period_start, period_end, facts (jsonb), user_notes, approved_changes.

Regras:
- Todas as escritas do Agente passam por ações de domínio autorizadas; o Agente nunca recebe acesso livre à base de dados.
- Agendamento com timezone do utilizador; viajar não pode corromper horários.
- Passar a hora nunca muda o estado para "falhada": fica pendente/atrasada com Completar, Remarcar, Ignorar, Remover.
- RLS por user_id em todas as tabelas, com GRANT explícito para authenticated e service_role.
- Nada de dados semeados: nenhuma vida, prioridade ou programa de exemplo é criado pelo sistema.
