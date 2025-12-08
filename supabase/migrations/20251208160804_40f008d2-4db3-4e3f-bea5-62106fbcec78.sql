-- Add new columns for enhanced deal workflow
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS organization_name TEXT,
ADD COLUMN IF NOT EXISTS problem_requirement TEXT,
ADD COLUMN IF NOT EXISTS deal_type TEXT DEFAULT 'new' CHECK (deal_type IN ('new', 'replacement')),
ADD COLUMN IF NOT EXISTS existing_solution TEXT,
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS buying_timeline TEXT,
ADD COLUMN IF NOT EXISTS is_budgeted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tentative_budget NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_steps TEXT,
ADD COLUMN IF NOT EXISTS solution_id UUID REFERENCES public.offerings_products(id);

-- Create index for solution lookups
CREATE INDEX IF NOT EXISTS idx_deals_solution_id ON public.deals(solution_id);

-- Add comment for documentation
COMMENT ON COLUMN public.deals.deal_type IS 'Type of deal: new or replacement';
COMMENT ON COLUMN public.deals.existing_solution IS 'Required when deal_type is replacement';
COMMENT ON COLUMN public.deals.solution_id IS 'Links to offerings_products for sizing questionnaire';