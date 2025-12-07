-- ============================================
-- MODULE 1: EXPENSE & TRAVEL MANAGEMENT
-- ============================================

-- Expense Categories
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  expense_type TEXT NOT NULL DEFAULT 'general', -- general, travel, meals, accommodation, transport
  gl_code TEXT, -- General ledger code for accounting
  max_amount NUMERIC, -- Maximum allowed per expense
  requires_receipt BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Expense Reports (grouping of expenses)
CREATE TABLE public.expense_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  report_number TEXT NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, submitted, manager_approved, finance_approved, rejected, paid
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  finance_approved_by UUID,
  finance_approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  travel_request_id UUID, -- Link to travel request if applicable
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual Expense Items
CREATE TABLE public.expense_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_report_id UUID NOT NULL REFERENCES public.expense_reports(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  expense_date DATE NOT NULL,
  merchant_name TEXT,
  receipt_url TEXT,
  receipt_file_name TEXT,
  is_billable BOOLEAN DEFAULT false,
  project_id UUID, -- Link to project for billable expenses
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Travel Requests
CREATE TABLE public.travel_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  request_number TEXT NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  purpose TEXT NOT NULL,
  travel_type TEXT NOT NULL DEFAULT 'domestic', -- domestic, international
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  departure_city TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  estimated_cost NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'draft', -- draft, submitted, approved, rejected, cancelled, completed
  requires_flight BOOLEAN DEFAULT false,
  requires_hotel BOOLEAN DEFAULT false,
  requires_cab BOOLEAN DEFAULT false,
  flight_preference TEXT, -- economy, business
  hotel_preference TEXT,
  additional_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  deal_id UUID REFERENCES public.deals(id), -- Link to deal if sales-related
  project_id UUID, -- Link to project if project-related
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Travel Bookings (actual bookings made)
CREATE TABLE public.travel_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  travel_request_id UUID NOT NULL REFERENCES public.travel_requests(id) ON DELETE CASCADE,
  booking_type TEXT NOT NULL, -- flight, hotel, cab, train, bus
  booking_reference TEXT,
  vendor_name TEXT,
  departure_datetime TIMESTAMP WITH TIME ZONE,
  arrival_datetime TIMESTAMP WITH TIME ZONE,
  from_location TEXT,
  to_location TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'booked', -- booked, confirmed, cancelled
  booking_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_categories
CREATE POLICY "Users can view categories in their tenant" ON public.expense_categories
  FOR SELECT USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage categories" ON public.expense_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for expense_reports
CREATE POLICY "Users can view their own expense reports" ON public.expense_reports
  FOR SELECT USING (
    user_id = auth.uid() OR 
    approved_by = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_team(auth.uid(), 'finance'::team_type)
  );

CREATE POLICY "Users can create their own expense reports" ON public.expense_reports
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own draft reports" ON public.expense_reports
  FOR UPDATE USING (
    (user_id = auth.uid() AND status = 'draft') OR
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_team(auth.uid(), 'finance'::team_type)
  );

CREATE POLICY "Users can delete their own draft reports" ON public.expense_reports
  FOR DELETE USING (
    (user_id = auth.uid() AND status = 'draft') OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policies for expense_items
CREATE POLICY "Users can view expense items" ON public.expense_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM expense_reports er 
      WHERE er.id = expense_report_id 
      AND (er.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_team(auth.uid(), 'finance'::team_type))
    )
  );

CREATE POLICY "Users can manage their own expense items" ON public.expense_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM expense_reports er 
      WHERE er.id = expense_report_id 
      AND (er.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- RLS Policies for travel_requests
CREATE POLICY "Users can view their own travel requests" ON public.travel_requests
  FOR SELECT USING (
    user_id = auth.uid() OR 
    approved_by = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Users can create their own travel requests" ON public.travel_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own draft requests" ON public.travel_requests
  FOR UPDATE USING (
    (user_id = auth.uid() AND status IN ('draft', 'rejected')) OR
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Users can delete their own draft requests" ON public.travel_requests
  FOR DELETE USING (
    (user_id = auth.uid() AND status = 'draft') OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policies for travel_bookings
CREATE POLICY "Users can view bookings for their requests" ON public.travel_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM travel_requests tr 
      WHERE tr.id = travel_request_id 
      AND (tr.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

CREATE POLICY "Admins can manage bookings" ON public.travel_bookings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Triggers for auto-generating numbers
CREATE OR REPLACE FUNCTION public.generate_expense_report_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.report_number := 'EXP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_expense_report_number
  BEFORE INSERT ON public.expense_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_expense_report_number();

CREATE OR REPLACE FUNCTION public.generate_travel_request_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.request_number := 'TRV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_travel_request_number
  BEFORE INSERT ON public.travel_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_travel_request_number();

-- Update total amount on expense report when items change
CREATE OR REPLACE FUNCTION public.update_expense_report_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE expense_reports SET total_amount = (
      SELECT COALESCE(SUM(amount), 0) FROM expense_items WHERE expense_report_id = OLD.expense_report_id
    ), updated_at = now() WHERE id = OLD.expense_report_id;
    RETURN OLD;
  ELSE
    UPDATE expense_reports SET total_amount = (
      SELECT COALESCE(SUM(amount), 0) FROM expense_items WHERE expense_report_id = NEW.expense_report_id
    ), updated_at = now() WHERE id = NEW.expense_report_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_expense_total
  AFTER INSERT OR UPDATE OR DELETE ON public.expense_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_expense_report_total();

-- Create storage bucket for expense receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('expense-receipts', 'expense-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for expense receipts
CREATE POLICY "Users can upload their own receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'expense-receipts' AND (
  auth.uid()::text = (storage.foldername(name))[1] OR
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_team(auth.uid(), 'finance'::team_type)
));

CREATE POLICY "Users can delete their own receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description, expense_type, requires_receipt) VALUES
('Meals & Entertainment', 'Business meals, client entertainment', 'meals', true),
('Local Transport', 'Taxi, cab, auto, metro fares', 'transport', true),
('Fuel & Mileage', 'Personal vehicle fuel for business travel', 'transport', true),
('Accommodation', 'Hotel, lodging expenses', 'accommodation', true),
('Airfare', 'Flight tickets for business travel', 'travel', true),
('Train/Bus Fare', 'Rail and bus tickets', 'travel', true),
('Office Supplies', 'Stationery, small office items', 'general', true),
('Communication', 'Phone, internet, data charges', 'general', false),
('Software & Subscriptions', 'Software licenses, online tools', 'general', true),
('Training & Courses', 'Professional development, courses', 'general', true),
('Conference & Events', 'Registration fees, event tickets', 'general', true),
('Miscellaneous', 'Other business expenses', 'general', true);