-- Internal scheduler table: no app role may read it. Explicit deny policy documents that.
DROP POLICY IF EXISTS "cron_config no app access" ON public.cron_config;
CREATE POLICY "cron_config no app access" ON public.cron_config FOR SELECT TO authenticated USING (false);