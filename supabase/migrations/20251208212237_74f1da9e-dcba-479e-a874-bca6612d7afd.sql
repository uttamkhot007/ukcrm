-- Add unique constraint on alliance_users for tenant + email combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_alliance_users_tenant_email_unique 
ON alliance_users (tenant_id, LOWER(email)) 
WHERE email IS NOT NULL;

-- Add unique constraint on alliance_users for tenant + name combination (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_alliance_users_tenant_name_unique 
ON alliance_users (tenant_id, LOWER(name));