-- Create enum for renewal types
CREATE TYPE public.renewal_type AS ENUM ('contract', 'license', 'subscription', 'certification', 'insurance', 'domain');

-- Create enum for renewal status  
CREATE TYPE public.renewal_status AS ENUM ('active', 'expiring_soon', 'expired', 'renewed', 'cancelled');

-- Create renewals table
CREATE TABLE public.renewals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type renewal_type NOT NULL DEFAULT 'contract',
  status renewal_status NOT NULL DEFAULT 'active',
  vendor TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  cost NUMERIC DEFAULT 0,
  auto_renew BOOLEAN DEFAULT false,
  reminder_days INTEGER DEFAULT 30,
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Notification tracking
  notified_4_weeks BOOLEAN DEFAULT false,
  notified_3_weeks BOOLEAN DEFAULT false,
  notified_2_weeks BOOLEAN DEFAULT false,
  notified_1_week BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all renewals"
ON public.renewals FOR SELECT USING (true);

CREATE POLICY "Users can create renewals"
ON public.renewals FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update renewals"
ON public.renewals FOR UPDATE USING (
  auth.uid() = created_by OR auth.uid() = assigned_to
  OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins can delete renewals"
ON public.renewals FOR DELETE USING (
  auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_renewals_updated_at
BEFORE UPDATE ON public.renewals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create renewal from closed won deal
CREATE OR REPLACE FUNCTION public.create_renewal_from_closed_won()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create renewal when deal moves to closed_won
  IF NEW.stage = 'closed_won' AND (OLD.stage IS NULL OR OLD.stage != 'closed_won') THEN
    INSERT INTO public.renewals (
      name,
      type,
      status,
      vendor,
      start_date,
      expiry_date,
      cost,
      assigned_to,
      created_by,
      deal_id,
      contact_id,
      notes
    ) VALUES (
      NEW.title,
      'contract'::renewal_type,
      'active'::renewal_status,
      (SELECT c.company FROM public.contacts c WHERE c.id = NEW.contact_id),
      COALESCE(NEW.actual_close_date, CURRENT_DATE),
      COALESCE(NEW.actual_close_date, CURRENT_DATE) + INTERVAL '1 year',
      NEW.value,
      NEW.assigned_to,
      NEW.user_id,
      NEW.id,
      NEW.contact_id,
      'Auto-created from closed won deal: ' || NEW.title
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on deals table
CREATE TRIGGER create_renewal_on_closed_won
AFTER INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.create_renewal_from_closed_won();

-- Indexes
CREATE INDEX idx_renewals_expiry_date ON public.renewals(expiry_date);
CREATE INDEX idx_renewals_status ON public.renewals(status);
CREATE INDEX idx_renewals_deal_id ON public.renewals(deal_id);
CREATE INDEX idx_renewals_assigned_to ON public.renewals(assigned_to);