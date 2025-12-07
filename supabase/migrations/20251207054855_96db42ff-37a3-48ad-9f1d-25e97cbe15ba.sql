-- Create table for user console/portal access configuration
CREATE TABLE public.user_console_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_modes TEXT[] DEFAULT ARRAY['workspace']::TEXT[],
  additional_modules TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_console_access ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own access
CREATE POLICY "Users can view their own console access"
ON public.user_console_access
FOR SELECT
USING (auth.uid() = user_id);

-- Policy for admins to manage all access
CREATE POLICY "Admins can manage all console access"
ON public.user_console_access
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_user_console_access_updated_at
BEFORE UPDATE ON public.user_console_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();