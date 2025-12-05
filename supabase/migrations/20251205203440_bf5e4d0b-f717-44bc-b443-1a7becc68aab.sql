-- Create function to promote a user to admin (for initial setup)
-- This can only be called by service role or directly in database
CREATE OR REPLACE FUNCTION public.promote_to_admin(_user_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  -- Get user_id from profiles
  SELECT user_id INTO _user_id FROM public.profiles WHERE email = _user_email;
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', _user_email;
  END IF;
  
  -- Update their role to admin
  UPDATE public.user_roles 
  SET role = 'admin' 
  WHERE user_id = _user_id;
END;
$$;