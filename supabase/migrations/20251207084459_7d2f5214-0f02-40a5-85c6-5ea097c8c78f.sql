-- Add is_super_admin column to profiles table for platform-level admin access
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- Update RLS policy to allow super admins to view all tenants
DROP POLICY IF EXISTS "Super admins can view all tenants" ON public.tenants;
CREATE POLICY "Super admins can view all tenants" 
ON public.tenants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_super_admin = true
  )
);

-- Allow super admins to manage all tenant members
DROP POLICY IF EXISTS "Super admins can manage tenant members" ON public.tenant_members;
CREATE POLICY "Super admins can manage tenant members" 
ON public.tenant_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_super_admin = true
  )
);

-- Allow super admins to manage all tenant modules
DROP POLICY IF EXISTS "Super admins can manage tenant modules" ON public.tenant_modules;
CREATE POLICY "Super admins can manage tenant modules" 
ON public.tenant_modules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_super_admin = true
  )
);