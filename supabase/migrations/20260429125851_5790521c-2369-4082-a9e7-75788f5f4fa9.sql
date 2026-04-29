
-- 1) booking_settings: remove public SELECT, restrict to admins
DROP POLICY IF EXISTS "Anyone can read booking settings" ON public.booking_settings;

CREATE POLICY "Admins can read booking settings"
ON public.booking_settings
FOR SELECT
TO authenticated
USING (public.is_admin());

-- 2) lead_events: remove permissive public INSERT (edge functions use service role -> bypass RLS)
DROP POLICY IF EXISTS "Service can insert events" ON public.lead_events;

-- 3) Realtime channel authorization for rate_decisions
-- Convention: each user subscribes to channel "rate_decisions:<their uid>"
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own rate_decisions channel" ON realtime.messages;
CREATE POLICY "Users can read own rate_decisions channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = 'rate_decisions:' || auth.uid()::text)
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Users can join own rate_decisions channel" ON realtime.messages;
CREATE POLICY "Users can join own rate_decisions channel"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() = 'rate_decisions:' || auth.uid()::text)
  OR public.is_admin()
);
