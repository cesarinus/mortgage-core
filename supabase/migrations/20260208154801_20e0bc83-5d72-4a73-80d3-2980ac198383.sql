
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'loan_officer', 'processor');

-- 2. Create lead_status enum
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost');

-- 3. Create contact_type enum
CREATE TYPE public.contact_type AS ENUM ('borrower', 'partner', 'other');

-- 4. Create deal_stage enum
CREATE TYPE public.deal_stage AS ENUM (
  'new_lead', 'contacted', 'application_sent', 'docs_received',
  'underwriting', 'approved', 'clear_to_close', 'closed', 'lost'
);

-- 5. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 7. Lead sources reference table
CREATE TABLE public.lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- Seed default lead sources
INSERT INTO public.lead_sources (name) VALUES
  ('Referral'), ('Web Form'), ('Walk-in'), ('Phone'), ('Email'), ('Social Media'), ('Other');

-- 8. Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source_id UUID REFERENCES public.lead_sources(id),
  status lead_status NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 9. Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  contact_type contact_type NOT NULL DEFAULT 'borrower',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  lead_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- 10. Deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id),
  loan_officer_id UUID REFERENCES auth.users(id),
  loan_amount NUMERIC,
  loan_type TEXT,
  property_address TEXT,
  stage deal_stage NOT NULL DEFAULT 'new_lead',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- 11. Deal stage history (audit log)
CREATE TABLE public.deal_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  old_stage deal_stage,
  new_stage deal_stage NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY;

-- 12. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. Deal stage change trigger (auto-log history)
CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.deal_stage_history (deal_id, old_stage, new_stage, changed_by)
    VALUES (NEW.id, OLD.stage, NEW.stage, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_deal_stage_change
  AFTER UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.log_deal_stage_change();

-- 15. Security definer helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- 16. RLS Policies

-- profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- lead_sources
CREATE POLICY "Anyone can view lead sources" ON public.lead_sources FOR SELECT USING (true);
CREATE POLICY "Admins can manage lead sources" ON public.lead_sources FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- leads
CREATE POLICY "Admins can do anything with leads" ON public.leads FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view assigned/created leads" ON public.leads FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Authenticated users can create leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own leads" ON public.leads FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Users can delete own leads" ON public.leads FOR DELETE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "Anon can create leads via web form" ON public.leads FOR INSERT TO anon
  WITH CHECK (true);

-- contacts
CREATE POLICY "Admins can do anything with contacts" ON public.contacts FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "Authenticated users can create contacts" ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own contacts" ON public.contacts FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "Users can delete own contacts" ON public.contacts FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- deals
CREATE POLICY "Admins can do anything with deals" ON public.deals FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view own deals" ON public.deals FOR SELECT TO authenticated
  USING (loan_officer_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "LO can create deals" ON public.deals FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'loan_officer') OR public.is_admin(auth.uid()));
CREATE POLICY "Users can update own deals" ON public.deals FOR UPDATE TO authenticated
  USING (loan_officer_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Users can delete own deals" ON public.deals FOR DELETE TO authenticated
  USING (loan_officer_id = auth.uid() OR created_by = auth.uid());

-- deal_stage_history
CREATE POLICY "Admins can do anything with history" ON public.deal_stage_history FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view history for own deals" ON public.deal_stage_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.loan_officer_id = auth.uid() OR d.created_by = auth.uid())
  ));
CREATE POLICY "Users can insert history" ON public.deal_stage_history FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- Indexes for performance
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_created_by ON public.leads(created_by);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_contacts_created_by ON public.contacts(created_by);
CREATE INDEX idx_deals_loan_officer ON public.deals(loan_officer_id);
CREATE INDEX idx_deals_stage ON public.deals(stage);
CREATE INDEX idx_deals_contact ON public.deals(contact_id);
CREATE INDEX idx_deal_stage_history_deal ON public.deal_stage_history(deal_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
