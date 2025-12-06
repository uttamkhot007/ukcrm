-- Create enum for user types (employees, contractors, vendors, distributors)
CREATE TYPE public.user_category AS ENUM ('employee', 'contractor', 'vendor', 'distributor');

-- Create enum for employment status
CREATE TYPE public.employment_status AS ENUM ('active', 'probation', 'pip', 'notice_period', 'inactive', 'terminated');

-- Create enum for sales sub-teams
CREATE TYPE public.sales_sub_team AS ENUM ('commercial', 'enterprise_govt', 'bfsi', 'international', 'alliance_india');

-- Create contractors table
CREATE TABLE public.contractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  designation TEXT,
  location TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  rate NUMERIC,
  rate_type TEXT DEFAULT 'hourly',
  department TEXT,
  manager_id UUID,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vendors table
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  category TEXT,
  payment_terms TEXT,
  bank_details TEXT,
  gst_number TEXT,
  pan_number TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create distributors table
CREATE TABLE public.distributors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  region TEXT,
  territory TEXT,
  discount_percentage NUMERIC DEFAULT 0,
  credit_limit NUMERIC DEFAULT 0,
  payment_terms TEXT,
  bank_details TEXT,
  gst_number TEXT,
  pan_number TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to profiles table for enhanced employee data
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS employee_code TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS anniversary_date DATE,
ADD COLUMN IF NOT EXISTS manager_id UUID,
ADD COLUMN IF NOT EXISTS employment_status public.employment_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS sales_sub_team public.sales_sub_team,
ADD COLUMN IF NOT EXISTS user_category public.user_category DEFAULT 'employee';

-- Create employee_sales_teams table to track which sales sub-team an employee belongs to
CREATE TABLE public.employee_sales_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sales_sub_team public.sales_sub_team NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sales_sub_team)
);

-- Enable RLS on all new tables
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_sales_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contractors
CREATE POLICY "Everyone can view contractors" ON public.contractors
FOR SELECT USING (true);

CREATE POLICY "Admins and managers can create contractors" ON public.contractors
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update contractors" ON public.contractors
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete contractors" ON public.contractors
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for vendors
CREATE POLICY "Everyone can view vendors" ON public.vendors
FOR SELECT USING (true);

CREATE POLICY "Admins and managers can create vendors" ON public.vendors
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update vendors" ON public.vendors
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete vendors" ON public.vendors
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for distributors
CREATE POLICY "Everyone can view distributors" ON public.distributors
FOR SELECT USING (true);

CREATE POLICY "Admins and managers can create distributors" ON public.distributors
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update distributors" ON public.distributors
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can delete distributors" ON public.distributors
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for employee_sales_teams
CREATE POLICY "Everyone can view sales teams" ON public.employee_sales_teams
FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage sales teams" ON public.employee_sales_teams
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create updated_at trigger for new tables
CREATE TRIGGER update_contractors_updated_at
  BEFORE UPDATE ON public.contractors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_distributors_updated_at
  BEFORE UPDATE ON public.distributors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();