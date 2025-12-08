-- Create tender status enum
CREATE TYPE public.tender_status AS ENUM (
  'identified', 
  'evaluating', 
  'bid_preparation', 
  'submitted', 
  'under_evaluation', 
  'won', 
  'lost', 
  'cancelled'
);

-- Create tender source enum
CREATE TYPE public.tender_source AS ENUM (
  'government', 
  'private', 
  'psu', 
  'referral', 
  'portal', 
  'direct'
);

-- Create tenders table
CREATE TABLE public.tenders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tender_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  organization_name TEXT,
  source tender_source DEFAULT 'portal',
  status tender_status DEFAULT 'identified',
  estimated_value NUMERIC DEFAULT 0,
  emd_amount NUMERIC DEFAULT 0,
  emd_submitted BOOLEAN DEFAULT false,
  publish_date TIMESTAMPTZ,
  submission_deadline TIMESTAMPTZ,
  opening_date TIMESTAMPTZ,
  awarded_date TIMESTAMPTZ,
  tender_portal_url TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  category TEXT,
  eligibility_criteria TEXT,
  documents_required TEXT[],
  bid_security_required BOOLEAN DEFAULT false,
  technical_requirements TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id),
  deal_id UUID REFERENCES public.deals(id),
  contact_id UUID REFERENCES public.contacts(id),
  notes TEXT,
  loss_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tender documents table
CREATE TABLE public.tender_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tender team table for bid preparation
CREATE TABLE public.tender_team (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tender activities/history table
CREATE TABLE public.tender_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenders
CREATE POLICY "Users can view tenders in their tenant"
  ON public.tenders FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND status = 'active')
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users with sales access can create tenders"
  ON public.tenders FOR INSERT
  WITH CHECK (
    public.has_sales_access(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users with sales access can update tenders"
  ON public.tenders FOR UPDATE
  USING (
    public.has_sales_access(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can delete tenders"
  ON public.tenders FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  );

-- RLS policies for tender documents
CREATE POLICY "Users can view tender documents in their tenant"
  ON public.tender_documents FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND status = 'active')
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users with sales access can manage tender documents"
  ON public.tender_documents FOR ALL
  USING (
    public.has_sales_access(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- RLS policies for tender team
CREATE POLICY "Users can view tender team in their tenant"
  ON public.tender_team FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND status = 'active')
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users with sales access can manage tender team"
  ON public.tender_team FOR ALL
  USING (
    public.has_sales_access(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- RLS policies for tender activities
CREATE POLICY "Users can view tender activities in their tenant"
  ON public.tender_activities FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND status = 'active')
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can create tender activities"
  ON public.tender_activities FOR INSERT
  WITH CHECK (
    public.has_sales_access(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Create storage bucket for tender documents
INSERT INTO storage.buckets (id, name, public) VALUES ('tender-documents', 'tender-documents', false);

-- Storage policies
CREATE POLICY "Users can view tender documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tender-documents');

CREATE POLICY "Users with sales access can upload tender documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tender-documents' AND public.has_sales_access(auth.uid()));

CREATE POLICY "Users with sales access can delete tender documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'tender-documents' AND public.has_sales_access(auth.uid()));

-- Trigger for tender number generation
CREATE OR REPLACE FUNCTION public.generate_tender_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.tender_number := 'TND-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_tender_number
  BEFORE INSERT ON public.tenders
  FOR EACH ROW EXECUTE FUNCTION public.generate_tender_number();

-- Trigger for updated_at
CREATE TRIGGER update_tenders_updated_at
  BEFORE UPDATE ON public.tenders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();