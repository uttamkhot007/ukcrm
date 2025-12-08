-- Add Fresh Sales and Renewal target columns to sales_targets
ALTER TABLE public.sales_targets 
ADD COLUMN fresh_sales_top_line NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN fresh_sales_bottom_line NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN renewal_top_line NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN renewal_bottom_line NUMERIC NOT NULL DEFAULT 0;

-- Migrate existing data: move top_line_target to fresh_sales_top_line
UPDATE public.sales_targets 
SET fresh_sales_top_line = top_line_target,
    fresh_sales_bottom_line = bottom_line_target;

-- Comment for clarity
COMMENT ON COLUMN public.sales_targets.fresh_sales_top_line IS 'Fresh/New sales revenue target';
COMMENT ON COLUMN public.sales_targets.fresh_sales_bottom_line IS 'Fresh/New sales profit target';
COMMENT ON COLUMN public.sales_targets.renewal_top_line IS 'Renewal revenue target';
COMMENT ON COLUMN public.sales_targets.renewal_bottom_line IS 'Renewal profit target';