-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  -- In-app notification preferences
  in_app_enabled boolean NOT NULL DEFAULT true,
  in_app_requests boolean NOT NULL DEFAULT true,
  in_app_approvals boolean NOT NULL DEFAULT true,
  in_app_deals boolean NOT NULL DEFAULT true,
  in_app_tickets boolean NOT NULL DEFAULT true,
  in_app_renewals boolean NOT NULL DEFAULT true,
  in_app_compliance boolean NOT NULL DEFAULT true,
  -- Email notification preferences
  email_enabled boolean NOT NULL DEFAULT false,
  email_requests boolean NOT NULL DEFAULT true,
  email_approvals boolean NOT NULL DEFAULT true,
  email_deals boolean NOT NULL DEFAULT true,
  email_tickets boolean NOT NULL DEFAULT true,
  email_renewals boolean NOT NULL DEFAULT true,
  email_compliance boolean NOT NULL DEFAULT true,
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
ON public.notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to auto-create preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

-- Trigger to create preferences when user is created
CREATE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_notification_preferences();

-- Create updated_at trigger
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();