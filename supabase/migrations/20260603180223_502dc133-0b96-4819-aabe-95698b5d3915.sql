CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT 'facebook',
  caption text NOT NULL DEFAULT '',
  hashtags text[] DEFAULT '{}',
  media_type text NOT NULL DEFAULT 'text',
  status text NOT NULL DEFAULT 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.social_posts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view social posts" ON public.social_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create social posts" ON public.social_posts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update social posts" ON public.social_posts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete social posts" ON public.social_posts FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_social_posts_updated_at
BEFORE UPDATE ON public.social_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();