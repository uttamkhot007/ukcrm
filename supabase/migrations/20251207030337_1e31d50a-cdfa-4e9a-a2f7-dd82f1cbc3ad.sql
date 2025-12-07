-- Create a helper function to check if user is a customer
CREATE OR REPLACE FUNCTION public.is_customer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND user_category = 'customer'
  )
$$;

-- Create a helper function to check if user is an employee (any non-customer category)
CREATE OR REPLACE FUNCTION public.is_employee_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND (user_category IS NULL OR user_category != 'customer')
  )
$$;

-- Update RLS policies for tickets to allow customers to only see their own tickets
CREATE POLICY "Customers can view their own tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  (is_customer(auth.uid()) AND created_by = auth.uid())
  OR is_employee_user(auth.uid())
);

-- Allow customers to create tickets
CREATE POLICY "Customers can create tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
);