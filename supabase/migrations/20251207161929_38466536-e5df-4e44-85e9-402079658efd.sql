-- Fix function search_path for log_deal_stage_change
CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.deal_activities (deal_id, user_id, activity_type, description)
    VALUES (NEW.id, auth.uid(), 'stage_change', 'Stage changed from ' || OLD.stage || ' to ' || NEW.stage);
  END IF;
  
  IF NEW.stage = 'closed_won' AND OLD.closed_won_substage IS DISTINCT FROM NEW.closed_won_substage THEN
    INSERT INTO public.deal_activities (deal_id, user_id, activity_type, description)
    VALUES (NEW.id, auth.uid(), 'substage_change', 'Sub-stage changed to ' || COALESCE(NEW.closed_won_substage::TEXT, 'none'));
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Fix function search_path for create_prospect_from_closed_lost
CREATE OR REPLACE FUNCTION public.create_prospect_from_closed_lost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contact_rec RECORD;
BEGIN
  IF NEW.stage = 'closed_lost' AND (OLD.stage IS NULL OR OLD.stage != 'closed_lost') THEN
    SELECT name, email, phone, company INTO contact_rec
    FROM public.contacts 
    WHERE id = NEW.contact_id;
    
    INSERT INTO public.inside_sales_prospects (
      company_name,
      contact_name,
      contact_email,
      contact_phone,
      original_deal_title,
      original_deal_value,
      loss_reason,
      deal_id,
      contact_id,
      assigned_to,
      created_by,
      notes,
      follow_up_date
    ) VALUES (
      contact_rec.company,
      contact_rec.name,
      contact_rec.email,
      contact_rec.phone,
      NEW.title,
      NEW.value,
      NEW.loss_reason,
      NEW.id,
      NEW.contact_id,
      NEW.assigned_to,
      NEW.user_id,
      'Auto-created from closed lost deal. Original reason: ' || COALESCE(NEW.loss_reason, 'Not specified'),
      CURRENT_DATE + INTERVAL '30 days'
    );
  END IF;
  RETURN NEW;
END;
$$;