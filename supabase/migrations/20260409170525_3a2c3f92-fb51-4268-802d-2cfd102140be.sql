
-- Table: blog_variants — stores which variant combination a session was assigned
CREATE TABLE public.blog_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  cta_position TEXT NOT NULL DEFAULT 'bottom',
  cta_text TEXT NOT NULL DEFAULT 'Get Pre-Qualified',
  sidebar_module TEXT NOT NULL DEFAULT 'standard',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one variant assignment per session+post
CREATE UNIQUE INDEX idx_blog_variants_session_post ON public.blog_variants(session_id, post_id);
CREATE INDEX idx_blog_variants_session ON public.blog_variants(session_id);

ALTER TABLE public.blog_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert variants" ON public.blog_variants FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read own session variants" ON public.blog_variants FOR SELECT TO public USING (true);
CREATE POLICY "Admins full access variants" ON public.blog_variants FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: blog_variant_metrics — tracks impressions, clicks, conversions per variant combo
CREATE TABLE public.blog_variant_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.blog_variants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'impression', 'click', 'conversion'
  cta_position TEXT NOT NULL,
  cta_text TEXT NOT NULL,
  sidebar_module TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_variant_metrics_variant ON public.blog_variant_metrics(variant_id);
CREATE INDEX idx_variant_metrics_event ON public.blog_variant_metrics(event_type);

ALTER TABLE public.blog_variant_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert metrics" ON public.blog_variant_metrics FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins can read metrics" ON public.blog_variant_metrics FOR SELECT TO authenticated USING (is_admin());

-- Add variant_shown to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS variant_shown JSONB DEFAULT NULL;

-- Add blog_session_id to leads if not exists
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS blog_session_id TEXT DEFAULT NULL;
