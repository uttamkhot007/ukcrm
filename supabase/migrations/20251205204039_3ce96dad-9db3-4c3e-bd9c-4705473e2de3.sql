-- Create enum for deal stages
CREATE TYPE public.deal_stage AS ENUM (
  'pipeline',
  'upside', 
  'strong_upside',
  'commit',
  'closed_won',
  'closed_lost'
);

-- Create enum for closed won sub-stages
CREATE TYPE public.closed_won_substage AS ENUM (
  'odf_created',
  'odf_approved',
  'invoice_raised',
  'payment_received'
);

-- Create enum for lead status
CREATE TYPE public.lead_status AS ENUM (
  'new',
  'contacted',
  'qualified',
  'unqualified',
  'converted'
);

-- Create enum for quotation status
CREATE TYPE public.quotation_status AS ENUM (
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired'
);

-- Create contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  designation TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  estimated_value DECIMAL(15,2),
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  value DECIMAL(15,2) NOT NULL DEFAULT 0,
  stage deal_stage NOT NULL DEFAULT 'pipeline',
  closed_won_substage closed_won_substage,
  probability INTEGER DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  actual_close_date DATE,
  loss_reason TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotations table
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  quotation_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 18.00,
  tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  status quotation_status NOT NULL DEFAULT 'draft',
  valid_until DATE,
  terms TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotation line items table
CREATE TABLE public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deal activity log
CREATE TABLE public.deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts
CREATE POLICY "Users can view all contacts" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their contacts" ON public.contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can delete their contacts" ON public.contacts FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for leads
CREATE POLICY "Users can view all leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update leads" ON public.leads FOR UPDATE TO authenticated USING (auth.uid() = user_id OR assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can delete leads" ON public.leads FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for deals
CREATE POLICY "Users can view all deals" ON public.deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update deals" ON public.deals FOR UPDATE TO authenticated USING (auth.uid() = user_id OR assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can delete deals" ON public.deals FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for quotations
CREATE POLICY "Users can view all quotations" ON public.quotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create quotations" ON public.quotations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update quotations" ON public.quotations FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can delete quotations" ON public.quotations FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for quotation items
CREATE POLICY "Users can view quotation items" ON public.quotation_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage quotation items" ON public.quotation_items FOR ALL TO authenticated USING (true);

-- RLS Policies for deal activities
CREATE POLICY "Users can view deal activities" ON public.deal_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create deal activities" ON public.deal_activities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create function to auto-generate quotation number
CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.quotation_number := 'QT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_quotation_number
  BEFORE INSERT ON public.quotations
  FOR EACH ROW
  WHEN (NEW.quotation_number IS NULL OR NEW.quotation_number = '')
  EXECUTE FUNCTION public.generate_quotation_number();

-- Create function to log deal stage changes
CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.deal_activities (deal_id, user_id, activity_type, description)
    VALUES (NEW.id, auth.uid(), 'stage_change', 'Stage changed from ' || OLD.stage || ' to ' || NEW.stage);
  END IF;
  
  IF NEW.stage = 'closed_won' AND OLD.closed_won_substage IS DISTINCT FROM NEW.closed_won_substage THEN
    INSERT INTO public.deal_activities (deal_id, user_id, activity_type, description)
    VALUES (NEW.id, auth.uid(), 'substage_change', 'Sub-stage changed to ' || COALESCE(NEW.closed_won_substage::TEXT, 'none'));
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_deal_update
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_deal_stage_change();