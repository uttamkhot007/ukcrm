-- Learning Courses table
CREATE TABLE public.learning_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  team_type TEXT NOT NULL DEFAULT 'all', -- 'sales', 'presales', 'all'
  duration_minutes INTEGER DEFAULT 60,
  level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  modules_count INTEGER DEFAULT 1,
  instructor TEXT,
  tags TEXT[] DEFAULT '{}',
  content TEXT, -- Rich text content for the course
  video_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Learning Progress tracking
CREATE TABLE public.learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  completed_modules INTEGER DEFAULT 0,
  progress_percent INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Cybersecurity News table
CREATE TABLE public.cybersecurity_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  summary TEXT,
  full_content TEXT,
  category TEXT NOT NULL, -- 'threat', 'vulnerability', 'compliance', 'technology', 'best_practice'
  severity TEXT DEFAULT 'info', -- 'info', 'low', 'medium', 'high', 'critical'
  source_url TEXT,
  source_name TEXT,
  affected_systems TEXT[],
  recommendations TEXT[],
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cybersecurity_news ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_courses
CREATE POLICY "Users can view active courses"
ON public.learning_courses FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage courses"
ON public.learning_courses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for learning_progress
CREATE POLICY "Users can view their own progress"
ON public.learning_progress FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own progress"
ON public.learning_progress FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress"
ON public.learning_progress FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own progress"
ON public.learning_progress FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for cybersecurity_news
CREATE POLICY "Users can view published news"
ON public.cybersecurity_news FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can manage news"
ON public.cybersecurity_news FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_learning_courses_updated_at
BEFORE UPDATE ON public.learning_courses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learning_progress_updated_at
BEFORE UPDATE ON public.learning_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cybersecurity_news_updated_at
BEFORE UPDATE ON public.cybersecurity_news
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();