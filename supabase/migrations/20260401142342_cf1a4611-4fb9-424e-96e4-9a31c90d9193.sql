
-- Marketing Campaigns
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'draft',
  budget NUMERIC DEFAULT 0,
  spent NUMERIC DEFAULT 0,
  leads_count INTEGER DEFAULT 0,
  conversions_count INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view marketing campaigns in their tenant"
  ON public.marketing_campaigns FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create marketing campaigns"
  ON public.marketing_campaigns FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update marketing campaigns in their tenant"
  ON public.marketing_campaigns FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete marketing campaigns in their tenant"
  ON public.marketing_campaigns FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Marketing Content
CREATE TABLE public.marketing_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'blog',
  status TEXT NOT NULL DEFAULT 'draft',
  author TEXT,
  views_count INTEGER DEFAULT 0,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view marketing content in their tenant"
  ON public.marketing_content FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create marketing content"
  ON public.marketing_content FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update marketing content in their tenant"
  ON public.marketing_content FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete marketing content in their tenant"
  ON public.marketing_content FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- PR Media Coverage
CREATE TABLE public.pr_media_coverage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  headline TEXT NOT NULL,
  outlet TEXT,
  sentiment TEXT DEFAULT 'neutral',
  coverage_date DATE,
  reach INTEGER DEFAULT 0,
  author_name TEXT,
  url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pr_media_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view PR coverage in their tenant"
  ON public.pr_media_coverage FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create PR coverage"
  ON public.pr_media_coverage FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update PR coverage in their tenant"
  ON public.pr_media_coverage FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete PR coverage in their tenant"
  ON public.pr_media_coverage FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- PR Events
CREATE TABLE public.pr_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'conference',
  status TEXT DEFAULT 'planning',
  event_date DATE,
  location TEXT,
  role TEXT,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pr_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view PR events in their tenant"
  ON public.pr_events FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create PR events"
  ON public.pr_events FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update PR events in their tenant"
  ON public.pr_events FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete PR events in their tenant"
  ON public.pr_events FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Communications Releases (Press Releases)
CREATE TABLE public.communications_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  distribution_outlet TEXT,
  author TEXT,
  content TEXT,
  scheduled_date DATE,
  published_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.communications_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view releases in their tenant"
  ON public.communications_releases FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create releases"
  ON public.communications_releases FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update releases in their tenant"
  ON public.communications_releases FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete releases in their tenant"
  ON public.communications_releases FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Communications Announcements
CREATE TABLE public.communications_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  type TEXT DEFAULT 'internal',
  status TEXT NOT NULL DEFAULT 'draft',
  audience TEXT,
  content TEXT,
  scheduled_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.communications_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view announcements in their tenant"
  ON public.communications_announcements FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create announcements"
  ON public.communications_announcements FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update announcements in their tenant"
  ON public.communications_announcements FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete announcements in their tenant"
  ON public.communications_announcements FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Media Contacts
CREATE TABLE public.media_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  outlet TEXT,
  role TEXT,
  email TEXT,
  phone TEXT,
  beat TEXT,
  last_contact_date DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.media_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media contacts in their tenant"
  ON public.media_contacts FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create media contacts"
  ON public.media_contacts FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update media contacts in their tenant"
  ON public.media_contacts FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete media contacts in their tenant"
  ON public.media_contacts FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Updated_at triggers for all new tables
CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketing_content_updated_at BEFORE UPDATE ON public.marketing_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pr_media_coverage_updated_at BEFORE UPDATE ON public.pr_media_coverage FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pr_events_updated_at BEFORE UPDATE ON public.pr_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_communications_releases_updated_at BEFORE UPDATE ON public.communications_releases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_communications_announcements_updated_at BEFORE UPDATE ON public.communications_announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_media_contacts_updated_at BEFORE UPDATE ON public.media_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
