# MIGRATION_PLAN

No real data is ever destroyed. Every migration below is additive and reversible.

## 1. Fixed wallets → Strategy + purposes

Old model: fixed allocation rule items (Construção, Objetivos, Vida, Família, Livre) with
fixed percentages applied automatically to income.

- Already done (device-local): the old rule set is converted into a strategy named
  "Minha estratégia anterior" in suggest-only mode, editable and removable.
- Backend phase: migrate each rule item into `strategy_rules` (kind `percentage`) and keep
  the balances as purpose classifications. Balances move unchanged; no money is created.
- The word "Carteiras" is no longer a primary concept. Purpose wallets remain internally as
  the classification of reserved money.

## 2. Goals → Plans + Goals

Old model: standalone goals with a target amount.

- Backend phase: each goal becomes a Plan (`kind: purchase/travel/…`) with one Goal row
  holding the target amount and date. Existing contributions keep their transaction history.
- UI says "Plano". The Goal distinction stays internal.

## 3. Device-local state → Postgres

Keys to migrate on first authenticated sync: `pfos.setup.v1`, `pfos.ledger.v1`,
`pfos.personal.v1`, `pfos.prefs.v1`, `pfos.agent.v1`, `pfos.notifications.v1`.

Rules: upload as-is, never overwrite a newer server row, keep the local copy until the
server confirms, and record a one-time migration marker per device.

## 4. Invalid legacy states

Negative reserved balances from earlier builds are corrected through the auditable
reconciliation path (a recorded adjustment with a reason), never by editing history.

## 5. Mock and placeholder data

No fake balances, transactions, accounts, analytics, notifications or agent facts ship in
the product. Illustrative figures exist only in documentation.

## Open decisions (unresolved at freeze)

- Whether commitments should be able to auto-create a transaction on the due date, or stay
  confirmation-only.
- Whether goals ever become visible as a separate concept in the UI, or stay internal.
- Multi-currency conversion source and refresh cadence for accounts outside the base currency.
- Retention window for agent threads.

## Desenvolvimento pessoal — migração

- `personal.development` é criado vazio em dispositivos existentes. Nada é reescrito nem apagado.
- Planos, direção, contexto e conversas existentes mantêm-se como estão; a direção ganhou o horizonte "Ainda estou a descobrir" sem alterar itens já guardados.
- A evolução só regista acontecimentos a partir de agora — não é reconstruída retroativamente, para não inventar história.

Decisões por resolver: nomes finais das rotas no backend, retenção de conversas do Agente,
se os check-ins de programa geram notificação push por defeito, e detalhe dos snapshots de widget.

## Limpeza do modelo de dinheiro

`src/lib/finance/money-migration.ts` corre uma vez por dispositivo
(`setup.moneyModelMigratedAt`):

1. Remove os cinco propósitos por defeito (r1–r5) quando nunca foram tocados.
2. Mantém os que têm histórico real, mas sem percentagem e sem estatuto de sistema.
3. Liga cada plano ao propósito com o mesmo nome (`planId`), evitando "Turquia" duplicada.
4. Nenhum movimento real é apagado.
