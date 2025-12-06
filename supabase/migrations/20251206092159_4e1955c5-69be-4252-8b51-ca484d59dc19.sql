-- Organization Settings Table
CREATE TABLE public.organization_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'My Organization',
  logo_url text,
  website_url text,
  linkedin_url text,
  twitter_url text,
  address text,
  countries text[] DEFAULT '{}',
  cities text[] DEFAULT '{}',
  currency text DEFAULT 'USD',
  total_employees integer DEFAULT 0,
  senior_management jsonb DEFAULT '[]',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Policies for organization settings
CREATE POLICY "Everyone can view org settings" ON public.organization_settings
  FOR SELECT USING (true);

CREATE POLICY "Only admins can update org settings" ON public.organization_settings
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert org settings" ON public.organization_settings
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.organization_settings (name) VALUES ('My Organization');

-- Employee Events Table (birthdays, anniversaries, org events)
CREATE TABLE public.employee_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('birthday', 'anniversary', 'org_event', 'achievement', 'performance')),
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  is_recurring boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_events ENABLE ROW LEVEL SECURITY;

-- Policies for employee events
CREATE POLICY "Everyone can view events" ON public.employee_events
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can create events" ON public.employee_events
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    auth.uid() = user_id
  );

CREATE POLICY "Admins can update events" ON public.employee_events
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    auth.uid() = created_by
  );

CREATE POLICY "Admins can delete events" ON public.employee_events
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    auth.uid() = created_by
  );

-- Event Wishes Table (messages/wishes for events)
CREATE TABLE public.event_wishes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.employee_events(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  recipient_id uuid REFERENCES auth.users(id),
  message text,
  emoji text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_wishes ENABLE ROW LEVEL SECURITY;

-- Policies for event wishes
CREATE POLICY "Everyone can view wishes" ON public.event_wishes
  FOR SELECT USING (true);

CREATE POLICY "Users can create wishes" ON public.event_wishes
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update their wishes" ON public.event_wishes
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Add triggers for updated_at
CREATE TRIGGER update_organization_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_events_updated_at
  BEFORE UPDATE ON public.employee_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for event wishes
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_wishes;