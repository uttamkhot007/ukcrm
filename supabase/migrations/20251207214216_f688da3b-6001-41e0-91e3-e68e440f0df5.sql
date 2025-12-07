-- Create calendar events table for team calendars
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'meeting', -- meeting, demo, poc, training, follow_up, reminder
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  meeting_link TEXT,
  owner_id UUID NOT NULL,
  team_type TEXT, -- sales, presales, accounts, renewal, management
  related_deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  related_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  attendees UUID[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  reminder_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team reminders table
CREATE TABLE public.team_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reminder_type TEXT NOT NULL, -- deal_follow_up, payment_due, renewal_due, demo_scheduled, poc_deadline, training
  target_user_id UUID NOT NULL,
  target_team TEXT, -- sales, presales, accounts, renewal, management
  related_entity_type TEXT, -- deal, demo, poc, invoice, renewal
  related_entity_id UUID,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create presales stats tracking
CREATE TABLE public.presales_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  presales_member_id UUID NOT NULL,
  involvement_type TEXT NOT NULL, -- solution_design, demo, poc, technical_assessment, rfp_response
  status TEXT DEFAULT 'active', -- active, completed, on_hold
  outcome TEXT, -- success, partial, failed
  notes TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training calendar table
CREATE TABLE public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  trainer_id UUID,
  training_type TEXT NOT NULL, -- product, technical, sales, soft_skills, certification
  target_team TEXT, -- sales, presales, all
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  meeting_link TEXT,
  max_attendees INTEGER,
  status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  materials_url TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training registrations
CREATE TABLE public.training_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'registered', -- registered, attended, absent, cancelled
  feedback TEXT,
  rating INTEGER,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  attended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all new tables
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presales_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_events
CREATE POLICY "Users can view public events in their tenant" ON public.calendar_events
  FOR SELECT USING (
    (is_public = true AND (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id)))
    OR owner_id = auth.uid()
    OR auth.uid() = ANY(attendees)
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Users can create their own events" ON public.calendar_events
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own events" ON public.calendar_events
  FOR UPDATE USING (
    owner_id = auth.uid() 
    OR has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Users can delete their own events" ON public.calendar_events
  FOR DELETE USING (
    owner_id = auth.uid() 
    OR has_role(auth.uid(), 'admin')
  );

-- RLS Policies for team_reminders
CREATE POLICY "Users can view their reminders" ON public.team_reminders
  FOR SELECT USING (
    target_user_id = auth.uid()
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Users can create reminders" ON public.team_reminders
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their reminders" ON public.team_reminders
  FOR UPDATE USING (
    target_user_id = auth.uid()
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete reminders" ON public.team_reminders
  FOR DELETE USING (has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- RLS Policies for presales_opportunities
CREATE POLICY "Users can view presales opportunities in tenant" ON public.presales_opportunities
  FOR SELECT USING (
    (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id))
    AND (
      presales_member_id = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_team(auth.uid(), 'presales')
      OR has_team(auth.uid(), 'sales')
    )
  );

CREATE POLICY "Presales can create opportunities" ON public.presales_opportunities
  FOR INSERT WITH CHECK (
    has_team(auth.uid(), 'presales')
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Presales can update opportunities" ON public.presales_opportunities
  FOR UPDATE USING (
    presales_member_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins can delete opportunities" ON public.presales_opportunities
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for training_sessions
CREATE POLICY "Users can view training sessions in tenant" ON public.training_sessions
  FOR SELECT USING (
    (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id))
  );

CREATE POLICY "Admins and managers can create training" ON public.training_sessions
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can update training" ON public.training_sessions
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'manager')
    OR created_by = auth.uid()
  );

CREATE POLICY "Admins can delete training" ON public.training_sessions
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for training_registrations
CREATE POLICY "Users can view their registrations" ON public.training_registrations
  FOR SELECT USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Users can register for training" ON public.training_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their registration" ON public.training_registrations
  FOR UPDATE USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Users can cancel their registration" ON public.training_registrations
  FOR DELETE USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_reminders;

-- Create indexes for performance
CREATE INDEX idx_calendar_events_owner ON public.calendar_events(owner_id);
CREATE INDEX idx_calendar_events_team ON public.calendar_events(team_type);
CREATE INDEX idx_calendar_events_start ON public.calendar_events(start_time);
CREATE INDEX idx_team_reminders_target ON public.team_reminders(target_user_id);
CREATE INDEX idx_team_reminders_due ON public.team_reminders(due_date);
CREATE INDEX idx_presales_opportunities_member ON public.presales_opportunities(presales_member_id);
CREATE INDEX idx_training_sessions_date ON public.training_sessions(scheduled_date);