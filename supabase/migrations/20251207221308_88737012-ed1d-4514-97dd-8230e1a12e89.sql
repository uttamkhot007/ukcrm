-- Drop existing SELECT policy and create a more permissive one
DROP POLICY IF EXISTS "Users can view alliance users in their tenant" ON alliance_users;

-- Create new policy that allows:
-- 1. Users in the same tenant
-- 2. The user who created the contact
-- 3. Admins and managers
CREATE POLICY "Users can view alliance users" 
ON alliance_users 
FOR SELECT 
USING (
  (tenant_id IS NULL) 
  OR user_has_tenant_access(auth.uid(), tenant_id)
  OR (created_by = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
);