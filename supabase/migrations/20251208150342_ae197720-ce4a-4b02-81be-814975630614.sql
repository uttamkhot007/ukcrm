-- Add created_by and updated_by columns to tables that are missing them

-- Contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Deals table
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Assets table - already has created_by, add updated_by
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Invoices table - already has created_by, add updated_by
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Projects table - already has created_by, add updated_by
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Tickets table - already has created_by, add updated_by
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Alliance organizations - already has created_by, add updated_by
ALTER TABLE public.alliance_organizations 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Alliance users table
ALTER TABLE public.alliance_users 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create a function to automatically set updated_by on updates
CREATE OR REPLACE FUNCTION public.set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for each table to auto-set updated_by
DROP TRIGGER IF EXISTS set_contacts_updated_by ON public.contacts;
CREATE TRIGGER set_contacts_updated_by
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

DROP TRIGGER IF EXISTS set_deals_updated_by ON public.deals;
CREATE TRIGGER set_deals_updated_by
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

DROP TRIGGER IF EXISTS set_leads_updated_by ON public.leads;
CREATE TRIGGER set_leads_updated_by
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

DROP TRIGGER IF EXISTS set_assets_updated_by ON public.assets;
CREATE TRIGGER set_assets_updated_by
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

DROP TRIGGER IF EXISTS set_invoices_updated_by ON public.invoices;
CREATE TRIGGER set_invoices_updated_by
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

DROP TRIGGER IF EXISTS set_projects_updated_by ON public.projects;
CREATE TRIGGER set_projects_updated_by
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

DROP TRIGGER IF EXISTS set_tickets_updated_by ON public.tickets;
CREATE TRIGGER set_tickets_updated_by
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

DROP TRIGGER IF EXISTS set_alliance_organizations_updated_by ON public.alliance_organizations;
CREATE TRIGGER set_alliance_organizations_updated_by
  BEFORE UPDATE ON public.alliance_organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

DROP TRIGGER IF EXISTS set_alliance_users_updated_by ON public.alliance_users;
CREATE TRIGGER set_alliance_users_updated_by
  BEFORE UPDATE ON public.alliance_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();