-- Add enhanced fields to projects table for comprehensive project management
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.alliance_organizations(id),
ADD COLUMN IF NOT EXISTS project_category TEXT CHECK (project_category IN ('product', 'service', 'hybrid')),
ADD COLUMN IF NOT EXISTS scope_inclusions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS scope_exclusions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS ai_enriched_plan JSONB,
ADD COLUMN IF NOT EXISTS ai_analytics JSONB,
ADD COLUMN IF NOT EXISTS ai_documents JSONB,
ADD COLUMN IF NOT EXISTS duration_weeks INTEGER,
ADD COLUMN IF NOT EXISTS total_estimated_hours DECIMAL(10,2);

-- Create project phases table
CREATE TABLE IF NOT EXISTS public.project_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER,
  estimated_hours DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  deliverables JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, phase_number)
);

-- Create project stakeholders table (for both internal and customer side)
CREATE TABLE IF NOT EXISTS public.project_stakeholders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stakeholder_type TEXT NOT NULL CHECK (stakeholder_type IN ('internal', 'customer')),
  user_id UUID, -- Internal user
  contact_id UUID REFERENCES public.contacts(id), -- Customer contact
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL, -- Project Manager, Technical Lead, Sponsor, etc.
  designation TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RACI matrix table
CREATE TABLE IF NOT EXISTS public.project_raci (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.project_phases(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  responsible_id UUID REFERENCES public.project_stakeholders(id),
  accountable_id UUID REFERENCES public.project_stakeholders(id),
  consulted_ids UUID[] DEFAULT '{}',
  informed_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project products table (links products/services to projects)
CREATE TABLE IF NOT EXISTS public.project_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.product_catalog(id),
  product_type TEXT NOT NULL CHECK (product_type IN ('product', 'service')),
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2),
  configuration JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project documents table for AI-generated and uploaded documents
CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'charter', 'plan', 'sow', 'meeting_minutes', etc.
  title TEXT NOT NULL,
  content TEXT,
  is_ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  file_url TEXT,
  version INTEGER DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update project_tasks to link with phases
ALTER TABLE public.project_tasks 
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL;

-- Update project_milestones to link with phases
ALTER TABLE public.project_milestones 
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_raci ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_phases
CREATE POLICY "Users can view project phases" ON public.project_phases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "Project members can manage phases" ON public.project_phases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_id 
      AND (p.project_manager_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

-- RLS policies for project_stakeholders
CREATE POLICY "Users can view project stakeholders" ON public.project_stakeholders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "Project managers can manage stakeholders" ON public.project_stakeholders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_id 
      AND (p.project_manager_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

-- RLS policies for project_raci
CREATE POLICY "Users can view project RACI" ON public.project_raci
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "Project managers can manage RACI" ON public.project_raci
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_id 
      AND (p.project_manager_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

-- RLS policies for project_products
CREATE POLICY "Users can view project products" ON public.project_products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "Project managers can manage products" ON public.project_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_id 
      AND (p.project_manager_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

-- RLS policies for project_documents
CREATE POLICY "Users can view project documents" ON public.project_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "Authenticated users can manage documents" ON public.project_documents
  FOR ALL USING (auth.uid() = created_by);

-- Add update trigger for phases
CREATE TRIGGER update_project_phases_updated_at
  BEFORE UPDATE ON public.project_phases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add update trigger for RACI
CREATE TRIGGER update_project_raci_updated_at
  BEFORE UPDATE ON public.project_raci
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add update trigger for documents
CREATE TRIGGER update_project_documents_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();