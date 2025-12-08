-- Add type columns for incentive cap and bottom line fields
ALTER TABLE public.sales_targets 
ADD COLUMN IF NOT EXISTS incentive_cap_type TEXT DEFAULT 'value' CHECK (incentive_cap_type IN ('value', 'percentage')),
ADD COLUMN IF NOT EXISTS fresh_sales_bottom_line_type TEXT DEFAULT 'value' CHECK (fresh_sales_bottom_line_type IN ('value', 'percentage')),
ADD COLUMN IF NOT EXISTS renewal_bottom_line_type TEXT DEFAULT 'value' CHECK (renewal_bottom_line_type IN ('value', 'percentage')),
ADD COLUMN IF NOT EXISTS incentive_cap_calculated NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fresh_sales_bottom_line_calculated NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS renewal_bottom_line_calculated NUMERIC DEFAULT 0;