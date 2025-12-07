-- Fix the security definer view by using SECURITY INVOKER
-- Drop and recreate the view with proper security settings

DROP VIEW IF EXISTS public.profiles_safe;

-- Recreate the view with SECURITY INVOKER (default, explicit for clarity)
-- This view will respect the RLS policies of the underlying profiles table
CREATE VIEW public.profiles_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  email,
  full_name,
  avatar_url,
  birth_date,
  hire_date,
  job_title,
  department,
  employee_code,
  location,
  anniversary_date,
  user_category,
  employment_status,
  manager_id,
  sales_sub_team,
  created_at,
  updated_at,
  -- Only show is_super_admin to super admins themselves
  CASE 
    WHEN public.current_user_is_super_admin() THEN is_super_admin
    ELSE false  -- Regular users always see false
  END as is_super_admin
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_safe TO authenticated;