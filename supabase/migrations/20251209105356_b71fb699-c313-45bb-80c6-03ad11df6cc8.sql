-- Add customer environment fields to alliance_organizations
ALTER TABLE public.alliance_organizations 
ADD COLUMN IF NOT EXISTS customer_environment JSONB DEFAULT '{}';

-- Add document templates table for POC/Implementation Plans, Invoices, Quotes
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('poc_plan', 'implementation_plan', 'invoice', 'quote', 'proposal')),
  content JSONB NOT NULL DEFAULT '{}',
  header_content JSONB DEFAULT '{}',
  footer_content JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  version TEXT DEFAULT '1.0',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_templates
CREATE POLICY "Users can view templates in their tenant"
ON public.document_templates FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Users can create templates in their tenant"
ON public.document_templates FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Users can update templates in their tenant"
ON public.document_templates FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Users can delete templates in their tenant"
ON public.document_templates FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_document_templates_tenant_type ON public.document_templates(tenant_id, template_type);
CREATE INDEX IF NOT EXISTS idx_document_templates_default ON public.document_templates(tenant_id, is_default) WHERE is_default = true;

-- Trigger for updated_at
CREATE TRIGGER update_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();