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

## Phase 06 — Premium redesign, personalization & personal agent (done, on-device data)
- [x] Design foundation: spacing/radius/shadow tokens, typography scale with tabular numerals,
      card system (hero/standard/compact/interactive/quiet), reduced-motion support
- [x] Purpose-built light theme (not inverted) + curated accents (emerald, blue, violet, amber, neutral)
- [x] Button system: primary, secondary, ghost, danger, icon, floating action, compact — with pressed,
      disabled, loading and focus states
- [x] Navigation redesign: mobile Início · Atividade · Adicionar · Plano · Agente (action inside the bar),
      /app/plan hub, grouped desktop sidebar
- [x] Home rebuilt around modules with in-place edit mode (show/hide, reorder, restore default)
- [x] Centralised user preferences (theme, accent, density, modules, default page, currency display,
      terminology overrides, agent settings) in one store
- [x] Terminology renaming is display-only; internal ids unchanged
- [x] Agent: threaded chat with dedicated conversation routes, rename/delete/search, AI Elements UI
- [x] Deterministic context builder (11 read tools, keyword routing, capped payloads) — the model never
      calculates balances
- [x] PREPARE → user CONFIRM → engine EXECUTE for agent financial actions, with audit trail
- [x] Structured personal memory (8 categories) + profile, fully inspectable/editable in agent settings
- [x] Provider abstraction server-side; AI key never leaves the server; agent outage never breaks the app
- [x] Browser QA: dashboard customisation persists across reload, accent/theme switch, privacy mode masks
      every value, terminology rename is display-only, agent answers with engine values (20.000 available),
      prepared expense left balances untouched until Confirmar then created exactly one transaction,
      audit status confirmed, memory added and deleted, no console or runtime errors

## Phase 07 — Analytics, financial intelligence & insights (done, on-device data)
- [x] Centralised metric definitions + analytics service layer on top of the engine
- [x] Análise section: period selector, money flow, spending by category + detail, comparisons, trends
- [x] Income analysis, wealth building, build/spend rate, net worth history, wallet & protected analytics
- [x] Deterministic insights engine with data-sufficiency thresholds and ranked insights
- [x] Agent analytics tools + "Pergunta ao teu dinheiro" + structured response blocks
- [x] Reports (monthly, weekly, custom period) with clean serialisation for future export

## Phase 08 — Notifications, automations & proactive agent — done (on-device)
- Notification centre, preferences, quiet hours, budget, dedupe, snooze, deep links
- Daily brief, weekly/monthly reviews, goal/payment/unallocated/protected/low-balance events
- Automations with templates, custom builder, run log; financial actions only prepared
- Push/email adapters exist; server scheduling waits for the backend

## Special Phase — Complete visual system migration (requested, not started)
- [ ] Extract design tokens from the attached iOS reference (warm ivory light mode, forest green accent, editorial typography)
- [ ] Rebuild shared primitives: MoneyHero, FinancialAmount, QuickAction, GoalCard, TransactionRow, InsightCard, NativeSheet, SectionHeader, ProgressIndicator, AccountRow, AgentActionCard, MetricCard, PrivacyAmount, BottomNavigation
- [ ] Migrate Home first as the quality benchmark, then every remaining screen
- [ ] Remove old visual language; light mode primary, intentional dark mode
- [ ] Preserve all engine, agent, analytics, notification and security behaviour

## Migração visual completa (referência iPhone) — done

## Correção UI/UX — perfil, autenticação, atividade, header pessoal — done

## Fase 10 — Parte A: integridade financeira (done)
- [x] Auditoria completa (working / partial / UI only / missing) registada no plano da fase 10
- [x] Guarda de domínio única no `LedgerProvider`: nenhum propósito pode ficar negativo
      (despesa, redistribuição, ajuste negativo) — cobre composer, agente, recorrências e reconciliação
- [x] Proteção de idempotência: movimento idêntico em menos de 3s não é duplicado
- [x] `src/lib/finance/integrity.ts` + testes: saldos negativos, propósitos acima do dinheiro real,
      alocações órfãs, referências em falta, distribuição incompleta, moedas sem taxa
- [x] Ecrã "Verificação financeira" (/app/integrity) com correção auditável por redistribuição
      e diagnóstico técnico só em desenvolvimento
- [x] Home: aviso calmo quando as contas não fecham (nunca números inventados) + esqueleto de carregamento
- [ ] Parte B: migrar contas, movimentos, carteiras, objetivos, memórias e preferências para a base de dados
- [ ] Parte C: atividade paginada no servidor
- [ ] Parte D: foto de perfil, sessões, erros centralizados, automações no servidor

## Fase 11 — parte 2 (done)
- Ícones profissionais em toda a app; objetivos reconstruídos (cartão, detalhe, criação em 3 passos)
- Folha rápida "Novo movimento" ao estilo iOS + comprovativos em armazenamento privado com visualizador
- Autenticação: ecrãs dedicados /signup, /forgot-password, /reset-password + links legais antes de criar conta
- Agente aceita imagens (recibos) e continua a usar só os factos do motor financeiro
- Páginas públicas /privacy, /terms, /ai-data, /support + Perfil → Ajuda e legal
- Home simplificada (sem duplicação de posição financeira)
- Documentação: docs/app-store-checklist.md, docs/app-privacy-inventory.md

### Em falta (configuração externa)
Credenciais Apple/Google, chave do fornecedor de IA em produção, fornecedor de email, credenciais de push, identidade legal e contactos nas páginas legais.

## Fase 12 — Sistema Operativo Pessoal (done)
- Quatro conceitos separados: contas (motor financeiro), planos, estratégia, contexto.
- Planos com ou sem dinheiro, estados (ideia/ativo/pausa/concluído), passos e ligação a carteira de propósito.
- Estratégia: 10 formas de organizar, sem hierarquia, modo sugerir por omissão, simulação de entrada.
- Migração da regra fixa antiga para "Minha estratégia anterior" (apenas sugere, editável).
- Direção escrita pela pessoa, contexto visível/editável com permissões por área.
- Revisão calma, sem pontuações; conflitos de planos mostrados, nunca corrigidos sozinhos.
- Agente ganhou get_plans, get_direction, get_strategy (respeitam permissões; valores vêm do motor).
- Navegação: Início, Planos, +, Agente, Eu. Docs: docs/personal-os-architecture.md.
