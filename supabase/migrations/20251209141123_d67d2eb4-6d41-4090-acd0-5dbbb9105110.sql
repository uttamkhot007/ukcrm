
-- =====================================================
-- SALES CRM FEATURES
-- =====================================================

-- Contact Lifecycle Stages
CREATE TABLE public.contact_lifecycle_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add lifecycle stage to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS lifecycle_stage_id UUID REFERENCES public.contact_lifecycle_stages(id);
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS lifecycle_updated_at TIMESTAMP WITH TIME ZONE;

-- Product Catalog
CREATE TABLE public.product_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  category TEXT,
  unit_price NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  specifications JSONB,
  tenant_id UUID REFERENCES public.tenants(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Deal Products (link products to deals)
CREATE TABLE public.deal_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.product_catalog(id),
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Territory Management
CREATE TABLE public.sales_territories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  region TEXT,
  country TEXT,
  criteria JSONB, -- Criteria for auto-assignment
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID REFERENCES public.tenants(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Territory Assignments
CREATE TABLE public.territory_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id UUID NOT NULL REFERENCES public.sales_territories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID
);

-- Add territory to deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES public.sales_territories(id);

-- Rotten Deals Configuration
CREATE TABLE public.rotten_deal_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage TEXT NOT NULL,
  max_days INTEGER NOT NULL DEFAULT 30,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- MARKETING AUTOMATION FEATURES
-- =====================================================

-- Web Form Captures
CREATE TABLE public.web_form_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_name TEXT NOT NULL,
  form_data JSONB NOT NULL,
  source_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ip_address TEXT,
  user_agent TEXT,
  converted_to_lead_id UUID REFERENCES public.leads(id),
  converted_to_contact_id UUID REFERENCES public.contacts(id),
  status TEXT DEFAULT 'new', -- new, processed, converted, spam
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Marketing Landing Pages
CREATE TABLE public.landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content JSONB, -- Page builder content
  meta_title TEXT,
  meta_description TEXT,
  status TEXT DEFAULT 'draft', -- draft, published, archived
  published_at TIMESTAMP WITH TIME ZONE,
  visits INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  form_id UUID,
  tenant_id UUID REFERENCES public.tenants(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email Templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  category TEXT,
  variables JSONB, -- Template variables
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  tenant_id UUID REFERENCES public.tenants(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Marketing Journeys
CREATE TABLE public.marketing_journeys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- form_submit, lifecycle_change, date_based, manual
  trigger_config JSONB,
  steps JSONB NOT NULL, -- Array of journey steps
  status TEXT DEFAULT 'draft', -- draft, active, paused, completed
  enrollments INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  tenant_id UUID REFERENCES public.tenants(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Journey Enrollments
CREATE TABLE public.journey_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES public.marketing_journeys(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id),
  lead_id UUID REFERENCES public.leads(id),
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, completed, exited
  entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  exit_reason TEXT
);

-- Lead Source Attribution
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS first_touch_source TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_touch_source TEXT;

-- =====================================================
-- HR/RECRUITMENT FEATURES
-- =====================================================

-- Job Postings
CREATE TABLE public.job_postings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  employment_type TEXT, -- full-time, part-time, contract, internship
  experience_level TEXT, -- entry, mid, senior, executive
  description TEXT NOT NULL,
  requirements TEXT,
  benefits TEXT,
  salary_min NUMERIC(12,2),
  salary_max NUMERIC(12,2),
  salary_currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft', -- draft, open, paused, closed
  published_at TIMESTAMP WITH TIME ZONE,
  closes_at TIMESTAMP WITH TIME ZONE,
  hiring_manager_id UUID,
  recruiter_id UUID,
  applications_count INTEGER DEFAULT 0,
  tenant_id UUID REFERENCES public.tenants(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Job Applicants (ATS)
CREATE TABLE public.job_applicants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  applicant_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  resume_url TEXT,
  cover_letter TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  source TEXT, -- career_page, linkedin, referral, job_board, etc.
  referral_source TEXT,
  current_stage TEXT DEFAULT 'applied', -- applied, screening, interview, offer, hired, rejected
  stage_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  rating INTEGER, -- 1-5 stars
  overall_score INTEGER,
  notes TEXT,
  is_archived BOOLEAN DEFAULT false,
  rejected_reason TEXT,
  offer_details JSONB,
  hired_at TIMESTAMP WITH TIME ZONE,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Interview Scorecards
CREATE TABLE public.interview_scorecards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id UUID NOT NULL REFERENCES public.job_applicants(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL,
  interview_type TEXT, -- phone, video, onsite, technical, cultural
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  scores JSONB, -- Criteria-based scores
  overall_rating INTEGER, -- 1-5
  recommendation TEXT, -- strong_yes, yes, no, strong_no
  strengths TEXT,
  concerns TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Offer Letters
CREATE TABLE public.offer_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id UUID NOT NULL REFERENCES public.job_applicants(id),
  job_id UUID NOT NULL REFERENCES public.job_postings(id),
  template_id UUID,
  salary NUMERIC(12,2) NOT NULL,
  salary_currency TEXT DEFAULT 'USD',
  start_date DATE,
  expiry_date DATE,
  benefits JSONB,
  additional_terms TEXT,
  document_url TEXT,
  status TEXT DEFAULT 'draft', -- draft, sent, accepted, declined, expired
  sent_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  signed_document_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Leave/Time-Off Policies
CREATE TABLE public.leave_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  leave_type TEXT NOT NULL, -- annual, sick, personal, maternity, paternity, bereavement, etc.
  days_per_year NUMERIC(5,2) NOT NULL,
  carryover_allowed BOOLEAN DEFAULT false,
  max_carryover_days NUMERIC(5,2) DEFAULT 0,
  requires_approval BOOLEAN DEFAULT true,
  min_notice_days INTEGER DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employee Leave Balances
CREATE TABLE public.leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  policy_id UUID NOT NULL REFERENCES public.leave_policies(id),
  year INTEGER NOT NULL,
  entitled_days NUMERIC(5,2) NOT NULL,
  used_days NUMERIC(5,2) DEFAULT 0,
  pending_days NUMERIC(5,2) DEFAULT 0,
  carryover_days NUMERIC(5,2) DEFAULT 0,
  adjustment_days NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, policy_id, year)
);

-- Leave Requests (Time-Off)
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number TEXT NOT NULL,
  user_id UUID NOT NULL,
  policy_id UUID NOT NULL REFERENCES public.leave_policies(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested NUMERIC(5,2) NOT NULL,
  is_half_day BOOLEAN DEFAULT false,
  half_day_type TEXT, -- first_half, second_half
  reason TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, cancelled
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Onboarding/Offboarding Checklists
CREATE TABLE public.hr_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- onboarding, offboarding
  department TEXT,
  items JSONB NOT NULL, -- Array of checklist items
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID REFERENCES public.tenants(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employee Checklist Assignments
CREATE TABLE public.employee_checklist_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  checklist_id UUID NOT NULL REFERENCES public.hr_checklists(id),
  completed_items JSONB DEFAULT '[]',
  progress_percent INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress', -- in_progress, completed
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE public.contact_lifecycle_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotten_deal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_form_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_checklist_assignments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Contact Lifecycle Stages
CREATE POLICY "Authenticated users can view lifecycle stages" ON public.contact_lifecycle_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage lifecycle stages" ON public.contact_lifecycle_stages FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Product Catalog
CREATE POLICY "Authenticated users can view products" ON public.product_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can manage products" ON public.product_catalog FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Deal Products
CREATE POLICY "Users with sales access can view deal products" ON public.deal_products FOR SELECT TO authenticated USING (has_sales_access(auth.uid()));
CREATE POLICY "Users with sales access can manage deal products" ON public.deal_products FOR ALL TO authenticated USING (has_sales_access(auth.uid()));

-- Sales Territories
CREATE POLICY "Authenticated users can view territories" ON public.sales_territories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage territories" ON public.sales_territories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Territory Assignments
CREATE POLICY "Authenticated users can view territory assignments" ON public.territory_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage territory assignments" ON public.territory_assignments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Rotten Deal Settings
CREATE POLICY "Authenticated users can view rotten deal settings" ON public.rotten_deal_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage rotten deal settings" ON public.rotten_deal_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Web Form Captures
CREATE POLICY "Users with sales/marketing access can view form captures" ON public.web_form_captures FOR SELECT TO authenticated USING (has_sales_access(auth.uid()));
CREATE POLICY "Admins can manage form captures" ON public.web_form_captures FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Landing Pages
CREATE POLICY "Authenticated users can view landing pages" ON public.landing_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can manage landing pages" ON public.landing_pages FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Email Templates
CREATE POLICY "Authenticated users can view email templates" ON public.email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can manage email templates" ON public.email_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Marketing Journeys
CREATE POLICY "Authenticated users can view marketing journeys" ON public.marketing_journeys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can manage marketing journeys" ON public.marketing_journeys FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Journey Enrollments
CREATE POLICY "Authenticated users can view journey enrollments" ON public.journey_enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can manage journey enrollments" ON public.journey_enrollments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Job Postings
CREATE POLICY "Authenticated users can view job postings" ON public.job_postings FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR and admins can manage job postings" ON public.job_postings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_team(auth.uid(), 'hr'));

-- Job Applicants
CREATE POLICY "HR and hiring managers can view applicants" ON public.job_applicants FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin') OR has_team(auth.uid(), 'hr'));
CREATE POLICY "HR can manage applicants" ON public.job_applicants FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_team(auth.uid(), 'hr'));

-- Interview Scorecards
CREATE POLICY "Interviewers can view and manage their scorecards" ON public.interview_scorecards FOR ALL TO authenticated USING (interviewer_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_team(auth.uid(), 'hr'));

-- Offer Letters
CREATE POLICY "HR and admins can view offer letters" ON public.offer_letters FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin') OR has_team(auth.uid(), 'hr'));
CREATE POLICY "HR can manage offer letters" ON public.offer_letters FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_team(auth.uid(), 'hr'));

-- Leave Policies
CREATE POLICY "Authenticated users can view leave policies" ON public.leave_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR and admins can manage leave policies" ON public.leave_policies FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_team(auth.uid(), 'hr'));

-- Leave Balances
CREATE POLICY "Users can view their own leave balances" ON public.leave_balances FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_team(auth.uid(), 'hr'));
CREATE POLICY "HR can manage leave balances" ON public.leave_balances FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_team(auth.uid(), 'hr'));

-- Leave Requests
CREATE POLICY "Users can view their own leave requests" ON public.leave_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_team(auth.uid(), 'hr') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can create their own leave requests" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own pending requests" ON public.leave_requests FOR UPDATE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_team(auth.uid(), 'hr') OR has_role(auth.uid(), 'manager'));

-- HR Checklists
CREATE POLICY "Authenticated users can view checklists" ON public.hr_checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR and admins can manage checklists" ON public.hr_checklists FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_team(auth.uid(), 'hr'));

-- Employee Checklist Assignments
CREATE POLICY "Users can view their own checklist assignments" ON public.employee_checklist_assignments FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_team(auth.uid(), 'hr'));
CREATE POLICY "Users can update their own checklist progress" ON public.employee_checklist_assignments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "HR can manage checklist assignments" ON public.employee_checklist_assignments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_team(auth.uid(), 'hr'));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Generate applicant number
CREATE OR REPLACE FUNCTION public.generate_applicant_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.applicant_number := 'APP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER set_applicant_number
BEFORE INSERT ON public.job_applicants
FOR EACH ROW EXECUTE FUNCTION generate_applicant_number();

-- Generate leave request number
CREATE OR REPLACE FUNCTION public.generate_leave_request_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.request_number := 'LV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER set_leave_request_number
BEFORE INSERT ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION generate_leave_request_number();

-- Update job posting application count
CREATE OR REPLACE FUNCTION public.update_job_application_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE job_postings SET applications_count = applications_count + 1 WHERE id = NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE job_postings SET applications_count = applications_count - 1 WHERE id = OLD.job_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE TRIGGER update_job_applications
AFTER INSERT OR DELETE ON public.job_applicants
FOR EACH ROW EXECUTE FUNCTION update_job_application_count();
