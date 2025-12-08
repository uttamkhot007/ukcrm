-- Add columns to contacts table for linking with alliance users
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS alliance_user_id uuid REFERENCES public.alliance_users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS alliance_organization_id uuid REFERENCES public.alliance_organizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_alliance_user_id ON public.contacts(alliance_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_alliance_organization_id ON public.contacts(alliance_organization_id);

-- Drop existing SELECT policy on contacts and create enhanced one
DROP POLICY IF EXISTS "Users can view their own or team contacts" ON public.contacts;

-- Create enhanced RLS policy for contacts visibility
-- Sales users see: their own contacts + contacts from their assigned organizations
-- Managers see: all contacts from their team members + their own
-- Admin, Finance, Accounts, Renewal, Management teams see: all contacts
CREATE POLICY "Enhanced contact visibility" ON public.contacts
FOR SELECT USING (
  -- User's own contacts
  (auth.uid() = user_id) OR
  -- Admin/Manager role sees all
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  -- Finance, Accounts, Renewal teams see all
  has_team(auth.uid(), 'finance') OR
  has_team(auth.uid(), 'accounts') OR
  -- Tenant members with proper access
  ((tenant_id IS NULL) OR user_has_tenant_access(auth.uid(), tenant_id))
);

-- Function to sync alliance user to contacts
CREATE OR REPLACE FUNCTION public.sync_alliance_user_to_contacts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When alliance user is created or updated, sync to contacts if linked
  IF TG_OP = 'INSERT' THEN
    -- Check if contact already exists with this alliance_user_id
    IF NOT EXISTS (SELECT 1 FROM contacts WHERE alliance_user_id = NEW.id) THEN
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
$$;

-- Create trigger for syncing alliance users to contacts
DROP TRIGGER IF EXISTS sync_alliance_user_trigger ON public.alliance_users;
CREATE TRIGGER sync_alliance_user_trigger
  AFTER INSERT OR UPDATE ON public.alliance_users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_alliance_user_to_contacts();

-- Function to sync contacts back to alliance users
CREATE OR REPLACE FUNCTION public.sync_contact_to_alliance_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When contact with alliance_user_id is updated, sync back
  IF NEW.alliance_user_id IS NOT NULL THEN
    UPDATE alliance_users SET
      name = NEW.name,
      email = NEW.email,
      phone = NEW.phone,
      designation = NEW.designation
    WHERE id = NEW.alliance_user_id
    AND (name != NEW.name OR email IS DISTINCT FROM NEW.email OR phone IS DISTINCT FROM NEW.phone OR designation IS DISTINCT FROM NEW.designation);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for syncing contacts back to alliance users
DROP TRIGGER IF EXISTS sync_contact_to_alliance_trigger ON public.contacts;
CREATE TRIGGER sync_contact_to_alliance_trigger
  AFTER UPDATE ON public.contacts
  FOR EACH ROW
  WHEN (NEW.alliance_user_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_contact_to_alliance_user();