-- Add canned_responses table for quick reply templates
CREATE TABLE IF NOT EXISTS public.canned_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  title text NOT NULL,
  content text NOT NULL,
  category text,
  shortcut text,
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view canned responses in their tenant"
ON canned_responses FOR SELECT
USING (
  (tenant_id IS NULL) 
  OR user_has_tenant_access(auth.uid(), tenant_id)
  OR (created_by = auth.uid())
);

CREATE POLICY "Users can create canned responses"
ON canned_responses FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own or admin update all"
ON canned_responses FOR UPDATE
USING (
  (created_by = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete canned responses"
ON canned_responses FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

-- Add tags and watchers to tickets
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS watchers uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS source text DEFAULT 'portal',
ADD COLUMN IF NOT EXISTS satisfaction_rating integer,
ADD COLUMN IF NOT EXISTS satisfaction_comment text;

-- Enable realtime for tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;