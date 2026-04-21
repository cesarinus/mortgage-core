-- 1.1 Seed AI Chat as a lead source (idempotent)
INSERT INTO public.lead_sources (name) VALUES ('AI Chat')
ON CONFLICT (name) DO NOTHING;

-- 1.2 Add chat_session_id to leads (sparse unique)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS chat_session_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_chat_session_id_unique
  ON public.leads (chat_session_id)
  WHERE chat_session_id IS NOT NULL;

-- 1.3 chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      text NOT NULL UNIQUE,
  lead_id         uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  total_score     integer NOT NULL DEFAULT 0,
  messages_count  integer NOT NULL DEFAULT 0,
  first_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_at  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- NOTE: existing is_admin() takes no args (uses auth.uid() internally) — adjusted from spec.
CREATE POLICY "Admins full access to chat_sessions"
  ON public.chat_sessions FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can view chat sessions for own leads"
  ON public.chat_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = chat_sessions.lead_id
        AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON public.chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_lead_id    ON public.chat_sessions(lead_id);

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();