
-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, error, success
  category TEXT, -- ticket, invoice, compliance, deal, request, renewal
  reference_id UUID, -- Link to related entity
  reference_type TEXT, -- tickets, invoices, deals, etc.
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow_logs table to track workflow executions
CREATE TABLE public.workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create approval_workflows table for multi-level approvals
CREATE TABLE public.approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- invoice, deal, compliance_assessment
  entity_id UUID NOT NULL,
  approval_level INTEGER NOT NULL DEFAULT 1,
  required_role TEXT NOT NULL DEFAULT 'manager',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  approver_id UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;

-- Notifications policies - users see their own
CREATE POLICY "Users can view their notifications" ON public.notifications 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their notifications" ON public.notifications 
  FOR UPDATE USING (auth.uid() = user_id);

-- Workflow logs - admins and managers can view
CREATE POLICY "Managers can view workflow logs" ON public.workflow_logs 
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "System can create workflow logs" ON public.workflow_logs 
  FOR INSERT WITH CHECK (true);

-- Approval workflows policies
CREATE POLICY "Users can view approval workflows" ON public.approval_workflows 
  FOR SELECT USING (true);
CREATE POLICY "System can manage approval workflows" ON public.approval_workflows 
  FOR ALL USING (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
