
-- Tighten the anon lead creation policy to require first_name and last_name
DROP POLICY "Anon can create leads via web form" ON public.leads;
CREATE POLICY "Anon can create leads via web form" ON public.leads FOR INSERT TO anon
  WITH CHECK (
    first_name IS NOT NULL AND
    last_name IS NOT NULL AND
    assigned_to IS NULL AND
    created_by IS NULL
  );
