ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_preference text NOT NULL DEFAULT 'ng-dark'
  CHECK (theme_preference IN ('ng-dark','ng-light','original','system'));