-- Create support types table for organization-specific support plans
CREATE TABLE public.organization_support_types (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.alliance_organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('one_time', 'yearly')),
    tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond', 'custom')),
    description TEXT,
    response_hours INTEGER,
    resolution_hours INTEGER,
    is_active BOOLEAN DEFAULT true,
    custom_features JSONB DEFAULT '[]'::jsonb,
    price NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_support_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Staff can manage support types"
ON public.organization_support_types
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Customers can view support types for their org"
ON public.organization_support_types
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM customer_organization_access coa
    WHERE coa.user_id = auth.uid() AND coa.organization_id = organization_support_types.organization_id
));