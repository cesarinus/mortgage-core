CREATE TABLE public.social_credentials (
  provider text PRIMARY KEY CHECK (provider IN ('meta','linkedin')),
  access_token text NOT NULL,
  token_last4 text,
  account_name text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.social_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.social_credentials TO service_role;
ALTER TABLE public.social_credentials ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.social_credentials IS 'Social publishing tokens. Server-only; written via save-social-token function by admins.';