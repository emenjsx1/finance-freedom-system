# Personal Finance OS — roadmap

## Phase 01
- [x] Design system (dark charcoal + emerald tokens, mobile-first)
- [x] Architecture: finance logic (`src/lib/finance`) separated from UI, i18n dictionary (pt)
- [x] Currency helpers with integer minor units (MZN, ZAR, USD, EUR, GBP, TRY)
- [x] 7-step onboarding in Portuguese (rule must total 100%)
- [x] App shell: mobile bottom nav + desktop sidebar
- [x] Routes: /app, /app/transactions, /app/wallets, /app/goals, /app/reports, /app/settings
- [x] Home foundation: greeting, wealth vs spendable, buckets, month summary, empty states
- [x] Settings/More sections + notification preference toggles
- [ ] BLOCKED (no workspace credits): enable Lovable Cloud — auth (sign up/in/out, forgot/reset password,
      session persistence), schema with RLS (profiles, accounts, buckets, allocation_rules,
      allocation_rule_items, transactions, transaction_allocations, goals, goal_contributions,
      notification_preferences), route protection, and replacing `src/lib/storage/local-setup-store.ts`
      with backend reads/writes.

## Phase 03 — Transactions experience (done, on-device data)
- [x] Central "+" launcher sheet: Entrada / Despesa / Transferência / Redistribuição + registo rápido
- [x] Premium amount entry (integer minor units, locale formatting, numeric keypad, no negatives)
- [x] Expense / income (auto + manual allocation) / transfer / reallocation flows with review step
- [x] Default categories (16 expense, 9 income), picker with recentes/frequentes/todas + search
- [x] History: month cursor, day groups, cursor pagination (40), debounced search, filter sheet
- [x] Detail sheet (mobile bottom / desktop side panel) with Edit, Duplicate, Delete + confirmation
- [x] Recurring rules + Próximos + Subscrições (default mode = lembrete)
- [x] Attachments (local, 2 MB, images/PDF), tags, notes, large-expense awareness, protected-bucket warnings
- [x] Engine (`src/lib/finance/engine.ts`) is the single source of truth for every balance
- [ ] Backend: schema + RLS + auth still pending; ledger lives in `pfos.ledger.v1` (localStorage)
- [ ] Attachments must move to authenticated storage (currently data URLs on device)

## Phase 04 — Accounts, wallets & money architecture (done, on-device data)
- [x] Physical accounts vs purpose wallets: same money, two views (never summed twice)
- [x] Mapa do dinheiro (/app/money-map): single total, Onde está / Para que serve, organisation ratio, moedas
- [x] Minhas contas (/app/accounts) + account detail: stats, transfer/income/expense/reconcile, edit, safe archive
- [x] Account model: 8 types, currency, institution, last 4 digits only, icon/colour, include-in-net-worth,
      notes, ordering, default spending/income account
- [x] Carteiras (/app/wallets) + wallet detail: behaviour flags (spendable, wealth-building, protection level,
      included in available-to-spend), percentage, ordering, safe archive, activity
- [x] Available-to-spend derived only from wallets flagged as available (never from account balances)
- [x] Protected money: total, /app/protected history, deliberate withdrawal flow (mandatory reason + 2nd confirm)
- [x] Reconciliation + auditable BALANCE_ADJUSTMENT events with purpose assignment (rule / single / manual)
- [x] Unallocated money ("Por distribuir") with Home banner and CTA
- [x] Multi-currency foundation + manual exchange-rate editor (no invented rates, converted totals flagged)
- [x] Privacy mode masks every monetary value across Home, contas, carteiras, mapa
- [x] Notification events: account_reconciled, balance_adjusted, money_unallocated, protected_money_withdrawn
- [x] Browser QA: net worth not double-counted, transfer/reallocation invariants, reconciliation +1.500,
      protected withdrawal reason + history, privacy mode, no console errors
- [ ] Cross-currency transfers intentionally unavailable (would require FX accounting in the engine)
- [ ] Backend (schema, RLS, auth, secure attachment storage) still pending — data is device-local
