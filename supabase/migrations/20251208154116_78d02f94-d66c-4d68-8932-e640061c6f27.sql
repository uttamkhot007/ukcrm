-- Rename offerings_solutions table to offerings_products
ALTER TABLE public.offerings_solutions RENAME TO offerings_products;

-- Rename solution_oems junction table to product_oems
ALTER TABLE public.solution_oems RENAME TO product_oems;

-- Rename solution_technologies junction table to product_technologies
ALTER TABLE public.solution_technologies RENAME TO product_technologies;

-- Rename the solution_id column in product_oems to product_id
ALTER TABLE public.product_oems RENAME COLUMN solution_id TO product_id;

-- Rename the solution_id column in product_technologies to product_id
ALTER TABLE public.product_technologies RENAME COLUMN solution_id TO product_id;

-- Update foreign key constraint names for product_oems
ALTER TABLE public.product_oems DROP CONSTRAINT IF EXISTS solution_oems_solution_id_fkey;
ALTER TABLE public.product_oems DROP CONSTRAINT IF EXISTS solution_oems_oem_id_fkey;
ALTER TABLE public.product_oems DROP CONSTRAINT IF EXISTS solution_oems_tenant_id_fkey;

ALTER TABLE public.product_oems 
  ADD CONSTRAINT product_oems_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.offerings_products(id) ON DELETE CASCADE;

ALTER TABLE public.product_oems 
  ADD CONSTRAINT product_oems_oem_id_fkey 
  FOREIGN KEY (oem_id) REFERENCES public.offerings_oems(id) ON DELETE CASCADE;

ALTER TABLE public.product_oems 
  ADD CONSTRAINT product_oems_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

-- Update foreign key constraint names for product_technologies
ALTER TABLE public.product_technologies DROP CONSTRAINT IF EXISTS solution_technologies_solution_id_fkey;
ALTER TABLE public.product_technologies DROP CONSTRAINT IF EXISTS solution_technologies_technology_id_fkey;
ALTER TABLE public.product_technologies DROP CONSTRAINT IF EXISTS solution_technologies_tenant_id_fkey;

ALTER TABLE public.product_technologies 
  ADD CONSTRAINT product_technologies_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.offerings_products(id) ON DELETE CASCADE;

ALTER TABLE public.product_technologies 
  ADD CONSTRAINT product_technologies_technology_id_fkey 
  FOREIGN KEY (technology_id) REFERENCES public.offerings_technologies(id) ON DELETE CASCADE;

ALTER TABLE public.product_technologies 
  ADD CONSTRAINT product_technologies_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

-- Update unique constraints
ALTER TABLE public.product_oems DROP CONSTRAINT IF EXISTS solution_oems_solution_id_oem_id_tenant_id_key;
ALTER TABLE public.product_oems 
  ADD CONSTRAINT product_oems_product_id_oem_id_tenant_id_key 
  UNIQUE (product_id, oem_id, tenant_id);

ALTER TABLE public.product_technologies DROP CONSTRAINT IF EXISTS solution_technologies_solution_id_technology_id_tenant_id_key;
ALTER TABLE public.product_technologies 
  ADD CONSTRAINT product_technologies_product_id_technology_id_tenant_id_key 
  UNIQUE (product_id, technology_id, tenant_id);

-- Update RLS policies for offerings_products (renamed from offerings_solutions)
DROP POLICY IF EXISTS "Admins can delete offerings" ON public.offerings_products;
DROP POLICY IF EXISTS "Admins can manage offerings" ON public.offerings_products;
DROP POLICY IF EXISTS "Users can create offerings" ON public.offerings_products;
DROP POLICY IF EXISTS "Users can view offerings in their tenant" ON public.offerings_products;

CREATE POLICY "Users can view products in their tenant" 
ON public.offerings_products FOR SELECT 
USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can create products" 
ON public.offerings_products FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can manage products" 
ON public.offerings_products FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete products" 
ON public.offerings_products FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update RLS policies for product_oems
DROP POLICY IF EXISTS "Users can view solution oems in their tenant" ON public.product_oems;
DROP POLICY IF EXISTS "Users can create solution oems" ON public.product_oems;
DROP POLICY IF EXISTS "Admins can manage solution oems" ON public.product_oems;
DROP POLICY IF EXISTS "Admins can delete solution oems" ON public.product_oems;

CREATE POLICY "Users can view product oems in their tenant" 
ON public.product_oems FOR SELECT 
USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can create product oems" 
ON public.product_oems FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can manage product oems" 
ON public.product_oems FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete product oems" 
ON public.product_oems FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Update RLS policies for product_technologies
DROP POLICY IF EXISTS "Users can view solution technologies in their tenant" ON public.product_technologies;
DROP POLICY IF EXISTS "Users can create solution technologies" ON public.product_technologies;
DROP POLICY IF EXISTS "Admins can manage solution technologies" ON public.product_technologies;
DROP POLICY IF EXISTS "Admins can delete solution technologies" ON public.product_technologies;

CREATE POLICY "Users can view product technologies in their tenant" 
ON public.product_technologies FOR SELECT 
USING (tenant_id IS NULL OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Users can create product technologies" 
ON public.product_technologies FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can manage product technologies" 
ON public.product_technologies FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete product technologies" 
ON public.product_technologies FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));