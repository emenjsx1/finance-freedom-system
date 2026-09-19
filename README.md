# Your Financial Compass

Implement Phase 01: Product Foundation, Design System, Authentication & Onboarding now. Use internal planning and do not present another implementation plan for user approval. Enable Lovable Cloud / Supabase for backend authentication and database tables with Row Level Security.

User Request & Specifications:
==================================================
PROJECT: Personal Finance OS
PHASE: 01 — Product Foundation, Design System, Authentication & Onboarding

Build the foundation of a premium personal finance application.
This is not a prototype or disposable demo. Build the project with production-quality architecture because it will evolve into a real product and may later be distributed as a mobile application.

Focus specifically on:
1. Product foundation
2. Premium design system (mobile-first, dark charcoal/near-black surfaces, emerald/mint accent, semantic colors, design tokens)
3. Application architecture (TypeScript, clean modular structure, separation of financial logic from presentation, reusable currency/formatting helpers)
4. Authentication with Supabase (Sign up, sign in, sign out, forgot password, reset password, session persistence; user financial data tied to authenticated user with RLS)
5. First-time onboarding (7-step flow in Portuguese):
   - Step 1: Welcome ("Organiza o teu dinheiro. Constrói a tua liberdade.")
   - Step 2: Currency selector (searchable, starting support for MZN, ZAR, USD, EUR, GBP, TRY without hardcoding MZN)
   - Step 3: Financial philosophy ("O saldo da tua conta não é necessariamente o dinheiro que tens disponível para gastar" — physical accounts vs. purpose buckets)
   - Step 4: First distribution rule (Default example: Construção 40%, Objetivos 20%, Vida 20%, Família 10%, Livre 10% — editable names, percentages, icons; live total indicator; strictly requires sum == 100% to proceed)
   - Step 5: First accounts (where money physically exists: Bank account, Mobile wallet, Cash, etc. with custom naming like BIM, Moza, M-Pesa)
   - Step 6: Starting balances (optional initial balance per account, reinforcing Account = physical location vs Bucket = purpose)
   - Step 7: Ready ("O teu sistema financeiro está pronto." -> "Entrar no meu painel")
6. Main application shell/navigation:
   - Mobile: bottom navigation (Home, Transactions, central prominent Add button, Goals, More)
   - Desktop: premium sidebar navigation
   - Protected routes: /app, /app/transactions, /app/wallets, /app/goals, /app/reports, /app/settings
7. Home foundation:
   - Dynamic greeting (Bom dia / Boa tarde / Boa noite + user name)
   - "Património pessoal" (total wealth) vs "Disponível para gastar" (spendable) visually distinct
   - Placeholder sections for buckets (Protected, Wealth building, Goals, Life, Family, Free spending)
   - Month summary (Entradas, Gastos, Construído)
   - High-polish empty states (no fake transactions)
8. Core Data Model & Supabase schema with RLS:
   - profiles, accounts, buckets, allocation_rules, allocation_rule_items, transactions, transaction_allocations, goals, goal_contributions, notification_preferences
   - Numeric/decimal types for currency (never floating point)
   - UUID PKs, created_at, updated_at, proper foreign keys
9. Notification & Settings foundation:
   - notification_preferences schema and settings toggles
   - Settings / More page sections: Profile, My accounts, Buckets, Financial rule, Categories, Currency, Notifications, Appearance, Security, Export data, Help & Support, Feedback, version info
10. Language & Trust:
   - Initial UI in Portuguese, structured for future i18n
   - Secure Supabase configuration, no sensitive IDs or keys exposed in frontend code

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0082b76a-28fa-4493-b584-7626ba6ca9f9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
