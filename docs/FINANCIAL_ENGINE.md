# FINANCIAL ENGINE — Conta ≠ Propósito ≠ Estratégia

The engine (`src/lib/finance/engine.ts`) is the only place money math happens.
The UI and the Agent read from it; they never compute balances themselves.

## Three separate concepts

| Concept  | Question                          | Examples                                   |
| -------- | --------------------------------- | ------------------------------------------ |
| Account  | Where is the money physically?    | BIM, M-Pesa, e-Mola, Moza, Cash, bank       |
| Purpose  | What is this money for?           | Turquia, Carro, Protegido, Compromisso      |
| Strategy | How should future money organise? | 20% → Turquia, 10% → Protegido, rest free   |

A Purpose is never an Account. A Strategy never creates an Account: a rule
"20% → Turquia" produces a reservation against a real source account.

## Entities

- **Account** — physical location, opening balance plus ledger movements.
- **Transaction** — `income | expense | transfer | reservation | release | reallocation | adjustment`.
- **Transfer** — Account A → Account B. Changes physical balances only.
- **Reservation** (`reservation`) — Account → Purpose classification. Physical
  balance unchanged; available goes down; the purpose goes up.
- **Release** (`release`) — Purpose → available, in the same account.
- **Purpose reassignment** (`reallocation`) — Purpose A → Purpose B. Accounts
  never change. This is never called "transferência".
- **Plan** — one plan has at most one purpose (`AllocationRuleItem.planId`).
- **Commitment** — money expected to be paid; expected, not deducted.
- **Strategy** — rules for future money. Modes: `none`, `manual`, `suggest`,
  `automatic`, `paused`. No strategy at all is `strategy: null`.

## Derived values

- `accountBalances[accountId]` — physical balance.
- `accountReserved[accountId]` — sum of purposes held in that account.
- `accountAvailable[accountId]` — `max(0, balance − reserved)`.
- `bucketBalances[purposeId]` — total reserved for a purpose.
- `purposeByAccount[purposeId][accountId]` — the purpose × account matrix, so
  "50k of Turquia is in BIM" is answerable. Attribution is proportional and is
  detached on release, expense and reassignment.
- **AVAILABLE** is calculated, never an account and never a purpose.

## Invariants

1. `TOTAL = AVAILABLE + RESERVED`.
2. Reserved is never negative.
3. Reservations, releases, reassignments, transfers, plans and strategies never
   create or destroy money.
4. Future income is not current money.
5. Classifying money by purpose never changes a physical balance.

Covered by `src/lib/finance/money-model.test.ts`.

## Legacy

The fixed 40/20/20/10/10 wallets (Construção, Objetivos, Vida, Família, Livre)
are gone. `DEFAULT_RULE_ITEMS` is empty; purposes exist only when the person
creates one, or a plan/protection/commitment creates one.
`src/lib/finance/money-migration.ts` drops untouched legacy defaults, keeps the
ones that hold real history, and links plan purposes by `planId`.
