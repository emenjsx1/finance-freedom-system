drop table if exists public.reservation_allocations cascade;
drop table if exists public.strategy_rules cascade;
drop table if exists public.strategies cascade;
drop table if exists public.commitments cascade;
drop table if exists public.exchange_rates cascade;
drop table if exists public.transactions cascade;
drop table if exists public.purposes cascade;
drop table if exists public.accounts cascade;
drop table if exists public.plan_milestones cascade;
drop table if exists public.program_items cascade;
drop table if exists public.programs cascade;
drop table if exists public.actions cascade;
drop table if exists public.reminders cascade;
drop table if exists public.decisions cascade;
drop table if exists public.reflections cascade;
drop table if exists public.evolution_events cascade;
drop table if exists public.reviews cascade;
drop table if exists public.direction_items cascade;
drop table if exists public.priorities cascade;
drop table if exists public.personal_context cascade;
drop table if exists public.plans cascade;
drop table if exists public.agent_messages cascade;
drop table if exists public.agent_prepared_actions cascade;
drop table if exists public.agent_threads cascade;
drop table if exists public.notifications cascade;

create table public.accounts (
  id text primary key,
  user_id uuid not null default auth.uid(),
  name text not null,
  type text not null default 'bank',
  currency_code text not null default 'MZN',
  institution text, last4 text, icon text, color text,
  balance_minor bigint not null default 0,
  include_in_net_worth boolean not null default true,
  is_default_spending boolean not null default false,
  is_default_income boolean not null default false,
  low_balance_threshold_minor bigint,
  notes text,
  "order" integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.accounts to authenticated;
grant all on public.accounts to service_role;
alter table public.accounts enable row level security;
create policy "own accounts" on public.accounts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_accounts_updated before update on public.accounts for each row execute function public.touch_updated_at();

create table public.purposes (
  id text primary key,
  user_id uuid not null default auth.uid(),
  name text not null,
  source text not null default 'custom',
  plan_id text,
  kind text not null default 'goals',
  icon text, color text,
  percentage numeric not null default 0,
  spendable boolean,
  wealth_building boolean,
  included_in_available boolean,
  protection_level text not null default 'normal',
  target_minor bigint,
  target_date date,
  monthly_plan_minor bigint,
  low_balance_threshold_minor bigint,
  cover_image_url text,
  "order" integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.purposes to authenticated;
grant all on public.purposes to service_role;
alter table public.purposes enable row level security;
create policy "own purposes" on public.purposes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_purposes_updated before update on public.purposes for each row execute function public.touch_updated_at();

create table public.transactions (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  kind text not null,
  amount_minor bigint not null default 0,
  occurred_at timestamptz not null default now(),
  account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transactions_user_time on public.transactions(user_id, occurred_at desc);
grant select, insert, update, delete on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
create policy "own transactions" on public.transactions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_transactions_updated before update on public.transactions for each row execute function public.touch_updated_at();

create table public.transaction_categories (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.transaction_categories to authenticated;
grant all on public.transaction_categories to service_role;
alter table public.transaction_categories enable row level security;
create policy "own categories" on public.transaction_categories for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.recurring_transactions (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.recurring_transactions to authenticated;
grant all on public.recurring_transactions to service_role;
alter table public.recurring_transactions enable row level security;
create policy "own recurring" on public.recurring_transactions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.exchange_rates (
  id text primary key,
  user_id uuid not null default auth.uid(),
  base_currency text not null,
  quote_currency text not null,
  rate numeric not null,
  source text not null default 'manual',
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.exchange_rates to authenticated;
grant all on public.exchange_rates to service_role;
alter table public.exchange_rates enable row level security;
create policy "own rates" on public.exchange_rates for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.plans (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy "own plans" on public.plans for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_plans_updated before update on public.plans for each row execute function public.touch_updated_at();

create table public.direction_items (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.direction_items to authenticated;
grant all on public.direction_items to service_role;
alter table public.direction_items enable row level security;
create policy "own direction" on public.direction_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.personal_context (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.personal_context to authenticated;
grant all on public.personal_context to service_role;
alter table public.personal_context enable row level security;
create policy "own context" on public.personal_context for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.commitments (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.commitments to authenticated;
grant all on public.commitments to service_role;
alter table public.commitments enable row level security;
create policy "own commitments" on public.commitments for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.programs (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.programs to authenticated;
grant all on public.programs to service_role;
alter table public.programs enable row level security;
create policy "own programs" on public.programs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.actions (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.actions to authenticated;
grant all on public.actions to service_role;
alter table public.actions enable row level security;
create policy "own actions" on public.actions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.decisions (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.decisions to authenticated;
grant all on public.decisions to service_role;
alter table public.decisions enable row level security;
create policy "own decisions" on public.decisions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.reflections (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reflections to authenticated;
grant all on public.reflections to service_role;
alter table public.reflections enable row level security;
create policy "own reflections" on public.reflections for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.evolution_events (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.evolution_events to authenticated;
grant all on public.evolution_events to service_role;
alter table public.evolution_events enable row level security;
create policy "own evolution" on public.evolution_events for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.strategies (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.strategies to authenticated;
grant all on public.strategies to service_role;
alter table public.strategies enable row level security;
create policy "own strategies" on public.strategies for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.agent_threads (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.agent_threads to authenticated;
grant all on public.agent_threads to service_role;
alter table public.agent_threads enable row level security;
create policy "own threads" on public.agent_threads for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_threads_updated before update on public.agent_threads for each row execute function public.touch_updated_at();

create table public.notifications (
  id text primary key,
  user_id uuid not null default auth.uid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);