
CREATE TABLE public.mortgage_market_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'manual',
  rate_30yr numeric NOT NULL,
  adjusted_rate numeric NOT NULL,
  is_manual_override boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mortgage_market_rates TO authenticated;
GRANT ALL ON public.mortgage_market_rates TO service_role;

ALTER TABLE public.mortgage_market_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read market rates"
  ON public.mortgage_market_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins can insert market rates"
  ON public.mortgage_market_rates FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role('admin'::app_role));

CREATE POLICY "admins can update market rates"
  ON public.mortgage_market_rates FOR UPDATE
  TO authenticated
  USING (public.has_role('admin'::app_role))
  WITH CHECK (public.has_role('admin'::app_role));

CREATE INDEX idx_mortgage_market_rates_active_fetched
  ON public.mortgage_market_rates (active, fetched_at DESC);

-- Seed initial fallback row (6.75 base + 0.125 buffer = 6.875)
INSERT INTO public.mortgage_market_rates (source, rate_30yr, adjusted_rate, active)
VALUES ('seed', 6.75, 6.875, true);
