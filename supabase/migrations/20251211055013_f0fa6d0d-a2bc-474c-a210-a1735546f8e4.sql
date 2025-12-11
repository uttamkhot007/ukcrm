-- Create remote_sessions table for tracking remote support sessions
CREATE TABLE public.remote_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  session_type VARCHAR(50) DEFAULT 'support' CHECK (session_type IN ('support', 'training', 'demo', 'consultation')),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  host_id UUID NOT NULL,
  customer_id UUID,
  organization_id UUID REFERENCES public.alliance_organizations(id),
  ticket_id UUID REFERENCES public.tickets(id),
  meeting_link TEXT,
  meeting_platform VARCHAR(50) DEFAULT 'internal' CHECK (meeting_platform IN ('zoom', 'webex', 'gotoresolve', 'teams', 'internal')),
  recording_url TEXT,
  recording_available BOOLEAN DEFAULT false,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create remote_session_participants table
CREATE TABLE public.remote_session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.remote_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  participant_name VARCHAR(255) NOT NULL,
  participant_email VARCHAR(255),
  role VARCHAR(50) DEFAULT 'attendee' CHECK (role IN ('host', 'co-host', 'attendee', 'observer')),
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create remote_session_recordings table
CREATE TABLE public.remote_session_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.remote_sessions(id) ON DELETE CASCADE,
  recording_name VARCHAR(255) NOT NULL,
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  format VARCHAR(20) DEFAULT 'mp4',
  thumbnail_url TEXT,
  transcript TEXT,
  is_public BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.remote_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remote_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remote_session_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for remote_sessions
CREATE POLICY "Users can view sessions they host or participate in" 
ON public.remote_sessions FOR SELECT 
USING (
  auth.uid() = host_id 
  OR auth.uid() = customer_id 
  OR auth.uid() IN (SELECT user_id FROM public.remote_session_participants WHERE session_id = id)
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'manager')
  OR has_role(auth.uid(), 'employee')
);

CREATE POLICY "Employees can create sessions" 
ON public.remote_sessions FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'manager')
  OR has_role(auth.uid(), 'employee')
);

CREATE POLICY "Session hosts and admins can update sessions" 
ON public.remote_sessions FOR UPDATE 
USING (
  auth.uid() = host_id 
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'manager')
);

CREATE POLICY "Session hosts and admins can delete sessions" 
ON public.remote_sessions FOR DELETE 
USING (
  auth.uid() = host_id 
  OR has_role(auth.uid(), 'admin')
);

-- RLS Policies for remote_session_participants
CREATE POLICY "Users can view participants of accessible sessions" 
ON public.remote_session_participants FOR SELECT 
USING (
  session_id IN (SELECT id FROM public.remote_sessions)
);

CREATE POLICY "Session hosts can manage participants" 
ON public.remote_session_participants FOR INSERT 
WITH CHECK (
  session_id IN (SELECT id FROM public.remote_sessions WHERE host_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'manager')
  OR has_role(auth.uid(), 'employee')
);

CREATE POLICY "Session hosts can update participants" 
ON public.remote_session_participants FOR UPDATE 
USING (
  session_id IN (SELECT id FROM public.remote_sessions WHERE host_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Session hosts can delete participants" 
ON public.remote_session_participants FOR DELETE 
USING (
  session_id IN (SELECT id FROM public.remote_sessions WHERE host_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

-- RLS Policies for remote_session_recordings
CREATE POLICY "Users can view recordings of accessible sessions" 
ON public.remote_session_recordings FOR SELECT 
USING (
  session_id IN (SELECT id FROM public.remote_sessions)
  OR is_public = true
);

CREATE POLICY "Session hosts can add recordings" 
ON public.remote_session_recordings FOR INSERT 
WITH CHECK (
  session_id IN (SELECT id FROM public.remote_sessions WHERE host_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'employee')
);

CREATE POLICY "Recording creators and admins can update recordings" 
ON public.remote_session_recordings FOR UPDATE 
USING (
  auth.uid() = created_by 
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Recording creators and admins can delete recordings" 
ON public.remote_session_recordings FOR DELETE 
USING (
  auth.uid() = created_by 
  OR has_role(auth.uid(), 'admin')
);

-- Create trigger for updated_at
CREATE TRIGGER update_remote_sessions_updated_at
BEFORE UPDATE ON public.remote_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_remote_sessions_host ON public.remote_sessions(host_id);
CREATE INDEX idx_remote_sessions_customer ON public.remote_sessions(customer_id);
CREATE INDEX idx_remote_sessions_status ON public.remote_sessions(status);
CREATE INDEX idx_remote_sessions_scheduled ON public.remote_sessions(scheduled_start);
CREATE INDEX idx_remote_session_participants_session ON public.remote_session_participants(session_id);
CREATE INDEX idx_remote_session_recordings_session ON public.remote_session_recordings(session_id);