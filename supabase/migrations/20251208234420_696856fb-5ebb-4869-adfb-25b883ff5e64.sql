-- Enable RLS on sales_targets
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- Policy for admins/managers to manage all targets in their tenant
CREATE POLICY "Admins can manage sales targets"
ON public.sales_targets
FOR ALL
USING (
  tenant_id IS NULL OR 
  public.is_tenant_admin(auth.uid(), tenant_id) OR
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  tenant_id IS NULL OR 
  public.is_tenant_admin(auth.uid(), tenant_id) OR
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'manager'::app_role)
);

-- Policy for users to view their own targets
CREATE POLICY "Users can view own targets"
ON public.sales_targets
FOR SELECT
USING (user_id = auth.uid());