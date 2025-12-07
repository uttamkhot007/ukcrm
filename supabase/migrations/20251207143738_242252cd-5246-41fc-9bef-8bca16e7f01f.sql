-- Create a view that hides is_super_admin from non-super-admins
-- This ensures regular admins cannot see who the super admins are

-- First, create a security definer function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE user_id = _user_id),
    false
  )
$$;

-- Create a function that returns the current user's super admin status
CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE user_id = auth.uid()),
    false
  )
$$;

-- Update the profiles RLS policy to hide is_super_admin from non-super-admins
-- We'll create a view for safe profile access instead

-- Create a secure view for profiles that hides super admin status
CREATE OR REPLACE VIEW public.profiles_safe AS
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

-- Create a function to check if a user should be hidden from regular admins
-- Super admins without explicit tenant membership should be invisible
CREATE OR REPLACE FUNCTION public.should_hide_user_from_admins(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Hide if user is super admin AND the current user is NOT a super admin
  SELECT 
    COALESCE(
      (SELECT is_super_admin FROM public.profiles WHERE user_id = _user_id), 
      false
    ) 
    AND NOT public.current_user_is_super_admin()
$$;