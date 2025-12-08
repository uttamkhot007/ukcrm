-- Create employee verifications table
CREATE TABLE public.employee_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('background', 'crime', 'education')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'verified', 'failed', 'requires_review')),
  verification_date TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  notes TEXT,
  ai_analysis JSONB,
  extracted_data JSONB,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create verification documents table
CREATE TABLE public.verification_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_id UUID REFERENCES public.employee_verifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  ai_extracted_data JSONB,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

-- Policies for employee_verifications
CREATE POLICY "Users can view verifications in their tenant"
  ON public.employee_verifications FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "HR/Admin can manage verifications"
  ON public.employee_verifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND tenant_id = employee_verifications.tenant_id
      AND (department IN ('HR', 'Admin', 'Management') OR is_super_admin = true)
    )
  );

-- Policies for verification_documents
CREATE POLICY "Users can view verification documents in their tenant"
  ON public.verification_documents FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "HR/Admin can manage verification documents"
  ON public.verification_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND tenant_id = verification_documents.tenant_id
      AND (department IN ('HR', 'Admin', 'Management') OR is_super_admin = true)
    )
  );

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('verification-documents', 'verification-documents', false, 20971520);

-- Storage policies
CREATE POLICY "Users can view their tenant verification documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-documents' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "HR/Admin can upload verification documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (department IN ('HR', 'Admin', 'Management') OR is_super_admin = true)
    )
  );

CREATE POLICY "HR/Admin can delete verification documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'verification-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (department IN ('HR', 'Admin', 'Management') OR is_super_admin = true)
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_employee_verifications_updated_at
  BEFORE UPDATE ON public.employee_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();