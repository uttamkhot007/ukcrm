-- Create inside_sales_prospects table for closed lost opportunities
CREATE TABLE public.inside_sales_prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  original_deal_title TEXT NOT NULL,
  original_deal_value NUMERIC DEFAULT 0,
  loss_reason TEXT,
  source TEXT DEFAULT 'closed_lost_deal',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'not_interested', 'converted', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,
  follow_up_date DATE,
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inside_sales_prospects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all inside sales prospects"
ON public.inside_sales_prospects FOR SELECT USING (true);

CREATE POLICY "Users can create prospects"
ON public.inside_sales_prospects FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update prospects"
ON public.inside_sales_prospects FOR UPDATE USING (
  auth.uid() = created_by OR auth.uid() = assigned_to
  OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins can delete prospects"
ON public.inside_sales_prospects FOR DELETE USING (
  auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_inside_sales_prospects_updated_at
BEFORE UPDATE ON public.inside_sales_prospects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create inside sales prospect from closed lost deal
CREATE OR REPLACE FUNCTION public.create_prospect_from_closed_lost()
RETURNS TRIGGER AS $$
DECLARE
  contact_rec RECORD;
BEGIN
  -- Only create prospect when deal moves to closed_lost
  IF NEW.stage = 'closed_lost' AND (OLD.stage IS NULL OR OLD.stage != 'closed_lost') THEN
    -- Get contact details if available
    SELECT name, email, phone, company INTO contact_rec
    FROM public.contacts 
    WHERE id = NEW.contact_id;
    
    INSERT INTO public.inside_sales_prospects (
      company_name,
      contact_name,
      contact_email,
      contact_phone,
      original_deal_title,
      original_deal_value,
      loss_reason,
      deal_id,
      contact_id,
      assigned_to,
      created_by,
      notes,
      follow_up_date
    ) VALUES (
      contact_rec.company,
      contact_rec.name,
      contact_rec.email,
      contact_rec.phone,
      NEW.title,
      NEW.value,
      NEW.loss_reason,
      NEW.id,
      NEW.contact_id,
      NEW.assigned_to,
      NEW.user_id,
      'Auto-created from closed lost deal. Original reason: ' || COALESCE(NEW.loss_reason, 'Not specified'),
      CURRENT_DATE + INTERVAL '30 days'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on deals table for closed lost
CREATE TRIGGER create_prospect_on_closed_lost
AFTER INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.create_prospect_from_closed_lost();

-- Indexes
CREATE INDEX idx_inside_sales_prospects_status ON public.inside_sales_prospects(status);
CREATE INDEX idx_inside_sales_prospects_follow_up ON public.inside_sales_prospects(follow_up_date);
CREATE INDEX idx_inside_sales_prospects_deal_id ON public.inside_sales_prospects(deal_id);
CREATE INDEX idx_inside_sales_prospects_assigned_to ON public.inside_sales_prospects(assigned_to);