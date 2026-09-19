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
