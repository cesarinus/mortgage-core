-- 1. Drop overly-permissive INSERT policy on lead_stage_history.
--    The SECURITY DEFINER trigger (auto_progress_lead_pipeline) bypasses RLS,
--    so inserts continue to work for legitimate server-side flows.
DROP POLICY IF EXISTS "Service can insert stage history" ON public.lead_stage_history;

-- 2. Remove the DB trigger + function that posted to the public notify endpoint
--    with a hardcoded anon JWT. Status-change notifications will be emitted
--    from edge functions that hold NOTIFY_INGEST_SECRET.
DROP TRIGGER IF EXISTS trg_notify_lead_status_change ON public.leads;
DROP FUNCTION IF EXISTS public.notify_lead_status_change();
