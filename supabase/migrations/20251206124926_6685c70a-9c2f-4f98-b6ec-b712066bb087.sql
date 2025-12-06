-- Create table for exchange rate history
CREATE TABLE public.exchange_rate_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  rate_date DATE NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicates for same date/pair
CREATE UNIQUE INDEX idx_exchange_rate_unique ON public.exchange_rate_history (from_currency, to_currency, rate_date);

-- Create index for faster queries
CREATE INDEX idx_exchange_rate_date ON public.exchange_rate_history (rate_date DESC);

-- Enable RLS
ALTER TABLE public.exchange_rate_history ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view exchange rates (public data)
CREATE POLICY "Everyone can view exchange rates"
ON public.exchange_rate_history
FOR SELECT
USING (true);

-- Allow system to insert rates (via edge function)
CREATE POLICY "System can insert exchange rates"
ON public.exchange_rate_history
FOR INSERT
WITH CHECK (true);