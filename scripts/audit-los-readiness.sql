-- LOS readiness audit (read-only).
-- Lists every recent lead with the fields the LOS payload requires, plus
-- a "missing" column naming the first canonical field that would block export.
--
-- Run:  psql -f scripts/audit-los-readiness.sql

WITH ctx AS (
  SELECT
    l.id              AS lead_id,
    l.first_name,
    l.last_name,
    l.email,
    l.phone,
    l.loan_purpose,
    l.loan_amount,
    l.property_value,
    l.property_address,
    l.assigned_to,
    p.email           AS loan_officer_email,
    mp.occupancy_type,
    scn.lien_position,
    l.created_at
  FROM public.leads l
  LEFT JOIN public.profiles            p   ON p.id = l.assigned_to
  LEFT JOIN public.mortgage_profiles   mp  ON mp.lead_id = l.id
  LEFT JOIN LATERAL (
    SELECT lien_position FROM public.loan_scenarios
     WHERE lead_id = l.id ORDER BY updated_at DESC LIMIT 1
  ) scn ON true
)
SELECT
  lead_id,
  COALESCE(NULLIF(first_name,'') || ' ' || NULLIF(last_name,''), email) AS borrower,
  CASE
    WHEN email IS NULL OR email = ''                                 THEN 'email'
    WHEN phone IS NULL OR phone = ''                                 THEN 'phone'
    WHEN loan_purpose IS NULL                                        THEN 'loan_purpose'
    WHEN loan_amount IS NULL                                         THEN 'loan_amount'
    WHEN property_value IS NULL                                      THEN 'property_value'
    WHEN occupancy_type IS NULL                                      THEN 'occupancy_type (mortgage_profile missing or unset)'
    WHEN assigned_to IS NULL                                         THEN 'assigned_to (no LO)'
    WHEN loan_officer_email IS NULL                                  THEN 'loan_officer_email (profile.email missing)'
    ELSE 'OK'
  END AS first_missing,
  loan_purpose,
  occupancy_type,
  COALESCE(lien_position, 'First Lien (default)') AS lien_position,
  loan_officer_email,
  created_at
FROM ctx
ORDER BY created_at DESC
LIMIT 100;