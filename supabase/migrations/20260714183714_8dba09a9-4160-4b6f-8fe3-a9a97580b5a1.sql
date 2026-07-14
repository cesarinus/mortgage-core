UPDATE public.social_media_posts
SET cta_link = 'https://nexgencapitalfinance.com/?start=1'
WHERE (cta_link IS NULL OR cta_link = '') AND status IN ('draft','scheduled');