-- Enums
CREATE TYPE public.social_post_type AS ENUM (
  'featured_business',
  'local_tips',
  'events_promotions',
  'ai_tools',
  'success_stories',
  'community_highlight',
  'summary_reminder'
);

CREATE TYPE public.social_post_status AS ENUM (
  'draft',
  'scheduled',
  'published',
  'failed'
);

CREATE TYPE public.social_platform AS ENUM (
  'facebook',
  'instagram',
  'linkedin',
  'all'
);

-- Posts
CREATE TABLE public.social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type public.social_post_type NOT NULL,
  platform public.social_platform NOT NULL DEFAULT 'all',
  post_text TEXT NOT NULL,
  image_placeholder TEXT,
  image_url TEXT,
  cta_link TEXT,
  hashtags TEXT[] DEFAULT '{}',
  location_tags TEXT[] DEFAULT '{}',
  mentions TEXT[] DEFAULT '{}',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME DEFAULT '10:00:00',
  status public.social_post_status NOT NULL DEFAULT 'draft',
  leads_generated INTEGER DEFAULT 0,
  engagement_clicks INTEGER DEFAULT 0,
  meta_post_id TEXT,
  facebook_post_id TEXT,
  instagram_post_id TEXT,
  linkedin_post_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_social_posts_status_date ON public.social_media_posts (status, scheduled_date, scheduled_time);

-- Weekly schedule template
CREATE TABLE public.social_media_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  post_type public.social_post_type NOT NULL,
  default_time TIME DEFAULT '10:00:00',
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(day_of_week)
);

-- Analytics
CREATE TABLE public.social_media_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.social_media_posts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL,
  source_platform public.social_platform,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Debug logs
CREATE TABLE public.social_debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.social_media_posts(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Account settings (single-row config)
CREATE TABLE public.social_account_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_page_id TEXT,
  instagram_business_id TEXT,
  linkedin_org_urn TEXT,
  default_image_url TEXT,
  brand_voice TEXT DEFAULT 'professional, warm, expert mortgage lender voice',
  business_name TEXT DEFAULT 'NexGen Capital',
  website_url TEXT DEFAULT 'https://ngcapital.net',
  contact_phone TEXT DEFAULT '(239) 645-4580',
  contact_email TEXT DEFAULT 'hello@ngcapital.net',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default weekly schedule
INSERT INTO public.social_media_schedule (day_of_week, post_type, description, default_time) VALUES
  (1, 'featured_business', 'Monday: Featured Spotlight', '10:00:00'),
  (2, 'local_tips', 'Tuesday: Local Mortgage Tips', '11:00:00'),
  (3, 'ai_tools', 'Wednesday: Rate / Market Update', '10:00:00'),
  (4, 'success_stories', 'Thursday: Client Success Story', '11:00:00'),
  (5, 'events_promotions', 'Friday: Loan Program / Promotion', '12:00:00'),
  (6, 'community_highlight', 'Saturday: SWFL Community Highlight', '10:00:00'),
  (0, 'summary_reminder', 'Sunday: Weekly Recap / Reminder', '14:00:00');

-- Seed account settings row
INSERT INTO public.social_account_settings DEFAULT VALUES;

-- Enable RLS
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_debug_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_account_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins manage social posts" ON public.social_media_posts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage social schedule" ON public.social_media_schedule
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage social analytics" ON public.social_media_analytics
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage social debug logs" ON public.social_debug_logs
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage social account settings" ON public.social_account_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Triggers for updated_at
CREATE TRIGGER trg_social_posts_updated_at
  BEFORE UPDATE ON public.social_media_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_social_schedule_updated_at
  BEFORE UPDATE ON public.social_media_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_social_settings_updated_at
  BEFORE UPDATE ON public.social_account_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();