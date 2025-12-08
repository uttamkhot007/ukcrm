-- Drop the existing complex SELECT policy
DROP POLICY IF EXISTS "Users can view assigned or team organizations" ON public.alliance_organizations;

-- Create a simpler policy that allows all authenticated users in the same tenant to view organizations
CREATE POLICY "Users can view organizations in their tenant" 
ON public.alliance_organizations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    tenant_id IS NULL 
    OR user_has_tenant_access(auth.uid(), tenant_id)
  )
);