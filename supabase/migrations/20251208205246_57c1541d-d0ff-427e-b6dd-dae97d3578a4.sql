-- First, delete duplicate contacts keeping the one with alliance_user_id (or the oldest one)
WITH duplicates AS (
  SELECT id, email,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(email)) 
      ORDER BY 
        CASE WHEN alliance_user_id IS NOT NULL THEN 0 ELSE 1 END,
        created_at ASC
    ) as rn
  FROM contacts
  WHERE email IS NOT NULL AND TRIM(email) != ''
)
DELETE FROM contacts 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Create a unique index on email (case-insensitive) for contacts table
-- This prevents duplicates at the database level
CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_unique_idx 
ON contacts (LOWER(TRIM(email))) 
WHERE email IS NOT NULL AND TRIM(email) != '';

-- Create a unique index on email (case-insensitive) for alliance_users table
CREATE UNIQUE INDEX IF NOT EXISTS alliance_users_email_unique_idx 
ON alliance_users (LOWER(TRIM(email))) 
WHERE email IS NOT NULL AND TRIM(email) != '';

-- Update the sync trigger to check for existing email before inserting
CREATE OR REPLACE FUNCTION public.sync_alliance_user_to_contacts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When alliance user is created or updated, sync to contacts if linked
  IF TG_OP = 'INSERT' THEN
    -- Check if contact already exists with this alliance_user_id OR same email
    IF NOT EXISTS (
      SELECT 1 FROM contacts 
      WHERE alliance_user_id = NEW.id 
         OR (NEW.email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM(NEW.email)) AND tenant_id = NEW.tenant_id)
    ) THEN
      INSERT INTO contacts (
        name, email, phone, company, notes, user_id, tenant_id, 
        alliance_user_id, alliance_organization_id, source_type,
        designation
      )
      SELECT 
        NEW.name,
        NEW.email,
        NEW.phone,
        ao.name, -- company from organization
        NEW.notes,
        NEW.created_by,
        NEW.tenant_id,
        NEW.id,
        NEW.organization_id,
        'alliance',
        NEW.designation
      FROM alliance_organizations ao
      WHERE ao.id = NEW.organization_id;
    ELSE
      -- If a contact with the same email exists, just update it to link to this alliance_user
      UPDATE contacts SET
        alliance_user_id = NEW.id,
        alliance_organization_id = NEW.organization_id,
        name = NEW.name,
        phone = COALESCE(NEW.phone, phone),
        designation = COALESCE(NEW.designation, designation),
        source_type = 'alliance'
      WHERE NEW.email IS NOT NULL 
        AND LOWER(TRIM(email)) = LOWER(TRIM(NEW.email)) 
        AND tenant_id = NEW.tenant_id
        AND alliance_user_id IS NULL;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update existing linked contact
    UPDATE contacts SET
      name = NEW.name,
      email = NEW.email,
      phone = NEW.phone,
      designation = NEW.designation,
      notes = CASE WHEN notes LIKE '%[CHAMPION]%' AND NEW.notes NOT LIKE '%[CHAMPION]%' 
                   THEN notes ELSE NEW.notes END
    WHERE alliance_user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;