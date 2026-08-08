DO $$
DECLARE
  r RECORD;
  idx_name TEXT;
BEGIN
  FOR r IN
    SELECT c.oid, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.oid AND a.attname = 'tenant_id'
          AND a.attnum > 0 AND NOT a.attisdropped
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_attribute a
          ON a.attrelid = c.oid AND a.attnum = i.indkey[0]
        WHERE i.indrelid = c.oid AND a.attname = 'tenant_id'
      )
  LOOP
    idx_name := left('idx_' || r.relname || '_tenant_id', 63);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)', idx_name, r.relname);
  END LOOP;
END $$;

-- Targeted composite indexes for the hottest dashboard filters.
CREATE INDEX IF NOT EXISTS idx_employee_events_tenant_date
  ON public.employee_events (tenant_id, event_date);

CREATE INDEX IF NOT EXISTS idx_employee_requests_tenant_status
  ON public.employee_requests (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_event_wishes_sender_event
  ON public.event_wishes (sender_id, event_id);

CREATE INDEX IF NOT EXISTS idx_renewals_expiry_status
  ON public.renewals (expiry_date, status);