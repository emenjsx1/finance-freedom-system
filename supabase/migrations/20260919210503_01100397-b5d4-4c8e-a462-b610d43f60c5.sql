-- lovable-cron-fallback-reviewed: reminders must fire at the exact minute the user chose; user informed of 1440 runs/day cost
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS last_push_at timestamptz;

CREATE TABLE IF NOT EXISTS public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  reminder_id text,
  title text,
  status text not null,
  http_status int,
  error text,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.push_deliveries TO authenticated;
GRANT ALL ON public.push_deliveries TO service_role;
ALTER TABLE public.push_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own deliveries" ON public.push_deliveries;
CREATE POLICY "own deliveries" ON public.push_deliveries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS push_deliveries_user_idx ON public.push_deliveries (user_id, created_at desc);

CREATE TABLE IF NOT EXISTS public.cron_config (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
REVOKE ALL ON public.cron_config FROM anon, authenticated;
GRANT ALL ON public.cron_config TO service_role;
ALTER TABLE public.cron_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.cron_config (key, value)
VALUES ('push_dispatch_token', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE tok text;
BEGIN
  SELECT value INTO tok FROM public.cron_config WHERE key = 'push_dispatch_token';
  PERFORM cron.unschedule('push-dispatch') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'push-dispatch');
  PERFORM cron.schedule(
    'push-dispatch',
    '* * * * *',
    format($cmd$select net.http_post(
      url := 'https://project--0082b76a-28fa-4493-b584-7626ba6ca9f9.lovable.app/api/public/push-dispatch',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-token',%L),
      body := '{}'::jsonb,
      timeout_milliseconds := 20000
    );$cmd$, tok)
  );
END $$;