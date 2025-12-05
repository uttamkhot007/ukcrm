-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create enum for legal document types
CREATE TYPE public.legal_document_type AS ENUM ('contract', 'nda', 'agreement', 'policy', 'compliance');

-- Create enum for legal document status
CREATE TYPE public.legal_document_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'revision_needed');

-- Create legal_documents table
CREATE TABLE public.legal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type legal_document_type NOT NULL DEFAULT 'contract',
  status legal_document_status NOT NULL DEFAULT 'draft',
  file_url TEXT,
  file_name TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create legal_document_comments table
CREATE TABLE public.legal_document_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'comment' CHECK (comment_type IN ('comment', 'suggestion', 'approval', 'rejection')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create legal_document_approvals table
CREATE TABLE public.legal_document_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'revision_requested')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_document_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for legal_documents
CREATE POLICY "Users can view all legal documents"
ON public.legal_documents FOR SELECT USING (true);

CREATE POLICY "Users can create legal documents"
ON public.legal_documents FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators and admins can update documents"
ON public.legal_documents FOR UPDATE USING (
  auth.uid() = created_by OR auth.uid() = assigned_to
  OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Creators and admins can delete documents"
ON public.legal_documents FOR DELETE USING (
  auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for legal_document_comments
CREATE POLICY "Users can view all comments"
ON public.legal_document_comments FOR SELECT USING (true);

CREATE POLICY "Users can create comments"
ON public.legal_document_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.legal_document_comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.legal_document_comments FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for legal_document_approvals
CREATE POLICY "Users can view all approvals"
ON public.legal_document_approvals FOR SELECT USING (true);

CREATE POLICY "Managers and admins can create approvals"
ON public.legal_document_approvals FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_legal_documents_updated_at
BEFORE UPDATE ON public.legal_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_legal_documents_status ON public.legal_documents(status);
CREATE INDEX idx_legal_documents_type ON public.legal_documents(type);
CREATE INDEX idx_legal_documents_created_by ON public.legal_documents(created_by);
CREATE INDEX idx_legal_document_comments_document_id ON public.legal_document_comments(document_id);
CREATE INDEX idx_legal_document_approvals_document_id ON public.legal_document_approvals(document_id);