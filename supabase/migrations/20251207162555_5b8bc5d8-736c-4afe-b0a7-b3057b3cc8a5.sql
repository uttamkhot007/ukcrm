-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  project_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  project_type TEXT,
  start_date DATE,
  end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  budget DECIMAL(12,2),
  spent_amount DECIMAL(12,2) DEFAULT 0,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  project_manager_id UUID,
  client_name TEXT,
  deal_id UUID REFERENCES public.deals(id),
  tags TEXT[],
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project members table
CREATE TABLE public.project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  allocation_percentage INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project tasks table
CREATE TABLE public.project_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES public.project_tasks(id),
  task_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID,
  due_date DATE,
  estimated_hours DECIMAL(6,2),
  actual_hours DECIMAL(6,2),
  start_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project milestones table
CREATE TABLE public.project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project time entries table
CREATE TABLE public.project_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  description TEXT,
  is_billable BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_time_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Users can view projects in their tenant" ON public.projects
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id) OR tenant_id IS NULL);

CREATE POLICY "Users can create projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Project managers and admins can update projects" ON public.projects
  FOR UPDATE USING (
    auth.uid() = project_manager_id OR 
    auth.uid() = created_by OR 
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admins can delete projects" ON public.projects
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for project_members
CREATE POLICY "Users can view project members" ON public.project_members
  FOR SELECT USING (true);

CREATE POLICY "Project managers can manage members" ON public.project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_members.project_id 
      AND (p.project_manager_id = auth.uid() OR p.created_by = auth.uid())
    ) OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS policies for project_tasks
CREATE POLICY "Users can view tasks in their projects" ON public.project_tasks
  FOR SELECT USING (true);

CREATE POLICY "Users can create tasks" ON public.project_tasks
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Assignees and creators can update tasks" ON public.project_tasks
  FOR UPDATE USING (
    auth.uid() = assigned_to OR 
    auth.uid() = created_by OR 
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete tasks" ON public.project_tasks
  FOR DELETE USING (
    auth.uid() = created_by OR 
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS policies for project_milestones
CREATE POLICY "Users can view milestones" ON public.project_milestones
  FOR SELECT USING (true);

CREATE POLICY "Users can manage milestones" ON public.project_milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_milestones.project_id 
      AND (p.project_manager_id = auth.uid() OR p.created_by = auth.uid())
    ) OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS policies for project_time_entries
CREATE POLICY "Users can view time entries" ON public.project_time_entries
  FOR SELECT USING (
    user_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Users can create their own time entries" ON public.project_time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries" ON public.project_time_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time entries" ON public.project_time_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Function to generate project number
CREATE OR REPLACE FUNCTION public.generate_project_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.project_number := 'PRJ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Trigger for project number generation
CREATE TRIGGER set_project_number
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_project_number();

-- Function to generate task number
CREATE OR REPLACE FUNCTION public.generate_task_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  project_prefix TEXT;
BEGIN
  SELECT SUBSTRING(project_number FROM 1 FOR 16) INTO project_prefix
  FROM projects WHERE id = NEW.project_id;
  
  NEW.task_number := COALESCE(project_prefix, 'TSK') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Trigger for task number generation
CREATE TRIGGER set_task_number
  BEFORE INSERT ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_task_number();