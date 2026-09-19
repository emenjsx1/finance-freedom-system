# AGENT_CONTRACT

The Agent is the conversational interface to the Personal OS. It orchestrates and
explains. It is never the source of truth.

| Truth | Owner |
| --- | --- |
| Money | Financial engine |
| Plans and goals | Plan domain |
| Strategy | Strategy domain |
| Personal context | Context domain |

## Available context

Financial snapshot (total, available, reserved, protected), accounts, recent activity,
active plans and pace, commitments, strategy and its rules, direction items, and only
the personal context the person has approved per area.

## Read tools (server-side, deterministic results)

`getFinancialSummary`, `getAvailableMoney`, `getAccounts`, `getRecentTransactions`,
`searchTransactions`, `getSpendingByCategory`, `getIncomeSummary`, `getGoal`, `getGoals`,
`getPlans`, `getCommitments`, `getUpcomingCommitments`, `getStrategy`, `getDirection`,
`getAnalyticsSummary`, `getPersonalContext`.

## Simulation tools (what-if; never write)

`simulateRecurringCost`, `simulateOneOffSpend`, `simulateIncomeChange`,
`simulateStrategyChange`, `simulatePlanContribution`.

Output is a scenario card: what changes, what does not, which plans are affected.
The Agent never answers "yes, do it" — it shows the consequence and the person decides.

## Prepared actions (PREPARE → CONFIRM → EXECUTE)

`prepareIncome`, `prepareExpense`, `prepareTransfer`, `prepareReservation`,
`prepareGoalContribution`, `preparePlan`, `prepareCommitment`.

The Agent never mutates. A prepared action renders as a confirmation card with the exact
values; only an explicit confirmation reaches the engine. Amounts always come from the
engine or from what the person typed, never from model arithmetic.

## Memory rules

Conversation context is not memory. Persistent personal context is only written after an
explicit "Guardar" from the person, always carries a source, and is visible, editable and
deletable in `/app/context`.

## Attachments

Camera, photo library and file picker. Flow is receipt → analysis → structured draft →
confirmation. Never receipt → automatic expense. Files live in the private bucket with
owner-scoped access.

## Failure behaviour

If the model is unavailable, the Agent says "O Agente está temporariamente indisponível."
and the rest of the product keeps working. Provider errors are never shown raw.
