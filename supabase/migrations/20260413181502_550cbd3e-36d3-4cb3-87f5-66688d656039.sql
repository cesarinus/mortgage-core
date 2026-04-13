
-- Create rate_decisions table
CREATE TABLE public.rate_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_change numeric NOT NULL DEFAULT 0,
  mbs_direction text NOT NULL DEFAULT 'unchanged' CHECK (mbs_direction IN ('increased', 'decreased', 'unchanged')),
  trend_indicator text NOT NULL DEFAULT 'minimal' CHECK (trend_indicator IN ('positive', 'negative', 'minimal')),
  risk_profile text NOT NULL DEFAULT 'conservative' CHECK (risk_profile IN ('conservative', 'aggressive')),
  total_score integer NOT NULL DEFAULT 0,
  recommendation text NOT NULL DEFAULT 'watch' CHECK (recommendation IN ('lock_now', 'lock', 'watch', 'float_cautious', 'float')),
  confidence text NOT NULL DEFAULT 'low' CHECK (confidence IN ('low', 'medium', 'high')),
  time_of_day text,
  explanation text,
  decision_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_decisions ENABLE ROW LEVEL SECURITY;

-- Users can view own decisions
CREATE POLICY "Users can view own rate decisions"
ON public.rate_decisions FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Users can create own decisions
CREATE POLICY "Users can create rate decisions"
ON public.rate_decisions FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Users can update own decisions
CREATE POLICY "Users can update own rate decisions"
ON public.rate_decisions FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Users can delete own decisions
CREATE POLICY "Users can delete own rate decisions"
ON public.rate_decisions FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Admins full access
CREATE POLICY "Admins full access to rate decisions"
ON public.rate_decisions FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Updated_at trigger
CREATE TRIGGER update_rate_decisions_updated_at
BEFORE UPDATE ON public.rate_decisions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rate_decisions;
