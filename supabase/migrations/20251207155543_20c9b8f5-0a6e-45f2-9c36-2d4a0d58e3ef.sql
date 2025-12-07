-- Add additional profile fields for employee data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT,
ADD COLUMN IF NOT EXISTS hobbies TEXT[],
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create employee documents table for CVs, Certs, etc.
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'cv', 'certificate', 'id_proof', 'other'
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT,
  file_url TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- Employees can view and manage their own documents
CREATE POLICY "Employees can view their own documents"
ON public.employee_documents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Employees can upload their own documents"
ON public.employee_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employees can update their own documents"
ON public.employee_documents
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Employees can delete their own documents"
ON public.employee_documents
FOR DELETE
USING (auth.uid() = user_id);

-- HR and managers can view all documents in their tenant
CREATE POLICY "HR can view all documents in tenant"
ON public.employee_documents
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_team(auth.uid(), 'hr'::team_type)
);

-- HR can verify documents
CREATE POLICY "HR can update documents for verification"
ON public.employee_documents
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_team(auth.uid(), 'hr'::team_type)
);

-- Create storage bucket for employee documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for employee documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'employee-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'employee-documents' AND 
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_team(auth.uid(), 'hr'::team_type)
  )
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'employee-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);