CREATE OR REPLACE FUNCTION public.crm_format_option_label(_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cleaned text;
  part text;
  result text := '';
  acronyms text[] := ARRAY['FHA','VA','USDA','HELOC','DTI','LTV','APR','PMI','MIP','ARM','LLC','SSN','EIN','ID','US','USA','LOS','CRM','AI','P&L'];
BEGIN
  IF _raw IS NULL THEN
    RETURN '';
  END IF;
  cleaned := btrim(regexp_replace(_raw, '[_-]+', ' ', 'g'));
  IF cleaned = '' THEN
    RETURN '';
  END IF;

  FOREACH part IN ARRAY regexp_split_to_array(cleaned, '\s+') LOOP
    IF upper(part) = ANY(acronyms) THEN
      result := result || CASE WHEN result = '' THEN '' ELSE ' ' END || upper(part);
    ELSE
      result := result || CASE WHEN result = '' THEN '' ELSE ' ' END || upper(left(part, 1)) || lower(substr(part, 2));
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_field_options_format_label_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.label := public.crm_format_option_label(COALESCE(NULLIF(NEW.label, ''), NEW.value));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_field_options_format_label ON public.crm_field_options;
CREATE TRIGGER trg_crm_field_options_format_label
BEFORE INSERT OR UPDATE OF label, value ON public.crm_field_options
FOR EACH ROW EXECUTE FUNCTION public.crm_field_options_format_label_trigger();

UPDATE public.crm_field_options
SET label = public.crm_format_option_label(COALESCE(NULLIF(label, ''), value));

DO $$
DECLARE
  leads_id uuid;
  contacts_id uuid;
  opportunities_id uuid;
  companies_id uuid;
  deals_id uuid;
  section_id uuid;
  field_id uuid;
BEGIN
  INSERT INTO public.crm_modules (slug, label, icon, description, sort_order, active)
  VALUES ('deals', 'Deals', 'trending-up', 'Mortgage deal records and pipeline details', 65, true)
  ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon, description = EXCLUDED.description, active = true;

  SELECT id INTO leads_id FROM public.crm_modules WHERE slug = 'leads';
  SELECT id INTO contacts_id FROM public.crm_modules WHERE slug = 'contacts';
  SELECT id INTO opportunities_id FROM public.crm_modules WHERE slug = 'opportunities';
  SELECT id INTO companies_id FROM public.crm_modules WHERE slug = 'companies';
  SELECT id INTO deals_id FROM public.crm_modules WHERE slug = 'deals';

  INSERT INTO public.crm_sections (module_id, slug, label, sort_order, is_system)
  VALUES
    (leads_id, 'identity', 'Identity', 10, true),
    (leads_id, 'mortgage', 'Mortgage Snapshot', 20, true),
    (leads_id, 'source', 'Source & Status', 30, true),
    (contacts_id, 'identity', 'Identity', 10, true),
    (contacts_id, 'contact', 'Contact Details', 20, true),
    (contacts_id, 'relationship', 'Relationship', 30, true),
    (opportunities_id, 'pipeline', 'Pipeline', 10, true),
    (opportunities_id, 'property', 'Property & Loan', 20, true),
    (companies_id, 'company', 'Company Details', 10, true),
    (companies_id, 'contact', 'Contact Details', 20, true),
    (deals_id, 'loan', 'Loan Details', 10, true),
    (deals_id, 'pipeline', 'Pipeline', 20, true)
  ON CONFLICT (module_id, slug) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, is_system = EXCLUDED.is_system;

  SELECT id INTO section_id FROM public.crm_sections WHERE module_id = leads_id AND slug = 'identity';
  INSERT INTO public.crm_fields (module_id, section_id, internal_name, label, field_type, sort_order, is_system, active, required)
  VALUES
    (leads_id, section_id, 'first_name', 'First Name', 'text', 10, true, true, true),
    (leads_id, section_id, 'last_name', 'Last Name', 'text', 20, true, true, true),
    (leads_id, section_id, 'email', 'Email', 'email', 30, true, true, false),
    (leads_id, section_id, 'phone', 'Phone', 'phone', 40, true, true, false),
    (leads_id, section_id, 'name', 'Full Name', 'text', 50, true, true, false)
  ON CONFLICT (module_id, internal_name) DO UPDATE SET section_id = EXCLUDED.section_id, label = EXCLUDED.label, field_type = EXCLUDED.field_type, sort_order = EXCLUDED.sort_order, is_system = true, active = true;

  SELECT id INTO section_id FROM public.crm_sections WHERE module_id = leads_id AND slug = 'mortgage';
  INSERT INTO public.crm_fields (module_id, section_id, internal_name, label, field_type, sort_order, is_system, active)
  VALUES
    (leads_id, section_id, 'loan_purpose', 'Loan Purpose', 'dropdown', 10, true, true),
    (leads_id, section_id, 'property_type', 'Property Type', 'dropdown', 20, true, true),
    (leads_id, section_id, 'property_value', 'Property Value', 'currency', 30, true, true),
    (leads_id, section_id, 'credit_range', 'Credit Range', 'dropdown', 40, true, true),
    (leads_id, section_id, 'employment_type', 'Employment Type', 'dropdown', 50, true, true),
    (leads_id, section_id, 'annual_income', 'Annual Income', 'currency', 60, true, true),
    (leads_id, section_id, 'timeline', 'Timeline', 'dropdown', 70, true, true),
    (leads_id, section_id, 'property_address', 'Property Address', 'address', 80, true, true),
    (leads_id, section_id, 'lien_position', 'Lien Position', 'dropdown', 90, true, true),
    (leads_id, section_id, 'transaction_type', 'Transaction Type', 'dropdown', 100, true, true)
  ON CONFLICT (module_id, internal_name) DO UPDATE SET section_id = EXCLUDED.section_id, label = EXCLUDED.label, field_type = EXCLUDED.field_type, sort_order = EXCLUDED.sort_order, is_system = true, active = true;

  SELECT id INTO section_id FROM public.crm_sections WHERE module_id = leads_id AND slug = 'source';
  INSERT INTO public.crm_fields (module_id, section_id, internal_name, label, field_type, sort_order, is_system, active)
  VALUES
    (leads_id, section_id, 'status', 'Status', 'dropdown', 10, true, true),
    (leads_id, section_id, 'source', 'Source', 'dropdown', 20, true, true),
    (leads_id, section_id, 'intent_tag', 'Intent Tag', 'dropdown', 30, true, true),
    (leads_id, section_id, 'lead_score', 'Lead Score', 'number', 40, true, true),
    (leads_id, section_id, 'los_sync_status', 'LOS Sync Status', 'dropdown', 50, true, true),
    (leads_id, section_id, 'los_application_id', 'LOS Application ID', 'text', 60, true, true),
    (leads_id, section_id, 'notes', 'Notes', 'textarea', 70, true, true)
  ON CONFLICT (module_id, internal_name) DO UPDATE SET section_id = EXCLUDED.section_id, label = EXCLUDED.label, field_type = EXCLUDED.field_type, sort_order = EXCLUDED.sort_order, is_system = true, active = true;

  SELECT id INTO section_id FROM public.crm_sections WHERE module_id = contacts_id AND slug = 'identity';
  INSERT INTO public.crm_fields (module_id, section_id, internal_name, label, field_type, sort_order, is_system, active)
  VALUES
    (contacts_id, section_id, 'first_name', 'First Name', 'text', 10, true, true),
    (contacts_id, section_id, 'middle_name', 'Middle Name', 'text', 20, true, true),
    (contacts_id, section_id, 'last_name', 'Last Name', 'text', 30, true, true),
    (contacts_id, section_id, 'contact_type', 'Contact Type', 'dropdown', 40, true, true),
    (contacts_id, section_id, 'role', 'Role', 'dropdown', 50, true, true),
    (contacts_id, section_id, 'borrower_type', 'Borrower Type', 'dropdown', 60, true, true)
  ON CONFLICT (module_id, internal_name) DO UPDATE SET section_id = EXCLUDED.section_id, label = EXCLUDED.label, field_type = EXCLUDED.field_type, sort_order = EXCLUDED.sort_order, is_system = true, active = true;

  SELECT id INTO section_id FROM public.crm_sections WHERE module_id = contacts_id AND slug = 'contact';
  INSERT INTO public.crm_fields (module_id, section_id, internal_name, label, field_type, sort_order, is_system, active)
  VALUES
    (contacts_id, section_id, 'email', 'Email', 'email', 10, true, true),
    (contacts_id, section_id, 'phone', 'Phone', 'phone', 20, true, true),
    (contacts_id, section_id, 'address', 'Address', 'address', 30, true, true),
    (contacts_id, section_id, 'license_number', 'License Number', 'text', 40, true, true),
    (contacts_id, section_id, 'notes', 'Notes', 'textarea', 50, true, true)
  ON CONFLICT (module_id, internal_name) DO UPDATE SET section_id = EXCLUDED.section_id, label = EXCLUDED.label, field_type = EXCLUDED.field_type, sort_order = EXCLUDED.sort_order, is_system = true, active = true;

  SELECT id INTO section_id FROM public.crm_sections WHERE module_id = contacts_id AND slug = 'relationship';
  INSERT INTO public.crm_fields (module_id, section_id, internal_name, label, field_type, sort_order, is_system, active)
  VALUES
    (contacts_id, section_id, 'company_id', 'Company', 'text', 10, true, true),
    (contacts_id, section_id, 'job_title', 'Job Title', 'text', 20, true, true),
    (contacts_id, section_id, 'temperature', 'Temperature', 'dropdown', 30, true, true),
    (contacts_id, section_id, 'lead_score', 'Lead Score', 'number', 40, true, true)
  ON CONFLICT (module_id, internal_name) DO UPDATE SET section_id = EXCLUDED.section_id, label = EXCLUDED.label, field_type = EXCLUDED.field_type, sort_order = EXCLUDED.sort_order, is_system = true, active = true;

  SELECT id INTO section_id FROM public.crm_sections WHERE module_id = opportunities_id AND slug = 'pipeline';
  INSERT INTO public.crm_fields (module_id, section_id, internal_name, label, field_type, sort_order, is_system, active)
  VALUES
    (opportunities_id, section_id, 'stage', 'Stage', 'dropdown', 10, true, true),
    (opportunities_id, section_id, 'loan_amount', 'Loan Amount', 'currency', 20, true, true),
    (opportunities_id, section_id, 'arive_loan_id', 'ARIVE Loan ID', 'text', 30, true, true),
    (opportunities_id, section_id, 'notes', 'Notes', 'textarea', 40, true, true)
  ON CONFLICT (module_id, internal_name) DO UPDATE SET section_id = EXCLUDED.section_id, label = EXCLUDED.label, field_type = EXCLUDED.field_type, sort_order = EXCLUDED.sort_order, is_system = true, active = true;

  SELECT id INTO section_id FROM public.crm_sections WHERE module_id = opportunities_id AND slug = 'property';
  INSERT INTO public.crm_fields (module_id, section_id, internal_name, label, field_type, sort_order, is_system, active)
  VALUES
    (opportunities_id, section_id, 'property_address', 'Property Address', 'address', 10, true, true),
    (opportunities_id, section_id, 'property_value', 'Property Value', 'currency', 20, true, true),
    (opportunities_id, section_id, 'down_payment', 'Down Payment', 'currency', 30, true, true)
  ON CONFLICT (module_id, internal_name) DO UPDATE SET section_id = EXCLUDED.section_id, label = EXCLUDED.label, field_type = EXCLUDED.field_type, sort_order = EXCLUDED.sort_order, is_system = true, active = true;

  SELECT id INTO section_id FROM public.crm_sections WHERE module_id = companies_id AND slug = 'company';
  INSERT INTO public.crm_fields (module_id, section_id, internal_name, label, field_type, sort_order, is_system, active)
  VALUES
    (companies_id, section_id, 'name', 'Company Name', 'text', 10, true, true),
    (companies_id, section_id, 'company_type', 'Company Type', 'dropdown', 20, true, true),
    (companies_id, section_id, 'industry', 'Industry', 'text', 30, true, true),
    (companies_id, section_id, 'domain', 'Domain', 'url', 40, true, true),
    (companies_id, section_id, 'website', 'Website', 'url', 50, true, true),
    (companies_id, section_id, 'is_self_employed', 'Self-Employed', 'checkbox', 60, true, true),
    (companies_id, section_id, 'notes', 'Notes', 'textarea', 70, true, true)
  ON CONFLICT (module_id, internal_name) DO UPDATE SET section_id = EXCLUDED.section_id, label = EXCLUDED.label, field_type = EXCLUDED.field_type, sort_order = EXCLUDED.sort_order, is_system = true, active = true;

  SELECT id INTO section_id FROM public.crm_sections WHERE module_id = companies_id AND slug = 'contact';
  INSERT INTO public.crm_fields (module_id, section_id, internal_name, label, field_type, sort_order, is_system, active)
  VALUES
    (companies_id, section_id, 'phone', 'Phone', 'phone', 10, true, true),
    (companies_id, section_id, 'address', 'Address', 'address', 20, true, true),
    (companies_id, section_id, 'employer_contact_name', 'Employer Contact Name', 'text', 30, true, true),
    (companies_id, section_id, 'employer_contact_phone', 'Employer Contact Phone', 'phone', 40, true, true),
    (companies_id, section_id, 'license_number', 'License Number', 'text', 50, true, true)
  ON CONFLICT (module_id, internal_name) DO UPDATE SET section_id = EXCLUDED.section_id, label = EXCLUDED.label, field_type = EXCLUDED.field_type, sort_order = EXCLUDED.sort_order, is_system = true, active = true;

  SELECT id INTO section_id FROM public.crm_sections WHERE module_id = deals_id AND slug = 'loan';
  INSERT INTO public.crm_fields (module_id, section_id, internal_name, label, field_type, sort_order, is_system, active)
  VALUES
    (deals_id, section_id, 'loan_type', 'Loan Type', 'dropdown', 10, true, true),
    (deals_id, section_id, 'loan_amount', 'Loan Amount', 'currency', 20, true, true),
    (deals_id, section_id, 'property_address', 'Property Address', 'address', 30, true, true),
    (deals_id, section_id, 'notes', 'Notes', 'textarea', 40, true, true)
  ON CONFLICT (module_id, internal_name) DO UPDATE SET section_id = EXCLUDED.section_id, label = EXCLUDED.label, field_type = EXCLUDED.field_type, sort_order = EXCLUDED.sort_order, is_system = true, active = true;

  SELECT id INTO section_id FROM public.crm_sections WHERE module_id = deals_id AND slug = 'pipeline';
  INSERT INTO public.crm_fields (module_id, section_id, internal_name, label, field_type, sort_order, is_system, active)
  VALUES
    (deals_id, section_id, 'stage', 'Stage', 'dropdown', 10, true, true)
  ON CONFLICT (module_id, internal_name) DO UPDATE SET section_id = EXCLUDED.section_id, label = EXCLUDED.label, field_type = EXCLUDED.field_type, sort_order = EXCLUDED.sort_order, is_system = true, active = true;

  FOR field_id IN SELECT id FROM public.crm_fields WHERE module_id = leads_id AND internal_name = 'loan_purpose' LOOP
    INSERT INTO public.crm_field_options (field_id, value, label, sort_order) VALUES
      (field_id, 'purchase', 'Purchase', 10), (field_id, 'refinance', 'Refinance', 20), (field_id, 'cash_out_refi', 'Cash Out Refi', 30), (field_id, 'heloc', 'HELOC', 40)
    ON CONFLICT DO NOTHING;
  END LOOP;
  FOR field_id IN SELECT id FROM public.crm_fields WHERE module_id = leads_id AND internal_name = 'property_type' LOOP
    INSERT INTO public.crm_field_options (field_id, value, label, sort_order) VALUES
      (field_id, 'single_family', 'Single Family', 10), (field_id, 'condo', 'Condo', 20), (field_id, 'townhome', 'Townhome', 30), (field_id, 'multi_unit', 'Multi Unit', 40), (field_id, 'mobile', 'Mobile', 50)
    ON CONFLICT DO NOTHING;
  END LOOP;
  FOR field_id IN SELECT id FROM public.crm_fields WHERE module_id = leads_id AND internal_name = 'credit_range' LOOP
    INSERT INTO public.crm_field_options (field_id, value, label, sort_order) VALUES
      (field_id, 'excellent', 'Excellent', 10), (field_id, 'good', 'Good', 20), (field_id, 'fair', 'Fair', 30), (field_id, 'needs_work', 'Needs Work', 40)
    ON CONFLICT DO NOTHING;
  END LOOP;
  FOR field_id IN SELECT id FROM public.crm_fields WHERE module_id = leads_id AND internal_name = 'source' LOOP
    INSERT INTO public.crm_field_options (field_id, value, label, sort_order) VALUES
      (field_id, 'realtor', 'Realtor', 10), (field_id, 'manual', 'Manual', 20), (field_id, 'other', 'Other', 30), (field_id, 'referral', 'Referral', 40), (field_id, 'website', 'Website', 50)
    ON CONFLICT DO NOTHING;
  END LOOP;
  FOR field_id IN SELECT id FROM public.crm_fields WHERE module_id = leads_id AND internal_name = 'status' LOOP
    INSERT INTO public.crm_field_options (field_id, value, label, sort_order) VALUES
      (field_id, 'new_lead', 'New Lead', 10), (field_id, 'contacted', 'Contacted', 20), (field_id, 'qualified', 'Qualified', 30), (field_id, 'unqualified', 'Unqualified', 40), (field_id, 'converted', 'Converted', 50), (field_id, 'lost', 'Lost', 60)
    ON CONFLICT DO NOTHING;
  END LOOP;
  FOR field_id IN SELECT id FROM public.crm_fields WHERE module_id = leads_id AND internal_name = 'timeline' LOOP
    INSERT INTO public.crm_field_options (field_id, value, label, sort_order) VALUES
      (field_id, 'immediately', 'Immediately', 10), (field_id, '1_3_months', '1 3 Months', 20), (field_id, '3_6_months', '3 6 Months', 30), (field_id, 'just_browsing', 'Just Browsing', 40)
    ON CONFLICT DO NOTHING;
  END LOOP;
  FOR field_id IN SELECT id FROM public.crm_fields WHERE module_id IN (opportunities_id, deals_id) AND internal_name = 'stage' LOOP
    INSERT INTO public.crm_field_options (field_id, value, label, sort_order) VALUES
      (field_id, 'application_sent', 'Application Sent', 10), (field_id, 'underwriting', 'Underwriting', 20), (field_id, 'approved', 'Approved', 30), (field_id, 'clear_to_close', 'Clear To Close', 40), (field_id, 'closed', 'Closed', 50), (field_id, 'lost', 'Lost', 60), (field_id, 'new_lead', 'New Lead', 70), (field_id, 'contacted', 'Contacted', 80), (field_id, 'docs_received', 'Docs Received', 90)
    ON CONFLICT DO NOTHING;
  END LOOP;
  FOR field_id IN SELECT id FROM public.crm_fields WHERE module_id = deals_id AND internal_name = 'loan_type' LOOP
    INSERT INTO public.crm_field_options (field_id, value, label, sort_order) VALUES
      (field_id, 'conventional', 'Conventional', 10), (field_id, 'fha', 'FHA', 20), (field_id, 'usda', 'USDA', 30), (field_id, 'va', 'VA', 40)
    ON CONFLICT DO NOTHING;
  END LOOP;
  FOR field_id IN SELECT id FROM public.crm_fields WHERE module_id = contacts_id AND internal_name = 'role' LOOP
    INSERT INTO public.crm_field_options (field_id, value, label, sort_order) VALUES
      (field_id, 'lead', 'Lead', 10), (field_id, 'borrower', 'Borrower', 20), (field_id, 'co_borrower', 'Co Borrower', 30), (field_id, 'real_estate_agent', 'Real Estate Agent', 40), (field_id, 'title_agent', 'Title Agent', 50), (field_id, 'insurance_agent', 'Insurance Agent', 60), (field_id, 'referral_partner', 'Referral Partner', 70), (field_id, 'internal_staff', 'Internal Staff', 80)
    ON CONFLICT DO NOTHING;
  END LOOP;
  FOR field_id IN SELECT id FROM public.crm_fields WHERE module_id = contacts_id AND internal_name IN ('contact_type', 'borrower_type') LOOP
    INSERT INTO public.crm_field_options (field_id, value, label, sort_order) VALUES
      (field_id, 'borrower', 'Borrower', 10), (field_id, 'partner', 'Partner', 20), (field_id, 'other', 'Other', 30), (field_id, 'employee', 'Employee', 40), (field_id, 'self_employed', 'Self Employed', 50)
    ON CONFLICT DO NOTHING;
  END LOOP;
  FOR field_id IN SELECT id FROM public.crm_fields WHERE module_id = companies_id AND internal_name = 'company_type' LOOP
    INSERT INTO public.crm_field_options (field_id, value, label, sort_order) VALUES
      (field_id, 'employer', 'Employer', 10), (field_id, 'realtor', 'Realtor', 20), (field_id, 'title', 'Title', 30), (field_id, 'insurance', 'Insurance', 40), (field_id, 'lender', 'Lender', 50), (field_id, 'other', 'Other', 60)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;