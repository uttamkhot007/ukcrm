-- Create asset categories table
CREATE TABLE public.asset_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  depreciation_rate DECIMAL(5,2),
  useful_life_years INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  asset_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.asset_categories(id),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'retired', 'disposed')),
  serial_number TEXT,
  model TEXT,
  manufacturer TEXT,
  purchase_date DATE,
  purchase_price DECIMAL(12,2),
  current_value DECIMAL(12,2),
  warranty_expiry DATE,
  location TEXT,
  assigned_to UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create asset assignments history table
CREATE TABLE public.asset_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  returned_at TIMESTAMP WITH TIME ZONE,
  return_condition TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create asset maintenance table
CREATE TABLE public.asset_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'inspection')),
  description TEXT NOT NULL,
  scheduled_date DATE,
  completed_date DATE,
  cost DECIMAL(12,2),
  vendor TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  performed_by UUID,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT DEFAULT 'piece',
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  reorder_quantity INTEGER,
  unit_cost DECIMAL(12,2),
  location TEXT,
  supplier TEXT,
  last_restocked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory transactions table
CREATE TABLE public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment', 'transfer')),
  quantity INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  performed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for asset_categories
CREATE POLICY "Users can view asset categories in their tenant" ON public.asset_categories
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id) OR tenant_id IS NULL);

CREATE POLICY "Admins can manage asset categories" ON public.asset_categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for assets
CREATE POLICY "Users can view assets in their tenant" ON public.assets
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id) OR tenant_id IS NULL);

CREATE POLICY "Users can view their assigned assets" ON public.assets
  FOR SELECT USING (assigned_to = auth.uid());

CREATE POLICY "Admins can manage assets" ON public.assets
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for asset_assignments
CREATE POLICY "Users can view their assignments" ON public.asset_assignments
  FOR SELECT USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Admins can manage assignments" ON public.asset_assignments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for asset_maintenance
CREATE POLICY "Users can view maintenance in their tenant" ON public.asset_maintenance
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id) OR tenant_id IS NULL);

CREATE POLICY "Admins can manage maintenance" ON public.asset_maintenance
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for inventory_items
CREATE POLICY "Users can view inventory in their tenant" ON public.inventory_items
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id) OR tenant_id IS NULL);

CREATE POLICY "Admins can manage inventory" ON public.inventory_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for inventory_transactions
CREATE POLICY "Users can view inventory transactions in their tenant" ON public.inventory_transactions
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id) OR tenant_id IS NULL);

CREATE POLICY "Admins can manage inventory transactions" ON public.inventory_transactions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Function to generate asset number
CREATE OR REPLACE FUNCTION public.generate_asset_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.asset_number := 'AST-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Trigger for asset number generation
CREATE TRIGGER set_asset_number
  BEFORE INSERT ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_asset_number();

-- Function to update inventory quantity
CREATE OR REPLACE FUNCTION public.update_inventory_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_type = 'in' THEN
    UPDATE inventory_items SET 
      quantity_on_hand = quantity_on_hand + NEW.quantity,
      last_restocked_at = now(),
      updated_at = now()
    WHERE id = NEW.item_id;
  ELSIF NEW.transaction_type = 'out' THEN
    UPDATE inventory_items SET 
      quantity_on_hand = quantity_on_hand - NEW.quantity,
      updated_at = now()
    WHERE id = NEW.item_id;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    UPDATE inventory_items SET 
      quantity_on_hand = quantity_on_hand + NEW.quantity,
      updated_at = now()
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for inventory quantity update
CREATE TRIGGER update_inventory_on_transaction
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_quantity();

-- Insert default asset categories
INSERT INTO public.asset_categories (name, description, depreciation_rate, useful_life_years) VALUES
  ('IT Equipment', 'Computers, laptops, servers, networking equipment', 33.33, 3),
  ('Furniture', 'Desks, chairs, cabinets, shelves', 10.00, 10),
  ('Vehicles', 'Company cars, trucks, motorcycles', 15.00, 7),
  ('Office Equipment', 'Printers, scanners, projectors', 20.00, 5),
  ('Software', 'Licensed software and subscriptions', 50.00, 2),
  ('Machinery', 'Manufacturing and industrial equipment', 10.00, 10);