-- Create Cynet licenses table for tracking license usage and procurement
CREATE TABLE public.cynet_licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  cynet_id TEXT NOT NULL,
  site_name TEXT NOT NULL,
  status TEXT DEFAULT 'Active',
  billing_type TEXT,
  total_groups INTEGER DEFAULT 0,
  endpoints_used INTEGER DEFAULT 0,
  procured_licenses INTEGER DEFAULT 0,
  assigned_endpoints INTEGER DEFAULT 0,
  clm_retention TEXT,
  monthly_data_ingestion NUMERIC DEFAULT 0,
  parent_name TEXT,
  parent_cynet_id TEXT,
  hierarchy_path TEXT,
  integrations_count INTEGER DEFAULT 0,
  integrations_info TEXT,
  organization_id UUID REFERENCES public.alliance_organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.cynet_licenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view cynet licenses in their tenant"
ON public.cynet_licenses FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert cynet licenses in their tenant"
ON public.cynet_licenses FOR INSERT
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update cynet licenses in their tenant"
ON public.cynet_licenses FOR UPDATE
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can delete cynet licenses in their tenant"
ON public.cynet_licenses FOR DELETE
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
));

-- Create index for faster lookups
CREATE INDEX idx_cynet_licenses_tenant ON public.cynet_licenses(tenant_id);
CREATE INDEX idx_cynet_licenses_cynet_id ON public.cynet_licenses(cynet_id);
CREATE INDEX idx_cynet_licenses_organization ON public.cynet_licenses(organization_id);

-- Trigger for updated_at
CREATE TRIGGER update_cynet_licenses_updated_at
BEFORE UPDATE ON public.cynet_licenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();