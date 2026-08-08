-- Local/dev bootstrap: one schema per service inside a single Postgres cluster.
--
-- Production uses a real database per service (DB_NAME_<SERVICE>); this file
-- keeps the developer experience to one container while preserving the same
-- ownership boundaries, so code cannot accidentally depend on cross-service
-- joins that will not exist in production.

DO $$
DECLARE
  svc text;
  services text[] := ARRAY[
    'identity','tenancy','crm','sales','presales','billing','accounting','taxation',
    'inventory','hr','expenses','assets','projects','support','compliance','marketing',
    'collaboration','files','integrations','ai','workflow'
  ];
BEGIN
  FOREACH svc IN ARRAY services LOOP
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', svc);
  END LOOP;
END $$;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
