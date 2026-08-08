DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION
  public.has_role(uuid, app_role),
  public.has_team(uuid, team_type),
  public.has_any_team(uuid, team_type[]),
  public.has_sales_access(uuid),
  public.is_customer(uuid),
  public.is_employee_user(uuid),
  public.is_management(uuid),
  public.is_platform_admin(uuid),
  public.is_super_admin(uuid),
  public.current_user_is_super_admin(),
  public.is_tenant_admin(uuid, uuid),
  public.is_tenant_member(uuid, uuid),
  public.user_has_tenant_access(uuid, uuid),
  public.get_user_role(uuid),
  public.get_user_tenant_id(uuid),
  public.tenant_has_module(uuid, text),
  public.can_view_sales_record(uuid),
  public.should_hide_user_from_admins(uuid)
TO authenticated;