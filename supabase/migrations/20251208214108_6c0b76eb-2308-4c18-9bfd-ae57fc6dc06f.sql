-- Add more comprehensive activity definitions for all teams
-- First, let's add an activity_category column to distinguish Internal vs External activities

ALTER TABLE activity_definitions 
ADD COLUMN IF NOT EXISTS activity_category text DEFAULT 'internal' CHECK (activity_category IN ('internal', 'external'));

-- Add subcategory for better organization
ALTER TABLE activity_definitions 
ADD COLUMN IF NOT EXISTS subcategory text;

-- Create a table for customer support contracts (for technical team view)
CREATE TABLE IF NOT EXISTS customer_support_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES alliance_organizations(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id),
  contract_name text NOT NULL,
  contract_type text NOT NULL DEFAULT 'support' CHECK (contract_type IN ('support', 'professional_services', 'managed_services', 'training', 'consultation')),
  solution_details jsonb DEFAULT '[]'::jsonb,
  license_details jsonb DEFAULT '{}'::jsonb,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending', 'cancelled')),
  sla_response_hours integer DEFAULT 24,
  sla_resolution_hours integer DEFAULT 72,
  escalation_matrix jsonb DEFAULT '[]'::jsonb,
  support_contacts jsonb DEFAULT '[]'::jsonb,
  notes text,
  assigned_technical_team text[] DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id uuid REFERENCES tenants(id)
);

-- Enable RLS
ALTER TABLE customer_support_contracts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer_support_contracts
CREATE POLICY "Users can view customer support contracts in their tenant"
ON customer_support_contracts FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Users can insert customer support contracts in their tenant"
ON customer_support_contracts FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Users can update customer support contracts in their tenant"
ON customer_support_contracts FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Users can delete customer support contracts in their tenant"
ON customer_support_contracts FOR DELETE
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_customer_support_contracts_updated_at
BEFORE UPDATE ON customer_support_contracts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a standalone daily activities table (not tied to attendance)
CREATE TABLE IF NOT EXISTS daily_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_definition_id uuid REFERENCES activity_definitions(id),
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  activity_category text NOT NULL CHECK (activity_category IN ('internal', 'external')),
  activity_type text NOT NULL,
  activity_subtype text,
  duration_minutes integer NOT NULL DEFAULT 0,
  description text,
  related_organization_id uuid REFERENCES alliance_organizations(id),
  related_deal_id uuid REFERENCES deals(id),
  location_type text CHECK (location_type IN ('remote', 'onsite', 'hybrid')),
  outcome text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id uuid REFERENCES tenants(id)
);

-- Enable RLS
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;

-- Policies for daily_activities
CREATE POLICY "Users can view their own activities"
ON daily_activities FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Managers can view team activities"
ON daily_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = daily_activities.user_id 
    AND p.manager_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'manager')
);

CREATE POLICY "Users can insert their own activities"
ON daily_activities FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own activities"
ON daily_activities FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own activities"
ON daily_activities FOR DELETE
USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_daily_activities_updated_at
BEFORE UPDATE ON daily_activities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();