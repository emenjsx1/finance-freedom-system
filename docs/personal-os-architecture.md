# Personal OS — architecture

Internal notes for the layer added in Phase 12. Money mechanics are unchanged.

## Four separate concepts

| Concept  | Question it answers        | Where it lives                              |
| -------- | -------------------------- | ------------------------------------------- |
| Accounts | Where money exists         | `src/lib/finance` (engine, unchanged)        |
| Plans    | What the person wants      | `src/lib/personal/types.ts` → `Plan`         |
| Strategy | How new money is organised | `Strategy` + `StrategyRule`                  |
| Context  | What the system may know   | `PersonalContextItem`, `DirectionItem`       |

They never merge. A plan holds no money: it points at a purpose wallet
(`Plan.walletId`) and every amount is read from the engine snapshot.

## Deterministic only

`src/lib/personal/engine.ts` holds all Personal OS maths: `goalPace`,
`suggestOrganization`, `percentageConflict`, `simulatePurchase`,
`planConflicts`. No AI, no mutation, no persistence. Scenarios are pure
functions — simulating a purchase never touches reserved money.

## Strategy

Templates in `src/lib/personal/strategies.ts` are starting points, never
ranked and never mandatory. `Strategy.mode` is one of `none` / `suggest` /
`automatic`; `suggest` is the default of every template because the person
decides. Changing or clearing a strategy affects only money that arrives
afterwards; already-organised money is left untouched.

### Legacy migration

Earlier versions organised money with one fixed percentage rule. On first load
`usePersonal` converts the existing wallet percentages into a strategy named
"Minha estratégia anterior" with `mode: "suggest"`, marked with
`legacyMigratedAt`. Wallets, balances and history are untouched, and the
person can edit, disable or delete the strategy.

## Agent contract

`AgentDeps.personal` carries the Personal OS state. Three new read tools in
`src/lib/agent/context-builder.ts`:

- `get_plans` — plan name, type, status, priority and engine-derived amounts.
- `get_direction` — the person's own words.
- `get_strategy` — the intention, flagged as intention.

Every tool returns `{ acesso: "nao_autorizado" }` when the matching permission
in `PersonalState.permissions` is off. The Agent still never calculates a
balance: plan progress comes from `goalPace` over the engine snapshot.

## Persistence

Device-local at `pfos.personal.v1` (`src/lib/storage/personal-store.ts`). The
shape mirrors the future tables: `plans`, `plan_milestones`, `strategies`,
`strategy_rules`, `personal_context`, `direction_items`, `commitments`, each
owned by `user_id` with RLS, exactly like the ledger migration planned in
Phase 10 Part B.

## Screens

- `/app/me` — the person's space: direction, plans, strategy, context, review.
- `/app/plans`, `/app/plans/$planId` — plans and plan detail.
- `/app/strategy` — strategy gallery, rule editor, inflow simulation.
- `/app/direction` — headline plus now / next / later notes.
- `/app/context` — everything stored about the person, with permissions.
- `/app/review` — calm review: no scores, no streaks, no judgement.
