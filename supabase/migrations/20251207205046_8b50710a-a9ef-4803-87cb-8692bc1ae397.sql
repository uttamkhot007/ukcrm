-- Create organization_notes table
CREATE TABLE public.organization_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.alliance_organizations(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'general',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_tasks table
CREATE TABLE public.organization_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.alliance_organizations(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  assigned_to UUID,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_meetings table
CREATE TABLE public.organization_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.alliance_organizations(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  meeting_type TEXT DEFAULT 'general',
  meeting_link TEXT,
  location TEXT,
  attendees UUID[] DEFAULT '{}',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_reminders table
CREATE TABLE public.organization_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.alliance_organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.alliance_users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reminder_type TEXT NOT NULL, -- 'birthday', 'meeting', 'renewal', 'follow_up', 'custom'
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly', 'yearly'
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.organization_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_notes
CREATE POLICY "Users can view notes in their tenant" ON public.organization_notes
  FOR SELECT USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can create notes" ON public.organization_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their notes" ON public.organization_notes
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their notes" ON public.organization_notes
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for organization_tasks
CREATE POLICY "Users can view tasks in their tenant" ON public.organization_tasks
  FOR SELECT USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can create tasks" ON public.organization_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update tasks" ON public.organization_tasks
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = assigned_to OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete tasks" ON public.organization_tasks
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for organization_meetings
CREATE POLICY "Users can view meetings in their tenant" ON public.organization_meetings
  FOR SELECT USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can create meetings" ON public.organization_meetings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update meetings" ON public.organization_meetings
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete meetings" ON public.organization_meetings
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for organization_reminders
CREATE POLICY "Users can view reminders in their tenant" ON public.organization_reminders
  FOR SELECT USING ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can create reminders" ON public.organization_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update reminders" ON public.organization_reminders
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete reminders" ON public.organization_reminders
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_organization_notes_org_id ON public.organization_notes(organization_id);
CREATE INDEX idx_organization_tasks_org_id ON public.organization_tasks(organization_id);
CREATE INDEX idx_organization_tasks_assigned ON public.organization_tasks(assigned_to);
CREATE INDEX idx_organization_meetings_org_id ON public.organization_meetings(organization_id);
CREATE INDEX idx_organization_meetings_scheduled ON public.organization_meetings(scheduled_at);
CREATE INDEX idx_organization_reminders_org_id ON public.organization_reminders(organization_id);
CREATE INDEX idx_organization_reminders_remind_at ON public.organization_reminders(remind_at);