-- Create storage bucket for order processing documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-documents', 'order-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for order documents bucket
CREATE POLICY "Authenticated users can upload order documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'order-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view order documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'order-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Admins and managers can delete order documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'order-documents' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- Create function to auto-create order processing workflow when deal moves to closed_won
CREATE OR REPLACE FUNCTION public.auto_create_order_processing_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When deal moves to closed_won, create a notification for sales to initiate ODF
  IF NEW.stage = 'closed_won' AND (OLD.stage IS NULL OR OLD.stage != 'closed_won') THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      category,
      reference_type,
      reference_id,
      action_url
    ) VALUES (
      COALESCE(NEW.assigned_to, NEW.user_id),
      'Order Processing Required',
      'Deal "' || NEW.title || '" is now Closed Won. Please initiate Order Processing (ODF) request.',
      'info',
      'deals',
      'deal',
      NEW.id,
      '/accounts?tab=workflows'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto notification
DROP TRIGGER IF EXISTS trigger_order_processing_notification ON public.deals;
CREATE TRIGGER trigger_order_processing_notification
  AFTER UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_order_processing_notification();