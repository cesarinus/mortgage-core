
-- Mirror the Borrowers schema into Co-Borrowers so that shared applicant
-- templates have something to map onto. Sections are matched by slug;
-- fields are matched by their internal_name with the `borrower_` prefix
-- rewritten to `coborrower_`.

DO $$
DECLARE
  v_borrower_module uuid;
  v_coborrower_module uuid;
  v_src_section RECORD;
  v_new_section_id uuid;
  v_src_field RECORD;
  v_target_section_id uuid;
  v_target_internal text;
BEGIN
  SELECT id INTO v_borrower_module FROM public.crm_modules WHERE slug = 'borrowers';
  SELECT id INTO v_coborrower_module FROM public.crm_modules WHERE slug = 'co_borrowers';
  IF v_borrower_module IS NULL OR v_coborrower_module IS NULL THEN
    RAISE NOTICE 'Borrower or Co-Borrower module missing — skipping mirror.';
    RETURN;
  END IF;

  -- 1. Mirror sections by slug (idempotent).
  FOR v_src_section IN
    SELECT * FROM public.crm_sections WHERE module_id = v_borrower_module ORDER BY sort_order
  LOOP
    SELECT id INTO v_new_section_id
    FROM public.crm_sections
    WHERE module_id = v_coborrower_module AND slug = v_src_section.slug;

    IF v_new_section_id IS NULL THEN
      INSERT INTO public.crm_sections (module_id, slug, label, description, sort_order, hidden, is_system)
      VALUES (v_coborrower_module, v_src_section.slug, v_src_section.label, v_src_section.description,
              v_src_section.sort_order, v_src_section.hidden, v_src_section.is_system);
    END IF;
  END LOOP;

  -- 2. Mirror fields with prefix swap (idempotent by internal_name).
  FOR v_src_field IN
    SELECT f.*, s.slug AS section_slug
    FROM public.crm_fields f
    LEFT JOIN public.crm_sections s ON s.id = f.section_id
    WHERE f.module_id = v_borrower_module
    ORDER BY f.sort_order
  LOOP
    -- Determine target section by slug (may be NULL if source field had no section).
    v_target_section_id := NULL;
    IF v_src_field.section_slug IS NOT NULL THEN
      SELECT id INTO v_target_section_id
      FROM public.crm_sections
      WHERE module_id = v_coborrower_module AND slug = v_src_field.section_slug;
    END IF;

    -- Swap internal_name prefix borrower_ -> coborrower_; otherwise keep.
    IF v_src_field.internal_name LIKE 'borrower_%' THEN
      v_target_internal := 'coborrower_' || substring(v_src_field.internal_name FROM length('borrower_') + 1);
    ELSE
      v_target_internal := v_src_field.internal_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.crm_fields
      WHERE module_id = v_coborrower_module AND internal_name = v_target_internal
    ) THEN
      INSERT INTO public.crm_fields (
        module_id, section_id, internal_name, label, description, field_type,
        required, hidden, read_only, is_system, default_value, placeholder,
        validation, sort_order, active
      ) VALUES (
        v_coborrower_module, v_target_section_id, v_target_internal, v_src_field.label,
        v_src_field.description, v_src_field.field_type, v_src_field.required,
        v_src_field.hidden, v_src_field.read_only, v_src_field.is_system,
        v_src_field.default_value, v_src_field.placeholder, v_src_field.validation,
        v_src_field.sort_order, v_src_field.active
      );
    END IF;
  END LOOP;
END $$;
