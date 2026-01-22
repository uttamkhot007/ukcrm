-- E-Invoicing table for GST compliance
CREATE TABLE public.e_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  invoice_id UUID REFERENCES public.invoices(id),
  irn TEXT UNIQUE,
  qr_code TEXT,
  ack_number TEXT,
  ack_date TIMESTAMP WITH TIME ZONE,
  signed_invoice TEXT,
  signed_qr_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'cancelled', 'failed')),
  error_message TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancel_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- E-Way Bills table
CREATE TABLE public.eway_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  invoice_id UUID REFERENCES public.invoices(id),
  eway_bill_number TEXT UNIQUE,
  eway_bill_date TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  doc_type TEXT DEFAULT 'INV' CHECK (doc_type IN ('INV', 'CHL', 'BIL', 'BOE', 'OTH')),
  doc_number TEXT,
  doc_date DATE,
  from_gstin TEXT,
  from_name TEXT,
  from_address TEXT,
  from_place TEXT,
  from_state_code TEXT,
  from_pincode TEXT,
  to_gstin TEXT,
  to_name TEXT,
  to_address TEXT,
  to_place TEXT,
  to_state_code TEXT,
  to_pincode TEXT,
  transporter_id TEXT,
  transporter_name TEXT,
  trans_mode TEXT CHECK (trans_mode IN ('road', 'rail', 'air', 'ship')),
  vehicle_number TEXT,
  vehicle_type TEXT CHECK (vehicle_type IN ('regular', 'over_dimensional')),
  distance_km INTEGER,
  total_value NUMERIC(18,2),
  cgst_amount NUMERIC(18,2) DEFAULT 0,
  sgst_amount NUMERIC(18,2) DEFAULT 0,
  igst_amount NUMERIC(18,2) DEFAULT 0,
  cess_amount NUMERIC(18,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'extended')),
  extended_times INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TDS/TCS transactions table
CREATE TABLE public.tds_tcs_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('tds', 'tcs')),
  section_code TEXT NOT NULL,
  section_description TEXT,
  deductee_pan TEXT,
  deductee_name TEXT,
  deductee_type TEXT CHECK (deductee_type IN ('individual', 'company', 'firm', 'huf', 'aop', 'trust', 'government', 'other')),
  transaction_date DATE NOT NULL,
  payment_date DATE,
  gross_amount NUMERIC(18,2) NOT NULL,
  tax_rate NUMERIC(5,2) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL,
  surcharge_rate NUMERIC(5,2) DEFAULT 0,
  surcharge_amount NUMERIC(18,2) DEFAULT 0,
  cess_rate NUMERIC(5,2) DEFAULT 0,
  cess_amount NUMERIC(18,2) DEFAULT 0,
  total_tax NUMERIC(18,2) NOT NULL,
  certificate_number TEXT,
  challan_number TEXT,
  challan_date DATE,
  voucher_id UUID REFERENCES public.vouchers(id),
  ledger_id UUID REFERENCES public.ledger_accounts(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'filed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TDS/TCS rates master
CREATE TABLE public.tds_tcs_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  section_code TEXT NOT NULL,
  section_description TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('tds', 'tcs')),
  rate_individual NUMERIC(5,2) NOT NULL,
  rate_company NUMERIC(5,2) NOT NULL,
  rate_no_pan NUMERIC(5,2) NOT NULL,
  threshold_amount NUMERIC(18,2) DEFAULT 0,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Currency master table
CREATE TABLE public.currencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places INTEGER DEFAULT 2,
  is_base_currency BOOLEAN DEFAULT false,
  exchange_rate NUMERIC(18,6) DEFAULT 1,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- Estimates/Quotations table
CREATE TABLE public.estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  estimate_number TEXT NOT NULL,
  estimate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  contact_id UUID REFERENCES public.contacts(id),
  deal_id UUID REFERENCES public.deals(id),
  reference_number TEXT,
  currency_code TEXT DEFAULT 'INR',
  exchange_rate NUMERIC(18,6) DEFAULT 1,
  subtotal NUMERIC(18,2) DEFAULT 0,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'amount')),
  discount_value NUMERIC(18,2) DEFAULT 0,
  discount_amount NUMERIC(18,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  total_amount NUMERIC(18,2) DEFAULT 0,
  notes TEXT,
  terms_and_conditions TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired', 'converted')),
  converted_to_invoice_id UUID REFERENCES public.invoices(id),
  sent_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Estimate line items
CREATE TABLE public.estimate_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  hsn_code TEXT,
  quantity NUMERIC(18,3) DEFAULT 1,
  unit TEXT,
  unit_price NUMERIC(18,2) NOT NULL,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  amount NUMERIC(18,2) NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Budget management table
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  budget_type TEXT DEFAULT 'annual' CHECK (budget_type IN ('annual', 'quarterly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active', 'closed')),
  total_budget NUMERIC(18,2) DEFAULT 0,
  notes TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Budget line items by account
CREATE TABLE public.budget_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  ledger_id UUID REFERENCES public.ledger_accounts(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  period_month INTEGER CHECK (period_month BETWEEN 1 AND 12),
  budgeted_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(18,2) DEFAULT 0,
  variance_amount NUMERIC(18,2) GENERATED ALWAYS AS (actual_amount - budgeted_amount) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.e_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eway_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tds_tcs_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tds_tcs_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY "Tenant isolation for e_invoices" ON public.e_invoices FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation for eway_bills" ON public.eway_bills FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation for tds_tcs_transactions" ON public.tds_tcs_transactions FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation for tds_tcs_rates" ON public.tds_tcs_rates FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation for currencies" ON public.currencies FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation for estimates" ON public.estimates FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Estimate items access" ON public.estimate_items FOR ALL USING (estimate_id IN (SELECT id FROM public.estimates WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Tenant isolation for budgets" ON public.budgets FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Budget items access" ON public.budget_items FOR ALL USING (budget_id IN (SELECT id FROM public.budgets WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active')));

-- Trigger for estimate number generation
CREATE OR REPLACE FUNCTION public.generate_estimate_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.estimate_number := 'EST-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER generate_estimate_number_trigger
  BEFORE INSERT ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_estimate_number();