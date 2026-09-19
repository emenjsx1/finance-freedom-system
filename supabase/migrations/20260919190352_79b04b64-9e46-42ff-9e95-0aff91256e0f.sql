-- ============ helpers ============
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ MONEY ============
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  type text not null default 'bank',
  currency_code text not null default 'MZN',
  institution text,
  last4 text,
  icon text,
  color text,
  starting_balance_minor bigint not null default 0,
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
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  source text not null default 'custom',
  plan_id uuid,
  kind text not null default 'goals',
  icon text,
  color text,
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
create unique index purposes_plan_unique on public.purposes(user_id, plan_id) where plan_id is not null;
grant select, insert, update, delete on public.purposes to authenticated;
grant all on public.purposes to service_role;
alter table public.purposes enable row level security;
create policy "own purposes" on public.purposes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_purposes_updated before update on public.purposes for each row execute function public.touch_updated_at();

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kind text not null,
  money_type text not null default 'personal',
  amount_minor bigint not null,
  currency_code text not null default 'MZN',
  description text not null default '',
  occurred_at timestamptz not null default now(),
  account_id uuid references public.accounts(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  from_purpose_id uuid references public.purposes(id) on delete set null,
  to_purpose_id uuid references public.purposes(id) on delete set null,
  category_id text,
  tags text[] not null default '{}',
  notes text,
  allocations jsonb,
  request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index transactions_request_unique on public.transactions(user_id, request_id) where request_id is not null;
create index transactions_user_time on public.transactions(user_id, occurred_at desc);
grant select, insert, update, delete on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
create policy "own transactions" on public.transactions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_transactions_updated before update on public.transactions for each row execute function public.touch_updated_at();

create table public.reservation_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  account_id uuid references public.accounts(id) on delete set null,
  purpose_id uuid not null references public.purposes(id) on delete cascade,
  amount_minor bigint not null,
  status text not null default 'active',
  source_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reservation_allocations to authenticated;
grant all on public.reservation_allocations to service_role;
alter table public.reservation_allocations enable row level security;
create policy "own reservations" on public.reservation_allocations for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_reservations_updated before update on public.reservation_allocations for each row execute function public.touch_updated_at();

create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  amount_minor bigint not null default 0,
  cadence text not null default 'monthly',
  due_day integer,
  account_id uuid references public.accounts(id) on delete set null,
  purpose_id uuid references public.purposes(id) on delete set null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.commitments to authenticated;
grant all on public.commitments to service_role;
alter table public.commitments enable row level security;
create policy "own commitments" on public.commitments for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_commitments_updated before update on public.commitments for each row execute function public.touch_updated_at();

create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
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

create table public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null default '',
  mode text not null default 'manual',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.strategies to authenticated;
grant all on public.strategies to service_role;
alter table public.strategies enable row level security;
create policy "own strategies" on public.strategies for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_strategies_updated before update on public.strategies for each row execute function public.touch_updated_at();

create table public.strategy_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  strategy_id uuid not null references public.strategies(id) on delete cascade,
  kind text not null default 'percentage',
  label text not null default '',
  purpose_id uuid references public.purposes(id) on delete set null,
  plan_id uuid,
  value numeric not null default 0,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.strategy_rules to authenticated;
grant all on public.strategy_rules to service_role;
alter table public.strategy_rules enable row level security;
create policy "own strategy rules" on public.strategy_rules for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_strategy_rules_updated before update on public.strategy_rules for each row execute function public.touch_updated_at();

-- ============ PLANS ============
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  why text,
  kind text not null default 'mixed',
  status text not null default 'active',
  priority text not null default 'important',
  financial boolean not null default false,
  purpose_id uuid references public.purposes(id) on delete set null,
  target_minor bigint,
  target_date date,
  cover_image_url text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy "own plans" on public.plans for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_plans_updated before update on public.plans for each row execute function public.touch_updated_at();

create table public.plan_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  title text not null,
  done_at timestamptz,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.plan_milestones to authenticated;
grant all on public.plan_milestones to service_role;
alter table public.plan_milestones enable row level security;
create policy "own milestones" on public.plan_milestones for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ PERSONAL / DEVELOPMENT ============
create table public.direction_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  content text not null,
  horizon text not null default 'now',
  category text,
  source text not null default 'user',
  plan_id uuid references public.plans(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.direction_items to authenticated;
grant all on public.direction_items to service_role;
alter table public.direction_items enable row level security;
create policy "own direction" on public.direction_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_direction_updated before update on public.direction_items for each row execute function public.touch_updated_at();

create table public.priorities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  content text not null,
  level text not null default 'now',
  status text not null default 'active',
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.priorities to authenticated;
grant all on public.priorities to service_role;
alter table public.priorities enable row level security;
create policy "own priorities" on public.priorities for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_priorities_updated before update on public.priorities for each row execute function public.touch_updated_at();

create table public.personal_context (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  content text not null,
  category text,
  source text not null default 'user',
  state text not null default 'active',
  sensitive boolean not null default false,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.personal_context to authenticated;
grant all on public.personal_context to service_role;
alter table public.personal_context enable row level security;
create policy "own context" on public.personal_context for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_context_updated before update on public.personal_context for each row execute function public.touch_updated_at();

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  description text,
  purpose text,
  status text not null default 'draft',
  start_date date,
  end_date date,
  duration_days integer,
  created_source text not null default 'user',
  linked_plan_id uuid references public.plans(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.programs to authenticated;
grant all on public.programs to service_role;
alter table public.programs enable row level security;
create policy "own programs" on public.programs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_programs_updated before update on public.programs for each row execute function public.touch_updated_at();

create table public.program_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  type text not null default 'action',
  title text not null,
  description text,
  day integer,
  scheduled_date date,
  scheduled_time text,
  status text not null default 'pending',
  "order" integer not null default 0,
  reminder boolean not null default false,
  linked_action_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.program_items to authenticated;
grant all on public.program_items to service_role;
alter table public.program_items enable row level security;
create policy "own program items" on public.program_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_program_items_updated before update on public.program_items for each row execute function public.touch_updated_at();

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  description text,
  status text not null default 'pending',
  priority text not null default 'important',
  scheduled_date date,
  scheduled_time text,
  due_date date,
  linked_plan_id uuid references public.plans(id) on delete set null,
  linked_program_id uuid references public.programs(id) on delete set null,
  reminder boolean not null default false,
  created_source text not null default 'user',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.actions to authenticated;
grant all on public.actions to service_role;
alter table public.actions enable row level security;
create policy "own actions" on public.actions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_actions_updated before update on public.actions for each row execute function public.touch_updated_at();

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  scheduled_at timestamptz not null,
  timezone text not null default 'Africa/Maputo',
  recurrence text,
  status text not null default 'scheduled',
  linked_action_id uuid references public.actions(id) on delete cascade,
  linked_program_id uuid references public.programs(id) on delete cascade,
  linked_plan_id uuid references public.plans(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reminders to authenticated;
grant all on public.reminders to service_role;
alter table public.reminders enable row level security;
create policy "own reminders" on public.reminders for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_reminders_updated before update on public.reminders for each row execute function public.touch_updated_at();

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  statement text not null,
  reason text,
  decided_on date not null default current_date,
  status text not null default 'active',
  linked_plan_id uuid references public.plans(id) on delete set null,
  linked_direction_id uuid references public.direction_items(id) on delete set null,
  source text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.decisions to authenticated;
grant all on public.decisions to service_role;
alter table public.decisions enable row level security;
create policy "own decisions" on public.decisions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_decisions_updated before update on public.decisions for each row execute function public.touch_updated_at();

create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  content text not null,
  date_key date not null default current_date,
  linked_program_id uuid references public.programs(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reflections to authenticated;
grant all on public.reflections to service_role;
alter table public.reflections enable row level security;
create policy "own reflections" on public.reflections for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.evolution_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kind text not null,
  title text not null,
  happened_at timestamptz not null default now(),
  hidden boolean not null default false,
  payload jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.evolution_events to authenticated;
grant all on public.evolution_events to service_role;
alter table public.evolution_events enable row level security;
create policy "own evolution" on public.evolution_events for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  type text not null default 'weekly',
  period_start date not null,
  period_end date not null,
  facts jsonb not null default '{}'::jsonb,
  user_notes text,
  approved_changes jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "own reviews" on public.reviews for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_reviews_updated before update on public.reviews for each row execute function public.touch_updated_at();

-- ============ AGENT ============
create table public.agent_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null default '',
  mode text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.agent_threads to authenticated;
grant all on public.agent_threads to service_role;
alter table public.agent_threads enable row level security;
create policy "own threads" on public.agent_threads for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_threads_updated before update on public.agent_threads for each row execute function public.touch_updated_at();

create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  thread_id uuid not null references public.agent_threads(id) on delete cascade,
  role text not null,
  parts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index agent_messages_thread on public.agent_messages(thread_id, created_at);
grant select, insert, update, delete on public.agent_messages to authenticated;
grant all on public.agent_messages to service_role;
alter table public.agent_messages enable row level security;
create policy "own messages" on public.agent_messages for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.agent_prepared_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  thread_id uuid references public.agent_threads(id) on delete cascade,
  payload jsonb not null,
  status text not null default 'prepared',
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.agent_prepared_actions to authenticated;
grant all on public.agent_prepared_actions to service_role;
alter table public.agent_prepared_actions enable row level security;
create policy "own prepared actions" on public.agent_prepared_actions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ SYSTEM ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kind text not null,
  title text not null default '',
  body text,
  payload jsonb,
  deep_link text,
  scheduled_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.user_settings (
  user_id uuid primary key default auth.uid(),
  notification_preferences jsonb not null default '{}'::jsonb,
  quiet_hours jsonb,
  privacy_mode boolean not null default false,
  appearance jsonb not null default '{}'::jsonb,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_settings to authenticated;
grant all on public.user_settings to service_role;
alter table public.user_settings enable row level security;
create policy "own settings" on public.user_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger t_settings_updated before update on public.user_settings for each row execute function public.touch_updated_at();

create table public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  request_id text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, request_id)
);
grant select, insert on public.idempotency_keys to authenticated;
grant all on public.idempotency_keys to service_role;
alter table public.idempotency_keys enable row level security;
create policy "own idempotency" on public.idempotency_keys for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);