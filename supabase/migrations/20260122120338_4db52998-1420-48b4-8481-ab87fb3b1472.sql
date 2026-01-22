-- =============================================
-- TALLY-STYLE ACCOUNTING MODULE - CORE TABLES
-- =============================================

-- 1. CHART OF ACCOUNTS (Account Groups & Ledgers)
-- =============================================

-- Account Groups (Primary, Secondary groups like Tally)
CREATE TABLE public.account_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_group_id UUID REFERENCES public.account_groups(id),
  nature TEXT NOT NULL CHECK (nature IN ('assets', 'liabilities', 'income', 'expenses', 'capital')),
  is_primary BOOLEAN DEFAULT false,
  affects_gross_profit BOOLEAN DEFAULT false,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ledger Accounts (Individual accounts under groups)
CREATE TABLE public.ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_code TEXT,
  name TEXT NOT NULL,
  group_id UUID REFERENCES public.account_groups(id) ON DELETE SET NULL,
  opening_balance NUMERIC(18,2) DEFAULT 0,
  opening_balance_type TEXT CHECK (opening_balance_type IN ('debit', 'credit')),
  current_balance NUMERIC(18,2) DEFAULT 0,
  balance_type TEXT CHECK (balance_type IN ('debit', 'credit')),
  contact_id UUID REFERENCES public.contacts(id),
  is_bank_account BOOLEAN DEFAULT false,
  bank_name TEXT,
  bank_account_number TEXT,
  ifsc_code TEXT,
  gst_registration_type TEXT,
  gstin TEXT,
  pan_number TEXT,
  credit_days INTEGER DEFAULT 0,
  credit_limit NUMERIC(18,2),
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, account_code)
);

-- 2. VOUCHER SYSTEM
-- =============================================

-- Voucher Types (Payment, Receipt, Contra, Journal, Sales, Purchase, etc.)
CREATE TABLE public.voucher_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  voucher_class TEXT NOT NULL CHECK (voucher_class IN ('payment', 'receipt', 'contra', 'journal', 'sales', 'purchase', 'debit_note', 'credit_note')),
  numbering_method TEXT DEFAULT 'automatic' CHECK (numbering_method IN ('automatic', 'manual')),
  prefix TEXT,
  starting_number INTEGER DEFAULT 1,
  current_number INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vouchers (Main voucher header)
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  voucher_type_id UUID REFERENCES public.voucher_types(id) ON DELETE RESTRICT,
  voucher_number TEXT NOT NULL,
  voucher_date DATE NOT NULL,
  reference_number TEXT,
  reference_date DATE,
  party_ledger_id UUID REFERENCES public.ledger_accounts(id),
  amount NUMERIC(18,2) NOT NULL,
  narration TEXT,
  is_posted BOOLEAN DEFAULT false,
  is_cancelled BOOLEAN DEFAULT false,
  cancelled_reason TEXT,
  fiscal_year TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Voucher Entries (Debit/Credit lines)
CREATE TABLE public.voucher_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE,
  ledger_id UUID REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
  debit_amount NUMERIC(18,2) DEFAULT 0,
  credit_amount NUMERIC(18,2) DEFAULT 0,
  cost_center_id UUID,
  narration TEXT,
  entry_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. GST COMPLIANCE
-- =============================================

-- HSN/SAC Master
CREATE TABLE public.hsn_sac_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  gst_rate NUMERIC(5,2) NOT NULL,
  cgst_rate NUMERIC(5,2),
  sgst_rate NUMERIC(5,2),
  igst_rate NUMERIC(5,2),
  cess_rate NUMERIC(5,2) DEFAULT 0,
  hsn_type TEXT CHECK (hsn_type IN ('goods', 'services')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- GST Returns Data
CREATE TABLE public.gst_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  return_type TEXT NOT NULL CHECK (return_type IN ('GSTR1', 'GSTR3B', 'GSTR2A', 'GSTR9')),
  return_period TEXT NOT NULL, -- Format: MMYYYY
  filing_date DATE,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filed', 'revised')),
  total_taxable_value NUMERIC(18,2) DEFAULT 0,
  total_cgst NUMERIC(18,2) DEFAULT 0,
  total_sgst NUMERIC(18,2) DEFAULT 0,
  total_igst NUMERIC(18,2) DEFAULT 0,
  total_cess NUMERIC(18,2) DEFAULT 0,
  arn_number TEXT,
  filed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- GST Transactions (for GSTR-1 reporting)
CREATE TABLE public.gst_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('B2B', 'B2C', 'B2CL', 'CDNR', 'CDNUR', 'EXP', 'AT', 'TXPD', 'HSN')),
  gstin TEXT,
  party_name TEXT,
  invoice_number TEXT,
  invoice_date DATE,
  invoice_value NUMERIC(18,2),
  place_of_supply TEXT,
  reverse_charge BOOLEAN DEFAULT false,
  hsn_code TEXT,
  taxable_value NUMERIC(18,2),
  cgst_rate NUMERIC(5,2),
  cgst_amount NUMERIC(18,2),
  sgst_rate NUMERIC(5,2),
  sgst_amount NUMERIC(18,2),
  igst_rate NUMERIC(5,2),
  igst_amount NUMERIC(18,2),
  cess_amount NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. INVENTORY ACCOUNTING
-- =============================================

-- Stock Groups
CREATE TABLE public.stock_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_group_id UUID REFERENCES public.stock_groups(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Units of Measure
CREATE TABLE public.units_of_measure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  formal_name TEXT,
  decimal_places INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, symbol)
);

-- Stock Items (Inventory Items with valuation)
CREATE TABLE public.stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_code TEXT,
  name TEXT NOT NULL,
  alias TEXT,
  stock_group_id UUID REFERENCES public.stock_groups(id),
  primary_unit_id UUID REFERENCES public.units_of_measure(id),
  hsn_sac_id UUID REFERENCES public.hsn_sac_master(id),
  opening_quantity NUMERIC(18,3) DEFAULT 0,
  opening_rate NUMERIC(18,2) DEFAULT 0,
  opening_value NUMERIC(18,2) DEFAULT 0,
  current_quantity NUMERIC(18,3) DEFAULT 0,
  current_rate NUMERIC(18,2) DEFAULT 0,
  current_value NUMERIC(18,2) DEFAULT 0,
  valuation_method TEXT DEFAULT 'weighted_average' CHECK (valuation_method IN ('fifo', 'lifo', 'weighted_average', 'specific_identification')),
  reorder_level NUMERIC(18,3),
  minimum_quantity NUMERIC(18,3),
  maximum_quantity NUMERIC(18,3),
  standard_cost NUMERIC(18,2),
  standard_selling_price NUMERIC(18,2),
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, item_code)
);

-- Godowns (Warehouses)
CREATE TABLE public.godowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_godown_id UUID REFERENCES public.godowns(id),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stock Ledger (Movement register)
CREATE TABLE public.stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE CASCADE,
  godown_id UUID REFERENCES public.godowns(id),
  voucher_id UUID REFERENCES public.vouchers(id),
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('opening', 'purchase', 'sales', 'transfer_in', 'transfer_out', 'adjustment', 'production', 'consumption')),
  quantity_in NUMERIC(18,3) DEFAULT 0,
  quantity_out NUMERIC(18,3) DEFAULT 0,
  rate NUMERIC(18,2),
  value NUMERIC(18,2),
  running_quantity NUMERIC(18,3),
  running_value NUMERIC(18,2),
  batch_number TEXT,
  expiry_date DATE,
  narration TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. BOOKS & REGISTERS
-- =============================================

-- Cost Centers
CREATE TABLE public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_center_id UUID REFERENCES public.cost_centers(id),
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fiscal Years
CREATE TABLE public.fiscal_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Day Book Configuration
CREATE TABLE public.day_book_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE,
  voucher_type TEXT NOT NULL,
  voucher_number TEXT NOT NULL,
  party_name TEXT,
  debit_amount NUMERIC(18,2) DEFAULT 0,
  credit_amount NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bank Reconciliation
CREATE TABLE public.bank_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ledger_id UUID REFERENCES public.ledger_accounts(id) ON DELETE CASCADE,
  voucher_id UUID REFERENCES public.vouchers(id),
  transaction_date DATE NOT NULL,
  bank_date DATE,
  cheque_number TEXT,
  amount NUMERIC(18,2) NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('debit', 'credit')),
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.account_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsn_sac_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units_of_measure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.godowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_book_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliation ENABLE ROW LEVEL SECURITY;

-- Tenant-based RLS policies for all tables
CREATE POLICY "Tenant isolation" ON public.account_groups FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.ledger_accounts FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.voucher_types FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.vouchers FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.voucher_entries FOR ALL USING (voucher_id IN (SELECT id FROM public.vouchers WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Tenant isolation" ON public.hsn_sac_master FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.gst_returns FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.gst_transactions FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.stock_groups FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.units_of_measure FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.stock_items FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.godowns FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.stock_ledger FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.cost_centers FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.fiscal_years FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.day_book_entries FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Tenant isolation" ON public.bank_reconciliation FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'));

-- =============================================
-- TRIGGERS FOR AUTO-UPDATE
-- =============================================

-- Trigger to update ledger balances on voucher entry
CREATE OR REPLACE FUNCTION public.update_ledger_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ledger_accounts 
    SET current_balance = current_balance + NEW.debit_amount - NEW.credit_amount,
        updated_at = now()
    WHERE id = NEW.ledger_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ledger_accounts 
    SET current_balance = current_balance - OLD.debit_amount + OLD.credit_amount,
        updated_at = now()
    WHERE id = OLD.ledger_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_ledger_balance_trigger
AFTER INSERT OR DELETE ON public.voucher_entries
FOR EACH ROW EXECUTE FUNCTION public.update_ledger_balance();

-- Trigger to update stock item quantities
CREATE OR REPLACE FUNCTION public.update_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.stock_items 
  SET current_quantity = current_quantity + NEW.quantity_in - NEW.quantity_out,
      current_value = current_value + COALESCE(NEW.value, 0) * CASE WHEN NEW.quantity_in > 0 THEN 1 ELSE -1 END,
      updated_at = now()
  WHERE id = NEW.stock_item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_stock_quantity_trigger
AFTER INSERT ON public.stock_ledger
FOR EACH ROW EXECUTE FUNCTION public.update_stock_quantity();

-- Trigger to generate voucher number
CREATE OR REPLACE FUNCTION public.generate_voucher_number()
RETURNS TRIGGER AS $$
DECLARE
  v_type RECORD;
  new_number TEXT;
BEGIN
  SELECT * INTO v_type FROM public.voucher_types WHERE id = NEW.voucher_type_id;
  
  IF v_type.numbering_method = 'automatic' THEN
    UPDATE public.voucher_types SET current_number = current_number + 1 WHERE id = NEW.voucher_type_id;
    SELECT current_number INTO v_type.current_number FROM public.voucher_types WHERE id = NEW.voucher_type_id;
    NEW.voucher_number := COALESCE(v_type.prefix, v_type.abbreviation) || '-' || TO_CHAR(NEW.voucher_date, 'YYYYMMDD') || '-' || LPAD(v_type.current_number::TEXT, 4, '0');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_voucher_number_trigger
BEFORE INSERT ON public.vouchers
FOR EACH ROW WHEN (NEW.voucher_number IS NULL OR NEW.voucher_number = '')
EXECUTE FUNCTION public.generate_voucher_number();

-- Create day book entry automatically
CREATE OR REPLACE FUNCTION public.create_day_book_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_type_name TEXT;
  party_name TEXT;
  total_debit NUMERIC(18,2);
  total_credit NUMERIC(18,2);
BEGIN
  SELECT vt.name INTO v_type_name FROM public.voucher_types vt WHERE vt.id = NEW.voucher_type_id;
  SELECT la.name INTO party_name FROM public.ledger_accounts la WHERE la.id = NEW.party_ledger_id;
  
  SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0) 
  INTO total_debit, total_credit
  FROM public.voucher_entries WHERE voucher_id = NEW.id;
  
  INSERT INTO public.day_book_entries (tenant_id, entry_date, voucher_id, voucher_type, voucher_number, party_name, debit_amount, credit_amount)
  VALUES (NEW.tenant_id, NEW.voucher_date, NEW.id, v_type_name, NEW.voucher_number, party_name, total_debit, total_credit);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_day_book_entry_trigger
AFTER INSERT ON public.vouchers
FOR EACH ROW EXECUTE FUNCTION public.create_day_book_entry();