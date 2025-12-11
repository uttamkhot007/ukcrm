import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  RefreshCw,
} from 'lucide-react';
import { CyberSecurityNewsBar } from '@/components/dashboard/CyberSecurityNewsBar';

interface LearningCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  progress: number;
  modules: number;
  completedModules: number;
  tags: string[];
  instructor?: string;
}

const salesCourses: LearningCourse[] = [
  {
    id: 'sales-1',
    title: 'Consultative Selling Mastery',
    description: 'Learn to understand customer needs and provide tailored solutions',
    category: 'Sales Methodology',
    duration: '4 hours',
    level: 'intermediate',
    progress: 65,
    modules: 8,
    completedModules: 5,
    tags: ['consultative', 'needs analysis', 'solution selling'],
    instructor: 'Sarah Johnson',
  },
  {
    id: 'sales-2',
    title: 'Cybersecurity Sales Fundamentals',
    description: 'Understanding cybersecurity products and how to position them',
    category: 'Product Knowledge',
    duration: '6 hours',
    level: 'beginner',
    progress: 30,
    modules: 12,
    completedModules: 4,
    tags: ['cybersecurity', 'product', 'positioning'],
    instructor: 'Michael Chen',
  },
  {
    id: 'sales-3',
    title: 'Objection Handling Techniques',
    description: 'Master the art of handling common sales objections',
    category: 'Sales Skills',
    duration: '2 hours',
    level: 'beginner',
    progress: 100,
    modules: 5,
    completedModules: 5,
    tags: ['objections', 'negotiation', 'closing'],
    instructor: 'David Miller',
  },
  {
    id: 'sales-4',
    title: 'Enterprise Deal Management',
    description: 'Navigate complex enterprise sales cycles effectively',
    category: 'Enterprise Sales',
    duration: '8 hours',
    level: 'advanced',
    progress: 0,
    modules: 15,
    completedModules: 0,
    tags: ['enterprise', 'stakeholders', 'complex deals'],
    instructor: 'Lisa Park',
  },
  {
    id: 'sales-5',
    title: 'ROI & Business Case Building',
    description: 'Create compelling business cases for security investments',
    category: 'Value Selling',
    duration: '3 hours',
    level: 'intermediate',
    progress: 45,
    modules: 6,
    completedModules: 3,
    tags: ['ROI', 'business case', 'value proposition'],
    instructor: 'James Wilson',
  },
  {
    id: 'sales-6',
    title: 'Competitive Intelligence',
    description: 'Understand and position against key competitors',
    category: 'Market Knowledge',
    duration: '4 hours',
    level: 'intermediate',
    progress: 20,
    modules: 8,
    completedModules: 2,
    tags: ['competition', 'battlecards', 'differentiation'],
    instructor: 'Emily Brown',
  },
];

const presalesCourses: LearningCourse[] = [
  {
    id: 'presales-1',
    title: 'Technical Discovery Deep Dive',
    description: 'Master the art of technical discovery and requirement gathering',
    category: 'Discovery',
    duration: '5 hours',
    level: 'intermediate',
    progress: 80,
    modules: 10,
    completedModules: 8,
    tags: ['discovery', 'requirements', 'architecture'],
    instructor: 'Alex Thompson',
  },
  {
    id: 'presales-2',
    title: 'POC Design & Execution',
    description: 'Plan and execute successful proof of concept demonstrations',
    category: 'POC Management',
    duration: '6 hours',
    level: 'advanced',
    progress: 50,
    modules: 12,
    completedModules: 6,
    tags: ['POC', 'demo', 'success criteria'],
    instructor: 'Rachel Green',
  },
  {
    id: 'presales-3',
    title: 'RFP Response Excellence',
    description: 'Create winning RFP responses with technical accuracy',
    category: 'RFP/RFI',
    duration: '4 hours',
    level: 'intermediate',
    progress: 100,
    modules: 8,
    completedModules: 8,
    tags: ['RFP', 'proposal', 'technical writing'],
    instructor: 'Chris Martinez',
  },
  {
    id: 'presales-4',
    title: 'Security Architecture Fundamentals',
    description: 'Understand modern security architectures and frameworks',
    category: 'Technical',
    duration: '10 hours',
    level: 'advanced',
    progress: 25,
    modules: 20,
    completedModules: 5,
    tags: ['architecture', 'frameworks', 'zero trust'],
    instructor: 'Dr. Kevin Lee',
  },
  {
    id: 'presales-5',
    title: 'Demo Storytelling',
    description: 'Create compelling technical demonstrations that resonate',
    category: 'Presentation',
    duration: '3 hours',
    level: 'beginner',
    progress: 0,
    modules: 6,
    completedModules: 0,
    tags: ['demo', 'storytelling', 'engagement'],
    instructor: 'Amanda Davis',
  },
  {
    id: 'presales-6',
    title: 'Cloud Security Positioning',
    description: 'Position security solutions in cloud-first environments',
    category: 'Cloud',
    duration: '5 hours',
    level: 'intermediate',
    progress: 60,
    modules: 10,
    completedModules: 6,
    tags: ['cloud', 'AWS', 'Azure', 'GCP'],
    instructor: 'Tom Anderson',
  },
];

const cyberTopics = [
  {
    id: 'cyber-1',
    title: 'Zero Trust Architecture',
    description: 'Understanding and implementing zero trust security models',
    icon: Lock,
    articles: 12,
    isNew: true,
  },
  {
    id: 'cyber-2',
    title: 'Ransomware Defense',
    description: 'Latest ransomware trends and defense strategies',
    icon: Bug,
    articles: 8,
    isNew: true,
  },
  {
    id: 'cyber-3',
    title: 'Cloud Security',
    description: 'Securing multi-cloud and hybrid environments',
    icon: Server,
    articles: 15,
    isNew: false,
  },
  {
    id: 'cyber-4',
    title: 'AI in Cybersecurity',
    description: 'How AI is transforming threat detection and response',
    icon: Zap,
    articles: 6,
    isNew: true,
  },
  {
    id: 'cyber-5',
    title: 'Threat Intelligence',
    description: 'Latest threat actors and attack patterns',
    icon: Globe,
    articles: 20,
    isNew: false,
  },
  {
    id: 'cyber-6',
    title: 'Compliance & Regulations',
    description: 'GDPR, HIPAA, SOC2 and emerging regulations',
    icon: FileText,
    articles: 10,
    isNew: false,
  },
];

export function LearningHubModule() {
  const [activeTab, setActiveTab] = useState('sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

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

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-green-500';
    if (progress > 50) return 'bg-yellow-500';
    return 'bg-primary';
  };

  const filterCourses = (courses: LearningCourse[]) => {
    return courses.filter((course) => {
      const matchesSearch =
        searchQuery === '' ||
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesLevel = !selectedLevel || course.level === selectedLevel;
      return matchesSearch && matchesLevel;
    });
  };

  const CourseCard = ({ course }: { course: LearningCourse }) => (
    <Card className="hover:shadow-lg transition-all duration-200 hover:border-primary/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
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
            {course.duration}
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {course.modules} modules
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
              {course.completedModules}/{course.modules} modules
            </span>
          </div>
          <Progress value={course.progress} className={getProgressColor(course.progress)} />
        </div>

        <div className="flex flex-wrap gap-1">
          {course.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          {course.progress === 100 ? (
            <Button variant="outline" className="flex-1" size="sm">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Review
            </Button>
          ) : course.progress > 0 ? (
            <Button className="flex-1" size="sm">
              <Play className="h-4 w-4 mr-2" />
              Continue
            </Button>
          ) : (
            <Button className="flex-1" size="sm">
              <Play className="h-4 w-4 mr-2" />
              Start Course
            </Button>
          )}
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const salesFiltered = filterCourses(salesCourses);
  const presalesFiltered = filterCourses(presalesCourses);

  const totalSalesProgress = Math.round(
    salesCourses.reduce((acc, c) => acc + c.progress, 0) / salesCourses.length
  );
  const totalPresalesProgress = Math.round(
    presalesCourses.reduce((acc, c) => acc + c.progress, 0) / presalesCourses.length
  );

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
            Level 12
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{salesCourses.filter((c) => c.progress === 100).length}</p>
                <p className="text-sm text-muted-foreground">Sales Completed</p>
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
                <p className="text-2xl font-bold">{presalesCourses.filter((c) => c.progress === 100).length}</p>
                <p className="text-sm text-muted-foreground">Presales Completed</p>
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
                <p className="text-2xl font-bold">{totalSalesProgress}%</p>
                <p className="text-sm text-muted-foreground">Sales Progress</p>
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
                <p className="text-2xl font-bold">{totalPresalesProgress}%</p>
                <p className="text-sm text-muted-foreground">Presales Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Sales Training
          </TabsTrigger>
          <TabsTrigger value="presales" className="flex items-center gap-2">
            <Presentation className="h-4 w-4" />
            Presales Training
          </TabsTrigger>
          <TabsTrigger value="cybersecurity" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Cybersecurity News
          </TabsTrigger>
        </TabsList>

        {/* Search and Filter - for training tabs */}
        {(activeTab === 'sales' || activeTab === 'presales') && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {salesFiltered.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
          {salesFiltered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No courses found matching your criteria
            </div>
          )}
        </TabsContent>

        <TabsContent value="presales" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presalesFiltered.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
          {presalesFiltered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No courses found matching your criteria
            </div>
          )}
        </TabsContent>

        <TabsContent value="cybersecurity" className="space-y-6">
          {/* Cyber Topics Grid */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              Trending Topics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cyberTopics.map((topic) => (
                <Card
                  key={topic.id}
                  className="hover:shadow-lg transition-all duration-200 hover:border-primary/50 cursor-pointer"
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <topic.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{topic.title}</h4>
                          {topic.isNew && (
                            <Badge variant="default" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">{topic.articles} articles</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Latest News Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Latest Security News & Alerts
            </h3>
            <CyberSecurityNewsBar showKnowledgeBase={true} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
