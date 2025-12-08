-- Update RLS policy for alliance_organizations to include account managers
DROP POLICY IF EXISTS "Users can view their own or team organizations" ON public.alliance_organizations;

CREATE POLICY "Users can view assigned or team organizations" 
ON public.alliance_organizations 
FOR SELECT 
USING (
  -- User is the account manager or technical account manager
  auth.uid() = account_manager_id 
  OR auth.uid() = technical_account_manager_id
  -- Or user created the record
  OR auth.uid() = created_by
  -- Or user is admin/manager
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  -- Or user has tenant access and can view sales records
  OR ((tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id)) AND can_view_sales_record(created_by))
);

-- Also update contacts policy to include users who manage the related organization
DROP POLICY IF EXISTS "Enhanced contact visibility" ON public.contacts;

CREATE POLICY "Enhanced contact visibility" 
ON public.contacts 
FOR SELECT 
USING (
  -- User owns the contact
  auth.uid() = user_id
  -- Or user is admin/manager/finance/accounts
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role) 
  OR has_team(auth.uid(), 'finance'::team_type) 
  OR has_team(auth.uid(), 'accounts'::team_type)
  -- Or user manages the related alliance organization
  OR EXISTS (
    SELECT 1 FROM public.alliance_organizations ao 
    WHERE ao.id = alliance_organization_id 
    AND (ao.account_manager_id = auth.uid() OR ao.technical_account_manager_id = auth.uid())
  )
  -- Or user has tenant access
  OR (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id))
);