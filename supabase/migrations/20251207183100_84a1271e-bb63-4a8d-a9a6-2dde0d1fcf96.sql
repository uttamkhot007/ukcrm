-- Create a function to check if user can view sales records (contacts/organizations)
-- This checks: creator, manager hierarchy, or specific team membership
CREATE OR REPLACE FUNCTION public.can_view_sales_record(record_creator_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  creator_manager_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- If no authenticated user, deny access
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If user is the creator, allow access
  IF current_user_id = record_creator_id THEN
    RETURN TRUE;
  END IF;
  
  -- If user is admin or manager role, allow access
  IF has_role(current_user_id, 'admin') OR has_role(current_user_id, 'manager') THEN
    RETURN TRUE;
  END IF;
  
  -- If user is in privileged teams (management, technical, presales, renewals, accounts, finance, inside_sales), allow access
  IF EXISTS (
    SELECT 1 FROM user_teams 
    WHERE user_id = current_user_id 
    AND team_type IN ('management', 'technical', 'presales', 'renewals', 'accounts', 'finance', 'inside_sales')
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if current user is the manager of the creator
  SELECT manager_id INTO creator_manager_id FROM profiles WHERE user_id = record_creator_id;
  IF creator_manager_id = current_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check up to 3 levels of management hierarchy
  IF creator_manager_id IS NOT NULL THEN
    SELECT manager_id INTO creator_manager_id FROM profiles WHERE user_id = creator_manager_id;
    IF creator_manager_id = current_user_id THEN
      RETURN TRUE;
    END IF;
    
    IF creator_manager_id IS NOT NULL THEN
      SELECT manager_id INTO creator_manager_id FROM profiles WHERE user_id = creator_manager_id;
      IF creator_manager_id = current_user_id THEN
        RETURN TRUE;
      END IF;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Drop existing SELECT policies on contacts
DROP POLICY IF EXISTS "Users can view contacts in their tenant" ON public.contacts;

-- Create new restrictive policy for contacts
CREATE POLICY "Users can view their own or team contacts"
ON public.contacts
FOR SELECT
USING (
  -- Must be in same tenant AND have access to the record
  ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id))
  AND can_view_sales_record(user_id)
);

-- Drop existing SELECT policies on alliance_organizations
DROP POLICY IF EXISTS "Users can view alliance orgs in their tenant" ON public.alliance_organizations;

-- Create new restrictive policy for alliance_organizations
CREATE POLICY "Users can view their own or team organizations"
ON public.alliance_organizations
FOR SELECT
USING (
  -- Must be in same tenant AND have access to the record
  ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id))
  AND can_view_sales_record(created_by)
);