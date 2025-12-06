
-- Fix function search paths
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ticket_sla()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  CASE NEW.priority
    WHEN 'critical' THEN NEW.sla_hours := 2;
    WHEN 'high' THEN NEW.sla_hours := 4;
    WHEN 'medium' THEN NEW.sla_hours := 8;
    WHEN 'low' THEN NEW.sla_hours := 24;
    ELSE NEW.sla_hours := 8;
  END CASE;
  NEW.sla_deadline := NOW() + (NEW.sla_hours || ' hours')::INTERVAL;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;
