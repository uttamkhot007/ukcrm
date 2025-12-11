-- Drop existing policies
DROP POLICY IF EXISTS "Users can view cynet licenses in their tenant" ON cynet_licenses;
DROP POLICY IF EXISTS "Users can insert cynet licenses in their tenant" ON cynet_licenses;
DROP POLICY IF EXISTS "Users can update cynet licenses in their tenant" ON cynet_licenses;
DROP POLICY IF EXISTS "Users can delete cynet licenses in their tenant" ON cynet_licenses;

-- Create new policies using user_has_tenant_access function (consistent with other tables)
CREATE POLICY "Users can view cynet licenses in their tenant" 
ON cynet_licenses FOR SELECT 
USING (
  (tenant_id IS NULL) OR 
  user_has_tenant_access(auth.uid(), tenant_id) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can insert cynet licenses in their tenant" 
ON cynet_licenses FOR INSERT 
WITH CHECK (
  (tenant_id IS NULL) OR 
  user_has_tenant_access(auth.uid(), tenant_id) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update cynet licenses in their tenant" 
ON cynet_licenses FOR UPDATE 
USING (
  (tenant_id IS NULL) OR 
  user_has_tenant_access(auth.uid(), tenant_id) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can delete cynet licenses in their tenant" 
ON cynet_licenses FOR DELETE 
USING (
  (tenant_id IS NULL) OR 
  user_has_tenant_access(auth.uid(), tenant_id) OR
  has_role(auth.uid(), 'admin'::app_role)
);