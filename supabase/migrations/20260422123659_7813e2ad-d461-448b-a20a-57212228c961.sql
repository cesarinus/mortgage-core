
-- =====================================================
-- BOOKING SETTINGS (single row)
-- =====================================================
CREATE TABLE public.booking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday_hours jsonb NOT NULL DEFAULT '{
    "mon": ["09:00","17:00"],
    "tue": ["09:00","17:00"],
    "wed": ["09:00","17:00"],
    "thu": ["09:00","17:00"],
    "fri": ["09:00","17:00"]
  }'::jsonb,
  slot_minutes integer NOT NULL DEFAULT 30 CHECK (slot_minutes IN (15, 30, 45, 60)),
  buffer_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0 AND buffer_minutes <= 60),
  timezone text NOT NULL DEFAULT 'America/New_York',
  notify_email text NOT NULL DEFAULT 'CMartinez@NGCapital.net',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read booking settings"
  ON public.booking_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins manage booking settings"
  ON public.booking_settings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE TRIGGER update_booking_settings_updated_at
  BEFORE UPDATE ON public.booking_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default settings row
INSERT INTO public.booking_settings DEFAULT VALUES;

-- =====================================================
-- BLACKOUT DATES
-- =====================================================
CREATE TABLE public.booking_blackout_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_blackout_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read blackout dates"
  ON public.booking_blackout_dates FOR SELECT
  USING (true);

CREATE POLICY "Admins manage blackout dates"
  ON public.booking_blackout_dates FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- BOOKINGS
-- =====================================================
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  loan_type text,
  meeting_type text NOT NULL DEFAULT 'call' CHECK (meeting_type IN ('call', 'zoom')),
  notes text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent double-bookings on the same start time (only for confirmed bookings)
CREATE UNIQUE INDEX bookings_unique_confirmed_start
  ON public.bookings(start_at) WHERE status = 'confirmed';

CREATE INDEX bookings_start_at_idx ON public.bookings(start_at);
CREATE INDEX bookings_lead_id_idx ON public.bookings(lead_id);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins full access to bookings"
  ON public.bookings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users can view bookings for own leads"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = bookings.lead_id
        AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
    )
  );

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- get_available_slots(date) -> SETOF timestamptz
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_available_slots(p_date date)
RETURNS SETOF timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.booking_settings%ROWTYPE;
  v_dow text;
  v_hours jsonb;
  v_start_str text;
  v_end_str text;
  v_tz text;
  v_slot_min integer;
  v_buffer_min integer;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_cursor timestamptz;
  v_slot_end timestamptz;
  v_now timestamptz := now();
BEGIN
  -- blackout?
  IF EXISTS (SELECT 1 FROM public.booking_blackout_dates WHERE date = p_date) THEN
    RETURN;
  END IF;

  SELECT * INTO v_settings FROM public.booking_settings LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  v_tz := v_settings.timezone;
  v_slot_min := v_settings.slot_minutes;
  v_buffer_min := v_settings.buffer_minutes;

  v_dow := lower(to_char(p_date, 'dy'));
  v_hours := v_settings.weekday_hours -> v_dow;

  IF v_hours IS NULL OR jsonb_array_length(v_hours) < 2 THEN
    RETURN;
  END IF;

  v_start_str := v_hours ->> 0;
  v_end_str := v_hours ->> 1;

  v_day_start := ((p_date::text || ' ' || v_start_str)::timestamp AT TIME ZONE v_tz);
  v_day_end := ((p_date::text || ' ' || v_end_str)::timestamp AT TIME ZONE v_tz);

  v_cursor := v_day_start;

  WHILE v_cursor + (v_slot_min || ' minutes')::interval <= v_day_end LOOP
    v_slot_end := v_cursor + (v_slot_min || ' minutes')::interval;

    -- skip past slots
    IF v_cursor > v_now AND NOT EXISTS (
      SELECT 1 FROM public.bookings
      WHERE status = 'confirmed'
        AND start_at < v_slot_end + (v_buffer_min || ' minutes')::interval
        AND end_at > v_cursor - (v_buffer_min || ' minutes')::interval
    ) THEN
      RETURN NEXT v_cursor;
    END IF;

    v_cursor := v_slot_end;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_slots(date) TO anon, authenticated;

-- Register lead source for bookings
INSERT INTO public.lead_sources (name)
SELECT 'Booking'
WHERE NOT EXISTS (SELECT 1 FROM public.lead_sources WHERE name = 'Booking');
