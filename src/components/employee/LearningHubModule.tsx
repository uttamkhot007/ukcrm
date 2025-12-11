import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen,
  Play,
  Clock,
  Award,
  TrendingUp,
  Shield,
  Target,
  Users,
  Presentation,
  FileText,
  ExternalLink,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Zap,
  Globe,
  Lock,
  Bug,
  Server,
  Newspaper,
  Plus,
  Loader2,
  Trash2,
  Edit,
  Phone,
  Megaphone,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

interface LearningCourse {
  id: string;
  title: string;
  description: string | null;
  category: string;
  team_type: string;
  duration_minutes: number;
  level: string;
  modules_count: number;
  instructor: string | null;
  tags: string[];
  content: string | null;
  video_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface LearningProgress {
  id: string;
  course_id: string;
  completed_modules: number;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
}

interface CybersecurityNews {
  id: string;
  title: string;
  summary: string | null;
  full_content: string | null;
  category: string;
  severity: string;
  source_url: string | null;
  source_name: string | null;
  affected_systems: string[] | null;
  recommendations: string[] | null;
  published_at: string;
}

export function LearningHubModule() {
  const [activeTab, setActiveTab] = useState('sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isAddNewsOpen, setIsAddNewsOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<LearningCourse | null>(null);
  const [expandedNews, setExpandedNews] = useState<string | null>(null);
  
  const { user, profile } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  
  const isAdmin = profile?.is_super_admin || (profile?.user_category as string) === 'admin' || (profile?.user_category as string) === 'employee';

  // Fetch courses
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['learning-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_courses')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as LearningCourse[];
    },
  });

  // Fetch user progress
  const { data: userProgress = [] } = useQuery({
    queryKey: ['learning-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as LearningProgress[];
    },
    enabled: !!user?.id,
  });

  // Fetch cybersecurity news
  const { data: news = [], isLoading: newsLoading } = useQuery({
    queryKey: ['cybersecurity-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cybersecurity_news')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data as CybersecurityNews[];
    },
  });

  // Add course mutation
  const addCourseMutation = useMutation({
    mutationFn: async (courseData: Partial<LearningCourse>) => {
      const { data, error } = await supabase
        .from('learning_courses')
        .insert([{
          title: courseData.title!,
          description: courseData.description,
          category: courseData.category!,
          team_type: courseData.team_type || 'all',
          duration_minutes: courseData.duration_minutes || 60,
          level: courseData.level || 'beginner',
          modules_count: courseData.modules_count || 1,
          instructor: courseData.instructor,
          tags: courseData.tags || [],
          content: courseData.content,
          video_url: courseData.video_url,
          created_by: user?.id!,
          tenant_id: currentTenant?.id,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-courses'] });
      setIsAddCourseOpen(false);
      toast.success('Course added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add course: ' + error.message);
    },
  });

  // Add news mutation
  const addNewsMutation = useMutation({
    mutationFn: async (newsData: Partial<CybersecurityNews>) => {
      const { data, error } = await supabase
        .from('cybersecurity_news')
        .insert([{
          title: newsData.title!,
          summary: newsData.summary,
          full_content: newsData.full_content,
          category: newsData.category!,
          severity: newsData.severity || 'info',
          source_url: newsData.source_url,
          source_name: newsData.source_name,
          affected_systems: newsData.affected_systems || [],
          recommendations: newsData.recommendations || [],
          created_by: user?.id!,
          tenant_id: currentTenant?.id,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cybersecurity-news'] });
      setIsAddNewsOpen(false);
      toast.success('News added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add news: ' + error.message);
    },
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ courseId, progress }: { courseId: string; progress: number }) => {
      const course = courses.find(c => c.id === courseId);
      const completedModules = Math.round((progress / 100) * (course?.modules_count || 1));
      
      const { data, error } = await supabase
        .from('learning_progress')
        .upsert({
          user_id: user?.id,
          course_id: courseId,
          progress_percent: progress,
          completed_modules: completedModules,
          completed_at: progress === 100 ? new Date().toISOString() : null,
          last_accessed_at: new Date().toISOString(),
          tenant_id: currentTenant?.id,
        }, {
          onConflict: 'user_id,course_id',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-progress'] });
    },
  });

  const getProgressForCourse = (courseId: string) => {
    const progress = userProgress.find(p => p.course_id === courseId);
    return progress?.progress_percent || 0;
  };

  const getCompletedModules = (courseId: string) => {
    const progress = userProgress.find(p => p.course_id === courseId);
    return progress?.completed_modules || 0;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'intermediate':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'advanced':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'threat':
        return AlertTriangle;
      case 'vulnerability':
        return Bug;
      case 'compliance':
        return FileText;
      case 'technology':
        return Server;
      case 'best_practice':
        return Shield;
      default:
        return Newspaper;
    }
  };

  const filterCourses = (teamType: string) => {
    return courses.filter((course) => {
      const matchesTeam = course.team_type === teamType || course.team_type === 'all';
      const matchesSearch =
        searchQuery === '' ||
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesLevel = !selectedLevel || course.level === selectedLevel;
      return matchesTeam && matchesSearch && matchesLevel;
    });
  };

  const handleStartCourse = (courseId: string) => {
    const currentProgress = getProgressForCourse(courseId);
    if (currentProgress === 0) {
      updateProgressMutation.mutate({ courseId, progress: 10 });
    }
    setSelectedCourse(courses.find(c => c.id === courseId) || null);
  };

  const handleContinueCourse = (courseId: string) => {
    const currentProgress = getProgressForCourse(courseId);
    const newProgress = Math.min(currentProgress + 20, 100);
    updateProgressMutation.mutate({ courseId, progress: newProgress });
    toast.success(`Progress updated to ${newProgress}%`);
  };

  const CourseCard = ({ course }: { course: LearningCourse }) => {
    const progress = getProgressForCourse(course.id);
    const completedModules = getCompletedModules(course.id);
    
    return (
      <Card className="hover:shadow-lg transition-all duration-200 hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-base">{course.title}</CardTitle>
              <CardDescription className="text-sm">{course.description}</CardDescription>
            </div>
            <Badge variant="outline" className={getLevelColor(course.level)}>
              {course.level}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {Math.round(course.duration_minutes / 60)}h {course.duration_minutes % 60}m
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {course.modules_count} modules
            </div>
            {course.instructor && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {course.instructor}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {completedModules}/{course.modules_count} modules
              </span>
            </div>
            <Progress value={progress} />
          </div>

          {course.tags && course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {course.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {progress === 100 ? (
              <Button variant="outline" className="flex-1" size="sm" onClick={() => setSelectedCourse(course)}>
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Review
              </Button>
            ) : progress > 0 ? (
              <Button className="flex-1" size="sm" onClick={() => handleContinueCourse(course.id)}>
                <Play className="h-4 w-4 mr-2" />
                Continue
              </Button>
            ) : (
              <Button className="flex-1" size="sm" onClick={() => handleStartCourse(course.id)}>
                <Play className="h-4 w-4 mr-2" />
                Start Course
              </Button>
            )}
            {course.video_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={course.video_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const salesCourses = filterCourses('sales');
  const presalesCourses = filterCourses('presales');
  const insideSalesCourses = filterCourses('inside_sales');
  const marketingCourses = filterCourses('marketing');

  const totalCoursesCompleted = userProgress.filter(p => p.progress_percent === 100).length;
  const averageProgress = userProgress.length > 0 
    ? Math.round(userProgress.reduce((acc, p) => acc + p.progress_percent, 0) / userProgress.length) 
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Learning Hub
          </h1>
          <p className="text-muted-foreground">
            Enhance your skills with curated learning paths and stay updated on cybersecurity trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-3 py-1">
            <Award className="h-4 w-4 mr-2 text-yellow-500" />
            {totalCoursesCompleted} Completed
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses.filter(c => c.team_type === 'sales').length}</p>
                <p className="text-sm text-muted-foreground">Sales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Presentation className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses.filter(c => c.team_type === 'presales').length}</p>
                <p className="text-sm text-muted-foreground">Presales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Phone className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses.filter(c => c.team_type === 'inside_sales').length}</p>
                <p className="text-sm text-muted-foreground">Inside Sales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-lg">
                <Megaphone className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses.filter(c => c.team_type === 'marketing').length}</p>
                <p className="text-sm text-muted-foreground">Marketing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{averageProgress}%</p>
                <p className="text-sm text-muted-foreground">Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Shield className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{news.length}</p>
                <p className="text-sm text-muted-foreground">Security News</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <TabsList className="grid w-full lg:w-auto grid-cols-3 lg:grid-cols-5">
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Sales</span>
            </TabsTrigger>
            <TabsTrigger value="presales" className="flex items-center gap-2">
              <Presentation className="h-4 w-4" />
              <span className="hidden sm:inline">Presales</span>
            </TabsTrigger>
            <TabsTrigger value="inside_sales" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Inside Sales</span>
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Marketing</span>
            </TabsTrigger>
            <TabsTrigger value="cybersecurity" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security News</span>
            </TabsTrigger>
          </TabsList>
          
          {isAdmin && (
            <div className="flex gap-2">
              {['sales', 'presales', 'inside_sales', 'marketing'].includes(activeTab) && (
                <Dialog open={isAddCourseOpen} onOpenChange={setIsAddCourseOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Course</DialogTitle>
                      <DialogDescription>Create a new learning course for your team</DialogDescription>
                    </DialogHeader>
                    <AddCourseForm 
                      onSubmit={(data) => addCourseMutation.mutate(data)} 
                      isLoading={addCourseMutation.isPending}
                      defaultTeamType={activeTab}
                    />
                  </DialogContent>
                </Dialog>
              )}
              {activeTab === 'cybersecurity' && (
                <Dialog open={isAddNewsOpen} onOpenChange={setIsAddNewsOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add News
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Security News</DialogTitle>
                      <DialogDescription>Share important cybersecurity updates with your team</DialogDescription>
                    </DialogHeader>
                    <AddNewsForm 
                      onSubmit={(data) => addNewsMutation.mutate(data)} 
                      isLoading={addNewsMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>

        {/* Search and Filter - for training tabs */}
        {['sales', 'presales', 'inside_sales', 'marketing'].includes(activeTab) && (
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Button
                variant={selectedLevel === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLevel(null)}
              >
                All
              </Button>
              <Button
                variant={selectedLevel === 'beginner' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLevel('beginner')}
              >
                Beginner
              </Button>
              <Button
                variant={selectedLevel === 'intermediate' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLevel('intermediate')}
              >
                Intermediate
              </Button>
              <Button
                variant={selectedLevel === 'advanced' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLevel('advanced')}
              >
                Advanced
              </Button>
            </div>
          </div>
        )}

        <TabsContent value="sales" className="space-y-4">
          {coursesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : salesCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {salesCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No Sales Courses Available</p>
              <p className="text-muted-foreground">
                {isAdmin ? 'Click "Add Course" to create the first sales training course.' : 'Check back later for new courses.'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="presales" className="space-y-4">
          {coursesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : presalesCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {presalesCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Presentation className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No Presales Courses Available</p>
              <p className="text-muted-foreground">
                {isAdmin ? 'Click "Add Course" to create the first presales training course.' : 'Check back later for new courses.'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="inside_sales" className="space-y-4">
          {coursesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : insideSalesCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insideSalesCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No Inside Sales Courses Available</p>
              <p className="text-muted-foreground">
                {isAdmin ? 'Click "Add Course" to create the first inside sales training course.' : 'Check back later for new courses.'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="marketing" className="space-y-4">
          {coursesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : marketingCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketingCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No Marketing Courses Available</p>
              <p className="text-muted-foreground">
                {isAdmin ? 'Click "Add Course" to create the first marketing training course.' : 'Check back later for new courses.'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cybersecurity" className="space-y-6">
          {newsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : news.length > 0 ? (
            <div className="space-y-4">
              {news.map((item) => {
                const CategoryIcon = getCategoryIcon(item.category);
                const isExpanded = expandedNews === item.id;
                
                return (
                  <Card key={item.id} className="hover:shadow-lg transition-all duration-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <CategoryIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{item.title}</h4>
                              <p className="text-sm text-muted-foreground">{item.summary}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={getSeverityColor(item.severity)}>
                                {item.severity}
                              </Badge>
                              <Badge variant="secondary">{item.category}</Badge>
                            </div>
                          </div>
                          
                          {isExpanded && item.full_content && (
                            <div className="mt-4 space-y-4 border-t pt-4">
                              <p className="text-sm">{item.full_content}</p>
                              
                              {item.affected_systems && item.affected_systems.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium mb-2">Affected Systems:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {item.affected_systems.map((system, i) => (
                                      <Badge key={i} variant="outline">{system}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {item.recommendations && item.recommendations.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium mb-2">Recommendations:</p>
                                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    {item.recommendations.map((rec, i) => (
                                      <li key={i}>{rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {item.source_name && <span>Source: {item.source_name}</span>}
                              <span>•</span>
                              <span>{new Date(item.published_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setExpandedNews(isExpanded ? null : item.id)}
                              >
                                {isExpanded ? 'Show Less' : 'Read More'}
                              </Button>
                              {item.source_url && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No Security News Available</p>
              <p className="text-muted-foreground">
                {isAdmin ? 'Click "Add News" to share cybersecurity updates with your team.' : 'Check back later for security updates.'}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Course Content Dialog */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedCourse && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCourse.title}</DialogTitle>
                <DialogDescription>{selectedCourse.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline" className={getLevelColor(selectedCourse.level)}>
                    {selectedCourse.level}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {Math.round(selectedCourse.duration_minutes / 60)}h {selectedCourse.duration_minutes % 60}m
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {selectedCourse.modules_count} modules
                  </span>
                </div>
                
                {selectedCourse.content ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div dangerouslySetInnerHTML={{ __html: selectedCourse.content }} />
                  </div>
                ) : (
                  <p className="text-muted-foreground">No content available for this course yet.</p>
                )}
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setSelectedCourse(null)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    handleContinueCourse(selectedCourse.id);
                    setSelectedCourse(null);
                  }}>
                    Mark Progress
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add Course Form Component
function AddCourseForm({ 
  onSubmit, 
  isLoading, 
  defaultTeamType 
}: { 
  onSubmit: (data: Partial<LearningCourse>) => void; 
  isLoading: boolean;
  defaultTeamType: string;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    team_type: defaultTeamType,
    duration_minutes: 60,
    level: 'beginner',
    modules_count: 1,
    instructor: '',
    tags: '',
    content: '',
    video_url: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input 
            id="title" 
            value={formData.title} 
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Input 
            id="category" 
            value={formData.category} 
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            placeholder="e.g., Sales Methodology, Technical"
            required 
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea 
          id="description" 
          value={formData.description} 
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="team_type">Team Type</Label>
          <Select value={formData.team_type} onValueChange={(v) => setFormData(prev => ({ ...prev, team_type: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="presales">Presales</SelectItem>
              <SelectItem value="inside_sales">Inside Sales</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="all">All Teams</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="level">Level</Label>
          <Select value={formData.level} onValueChange={(v) => setFormData(prev => ({ ...prev, level: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input 
            id="duration" 
            type="number" 
            value={formData.duration_minutes} 
            onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="modules">Number of Modules</Label>
          <Input 
            id="modules" 
            type="number" 
            value={formData.modules_count} 
            onChange={(e) => setFormData(prev => ({ ...prev, modules_count: parseInt(e.target.value) || 1 }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instructor">Instructor</Label>
          <Input 
            id="instructor" 
            value={formData.instructor} 
            onChange={(e) => setFormData(prev => ({ ...prev, instructor: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input 
          id="tags" 
          value={formData.tags} 
          onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
          placeholder="e.g., negotiation, closing, enterprise"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="video_url">Video URL (optional)</Label>
        <Input 
          id="video_url" 
          value={formData.video_url} 
          onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Course Content</Label>
        <Textarea 
          id="content" 
          value={formData.content} 
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          className="min-h-[150px]"
          placeholder="Enter course content (supports HTML)"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Add Course
        </Button>
      </div>
    </form>
  );
}

// Add News Form Component
function AddNewsForm({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (data: Partial<CybersecurityNews>) => void; 
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    full_content: '',
    category: 'threat',
    severity: 'medium',
    source_url: '',
    source_name: '',
    affected_systems: '',
    recommendations: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      affected_systems: formData.affected_systems.split(',').map(s => s.trim()).filter(Boolean),
      recommendations: formData.recommendations.split('\n').map(r => r.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="news-title">Title *</Label>
        <Input 
          id="news-title" 
          value={formData.title} 
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required 
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea 
          id="summary" 
          value={formData.summary} 
          onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="news-category">Category *</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="threat">Threat</SelectItem>
              <SelectItem value="vulnerability">Vulnerability</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="best_practice">Best Practice</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="severity">Severity</Label>
          <Select value={formData.severity} onValueChange={(v) => setFormData(prev => ({ ...prev, severity: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="full_content">Full Content</Label>
        <Textarea 
          id="full_content" 
          value={formData.full_content} 
          onChange={(e) => setFormData(prev => ({ ...prev, full_content: e.target.value }))}
          className="min-h-[100px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="source_name">Source Name</Label>
          <Input 
            id="source_name" 
            value={formData.source_name} 
            onChange={(e) => setFormData(prev => ({ ...prev, source_name: e.target.value }))}
            placeholder="e.g., CISA, Krebs on Security"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source_url">Source URL</Label>
          <Input 
            id="source_url" 
            value={formData.source_url} 
            onChange={(e) => setFormData(prev => ({ ...prev, source_url: e.target.value }))}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="affected_systems">Affected Systems (comma-separated)</Label>
        <Input 
          id="affected_systems" 
          value={formData.affected_systems} 
          onChange={(e) => setFormData(prev => ({ ...prev, affected_systems: e.target.value }))}
          placeholder="e.g., Windows Server, Linux, Cloud"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recommendations">Recommendations (one per line)</Label>
        <Textarea 
          id="recommendations" 
          value={formData.recommendations} 
          onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
          placeholder="Enter each recommendation on a new line"
          className="min-h-[80px]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Add News
        </Button>
      </div>
    </form>
  );
}
