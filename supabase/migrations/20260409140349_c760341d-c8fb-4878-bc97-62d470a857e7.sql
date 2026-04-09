
-- Create blog post status enum
CREATE TYPE public.blog_post_status AS ENUM ('draft', 'published');

-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content_html TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  featured_image TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  author TEXT NOT NULL DEFAULT 'NexGenSWFL',
  status blog_post_status NOT NULL DEFAULT 'draft',
  meta_title TEXT,
  meta_description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts
CREATE POLICY "Anyone can view published posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published');

-- Admins can view all posts (including drafts)
CREATE POLICY "Admins can view all posts"
  ON public.blog_posts FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can create posts
CREATE POLICY "Admins can create posts"
  ON public.blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins can update posts
CREATE POLICY "Admins can update posts"
  ON public.blog_posts FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Admins can delete posts
CREATE POLICY "Admins can delete posts"
  ON public.blog_posts FOR DELETE
  TO authenticated
  USING (is_admin());

-- Updated_at trigger
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for slug lookups
CREATE INDEX idx_blog_posts_slug ON public.blog_posts (slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts (status);
CREATE INDEX idx_blog_posts_category ON public.blog_posts (category);
