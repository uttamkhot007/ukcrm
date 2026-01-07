-- AI-powered Tender Document Workspace table
CREATE TABLE public.tender_workspaces (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Workspace identification
    title TEXT NOT NULL,
    workspace_number TEXT,
    workspace_type TEXT NOT NULL DEFAULT 'rfp_spec', -- 'rfp_spec', 'rfp_response', 'technical_proposal'
    
    -- Related entities
    tender_id UUID REFERENCES public.tenders(id) ON DELETE SET NULL,
    solution_name TEXT,
    oem_name TEXT,
    customer_name TEXT,
    
    -- Document content
    requirements_text TEXT, -- Uploaded/parsed specs content
    generated_content JSONB, -- AI generated content sections
    final_content TEXT, -- Final document content
    
    -- Configuration
    selected_ai_model TEXT DEFAULT 'google/gemini-2.5-flash',
    include_branding BOOLEAN DEFAULT true,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'generating', 'review', 'approved', 'exported'
    progress_percent INTEGER DEFAULT 0,
    
    -- File references
    source_file_name TEXT,
    exported_format TEXT, -- 'docx', 'xlsx', 'pdf'
    
    -- Metadata
    created_by UUID NOT NULL,
    assigned_to UUID,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tender_workspaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies using tenant_members table
CREATE POLICY "Users can view tender workspaces in their tenant"
ON public.tender_workspaces FOR SELECT
USING (
    tenant_id IN (
        SELECT tm.tenant_id FROM public.tenant_members tm 
        WHERE tm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create tender workspaces in their tenant"
ON public.tender_workspaces FOR INSERT
WITH CHECK (
    tenant_id IN (
        SELECT tm.tenant_id FROM public.tenant_members tm 
        WHERE tm.user_id = auth.uid()
    )
    AND created_by = auth.uid()
);

CREATE POLICY "Users can update tender workspaces in their tenant"
ON public.tender_workspaces FOR UPDATE
USING (
    tenant_id IN (
        SELECT tm.tenant_id FROM public.tenant_members tm 
        WHERE tm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete tender workspaces they created"
ON public.tender_workspaces FOR DELETE
USING (
    created_by = auth.uid()
);

-- Trigger for updated_at
CREATE TRIGGER update_tender_workspaces_updated_at
BEFORE UPDATE ON public.tender_workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Workspace sections for granular AI generation
CREATE TABLE public.tender_workspace_sections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.tender_workspaces(id) ON DELETE CASCADE,
    
    section_type TEXT NOT NULL,
    section_title TEXT NOT NULL,
    section_order INTEGER NOT NULL DEFAULT 0,
    
    -- Content
    requirement_text TEXT,
    ai_response TEXT,
    edited_content TEXT,
    is_ai_generated BOOLEAN DEFAULT false,
    
    -- Status
    status TEXT DEFAULT 'pending',
    compliance_status TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tender_workspace_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sections
CREATE POLICY "Users can view workspace sections"
ON public.tender_workspace_sections FOR SELECT
USING (
    workspace_id IN (
        SELECT tw.id FROM public.tender_workspaces tw
        WHERE tw.tenant_id IN (
            SELECT tm.tenant_id FROM public.tenant_members tm 
            WHERE tm.user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can create workspace sections"
ON public.tender_workspace_sections FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT tw.id FROM public.tender_workspaces tw
        WHERE tw.tenant_id IN (
            SELECT tm.tenant_id FROM public.tenant_members tm 
            WHERE tm.user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update workspace sections"
ON public.tender_workspace_sections FOR UPDATE
USING (
    workspace_id IN (
        SELECT tw.id FROM public.tender_workspaces tw
        WHERE tw.tenant_id IN (
            SELECT tm.tenant_id FROM public.tenant_members tm 
            WHERE tm.user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can delete workspace sections"
ON public.tender_workspace_sections FOR DELETE
USING (
    workspace_id IN (
        SELECT tw.id FROM public.tender_workspaces tw
        WHERE tw.tenant_id IN (
            SELECT tm.tenant_id FROM public.tenant_members tm 
            WHERE tm.user_id = auth.uid()
        )
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_tender_workspace_sections_updated_at
BEFORE UPDATE ON public.tender_workspace_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();