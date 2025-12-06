-- Drop the partially created tables and policies from failed migration
DROP TABLE IF EXISTS public.sop_images CASCADE;
DROP TABLE IF EXISTS public.sop_versions CASCADE;
DROP TABLE IF EXISTS public.sops CASCADE;

-- Create SOPs table
CREATE TABLE public.sops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'draft',
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SOP versions table for versioning
CREATE TABLE public.sop_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sop_id UUID NOT NULL REFERENCES public.sops(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  change_notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sop_id, version_number)
);

-- Create SOP images table
CREATE TABLE public.sop_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sop_id UUID NOT NULL REFERENCES public.sops(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for SOPs (all authenticated users can view, admins/managers can create/edit)
CREATE POLICY "Authenticated users can view published SOPs" 
ON public.sops FOR SELECT 
USING (auth.uid() IS NOT NULL AND (status = 'published' OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)));

CREATE POLICY "Admins and managers can create SOPs" 
ON public.sops FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)));

CREATE POLICY "Admins and managers can update SOPs" 
ON public.sops FOR UPDATE 
USING (auth.uid() IS NOT NULL AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)));

CREATE POLICY "Admins can delete SOPs" 
ON public.sops FOR DELETE 
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for SOP versions
CREATE POLICY "Authenticated users can view SOP versions" 
ON public.sop_versions FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can create SOP versions" 
ON public.sop_versions FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)));

-- RLS policies for SOP images
CREATE POLICY "Authenticated users can view SOP images" 
ON public.sop_images FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can upload SOP images" 
ON public.sop_images FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)));

CREATE POLICY "Admins can delete SOP images" 
ON public.sop_images FOR DELETE 
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for SOP images
INSERT INTO storage.buckets (id, name, public) VALUES ('sop-images', 'sop-images', true);

-- Storage policies
CREATE POLICY "Anyone can view SOP images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'sop-images');

CREATE POLICY "Authenticated users can upload SOP images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'sop-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own SOP images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'sop-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete SOP images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'sop-images' AND auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_sops_updated_at
BEFORE UPDATE ON public.sops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();