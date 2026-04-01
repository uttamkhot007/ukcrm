
-- Create a unified platform admin check function
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role(_user_id, 'admin'::app_role) 
    OR public.is_super_admin(_user_id)
$$;

-- Now apply FOR ALL policies on every public table
-- We use DO block to dynamically apply to all tables
DO $$
DECLARE
  tbl RECORD;
  policy_name TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    policy_name := 'Platform admins full access on ' || tbl.tablename;
    
    -- Drop existing policy if it exists (to avoid conflicts)
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl.tablename);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    
    -- Create the new policy
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()))',
        policy_name,
        tbl.tablename
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create policy on %: %', tbl.tablename, SQLERRM;
    END;
  END LOOP;
END;
$$;
