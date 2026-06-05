
CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('crm','portal')),
  record_kind text CHECK (record_kind IN ('lead','contact','deal','portal')),
  record_id uuid,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_threads_user_idx ON public.chat_threads(user_id, scope, record_kind, record_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chat threads" ON public.chat_threads
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all chat threads" ON public.chat_threads
  FOR SELECT TO authenticated
  USING (public.has_role('admin'::app_role));

CREATE TRIGGER chat_threads_updated_at
  BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_thread_idx ON public.chat_messages(thread_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access messages in their threads" ON public.chat_messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));

CREATE POLICY "Admins view all chat messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (public.has_role('admin'::app_role));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assistant_enabled boolean NOT NULL DEFAULT true;
