import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import {
  Users, UserPlus, Calendar, Clock,
  ArrowRight, FileText, Award, TrendingUp,
  Briefcase, GraduationCap, Heart, Cake
} from "lucide-react";

interface HRModuleDashboardProps {
  onNavigate: (tab: string) => void;
}

export function HRModuleDashboard({ onNavigate }: HRModuleDashboardProps) {
  const { user } = useAuth();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const next7Days = addDays(now, 7);

  // Fetch HR metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['hr-dashboard-metrics'],
    queryFn: async () => {
      // Simplified queries with 'as any' to avoid type issues
      const { data: profiles, count: totalEmployees } = await supabase
        .from('profiles')
        .select('id, user_category, department, created_at', { count: 'exact' })
        .eq('user_category', 'employee') as any;

      const { data: workflows } = await supabase
        .from('hr_workflows')
        .select('id, workflow_type, status')
        .eq('status', 'active') as any;

      const allProfiles = profiles || [];
      const activeOnboarding = (workflows || []).filter((w: any) => w.workflow_type === 'onboarding').length;
      const activeOffboarding = (workflows || []).filter((w: any) => w.workflow_type === 'offboarding').length;

      const newHires = allProfiles.filter((p: any) => 
        new Date(p.created_at) >= monthStart && new Date(p.created_at) <= monthEnd
      ).length;

      const departments: Record<string, number> = {};
      allProfiles.forEach((p: any) => {
        const dept = p.department || 'Unassigned';
        departments[dept] = (departments[dept] || 0) + 1;
      });

      return {
        totalEmployees: totalEmployees || allProfiles.length,
        newHires,
        activeOnboarding,
        activeOffboarding,
        pendingLeaveRequests: 0,
        departments,
        upcomingBirthdays: 0,
        activeWorkflows: (workflows?.length || 0),
      };
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const topDepartments = Object.entries(metrics?.departments || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-hr/20 to-primary/10 rounded-xl p-6 border border-hr/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-hr" />
              HR Dashboard
            </h2>
            <p className="text-muted-foreground mt-1">
              People management overview for {format(now, 'MMMM yyyy')}
            </p>
          </div>
          <Button onClick={() => onNavigate('workflows')} className="bg-hr hover:bg-hr/90">
            <UserPlus className="h-4 w-4 mr-2" />
            HR Workflows
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('directory')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{metrics?.totalEmployees || 0}</p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  +{metrics?.newHires || 0} this month
                </p>
              </div>
              <div className="p-3 rounded-full bg-hr/20">
                <Users className="h-6 w-6 text-hr" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('workflows')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Onboarding</p>
                <p className="text-2xl font-bold text-blue-600">{metrics?.activeOnboarding || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">In progress</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/20">
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('people')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Leave</p>
                <p className="text-2xl font-bold text-amber-600">{metrics?.pendingLeaveRequests || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
              </div>
              <div className="p-3 rounded-full bg-amber-500/20">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Birthdays This Week</p>
                <p className="text-2xl font-bold text-pink-600">{metrics?.upcomingBirthdays || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Upcoming</p>
              </div>
              <div className="p-3 rounded-full bg-pink-500/20">
                <Cake className="h-6 w-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-hr" />
              Headcount by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topDepartments.map(([dept, count]) => (
                <div key={dept} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium truncate">{dept}</div>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <div 
                      className="h-full bg-hr flex items-center justify-end pr-2"
                      style={{ width: `${Math.min((count / (metrics?.totalEmployees || 1)) * 100, 100)}%` }}
                    >
                      <span className="text-white text-xs font-medium">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
              {topDepartments.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No department data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('directory')}>
              <Users className="h-4 w-4 mr-2" />
              Employee Directory
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('workflows')}>
              <UserPlus className="h-4 w-4 mr-2" />
              HR Workflows
              {metrics?.activeWorkflows ? (
                <Badge variant="secondary" className="ml-auto">{metrics.activeWorkflows}</Badge>
              ) : (
                <ArrowRight className="h-4 w-4 ml-auto" />
              )}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('skill-matrix')}>
              <Award className="h-4 w-4 mr-2" />
              Skill Matrix
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('salary')}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Salary & Benefits
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
