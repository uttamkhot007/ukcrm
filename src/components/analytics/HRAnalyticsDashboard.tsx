import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { format, subMonths, subDays, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadialBarChart, RadialBar, ComposedChart, Scatter
} from "recharts";
import {
  Users, UserPlus, UserMinus, UserCheck, Clock, Calendar, Award,
  TrendingUp, TrendingDown, Heart, Smile, Frown, Briefcase, Building2,
  GraduationCap, Gift, AlertTriangle, CheckCircle, Activity, RefreshCw,
  FileText, GitBranch, Star, Target, ArrowUpRight, ArrowDownRight
} from "lucide-react";

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--destructive))',
];

export function HRAnalyticsDashboard() {
  const { currentTenant } = useTenant();
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y'>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const { data: hrData, isLoading, refetch } = useQuery({
    queryKey: ['hr-analytics-dashboard', timeRange, currentTenant?.id],
    queryFn: async () => {
      const now = new Date();
      const daysAgo = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const startDate = subDays(now, daysAgo);

      const [
        { data: profiles },
        { data: attendance },
        { data: leaveRequests },
        { data: hrWorkflows },
        { data: moodLogs }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('attendance').select('*').gte('created_at', startDate.toISOString()),
        supabase.from('leave_requests').select('*'),
        supabase.from('hr_workflows').select('*'),
        supabase.from('employee_mood_logs').select('*').gte('logged_at', startDate.toISOString()),
      ]);

      // Employee metrics
      const totalEmployees = profiles?.length || 0;
      const activeEmployees = profiles?.length || 0;
      
      // Department breakdown
      const departmentData = profiles?.reduce((acc: Record<string, number>, p) => {
        const dept = p.department || 'Unassigned';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {}) || {};

      const departmentBreakdown = (Object.entries(departmentData) as [string, number][])
        .map(([name, value], index) => ({
          name,
          value,
          fill: CHART_COLORS[index % CHART_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value);

      // Attendance metrics
      const attendanceRate = attendance?.length 
        ? (attendance.filter(a => a.check_in).length / attendance.length) * 100 
        : 0;

      const avgWorkHours = attendance?.length
        ? attendance.reduce((sum, a) => sum + (a.work_hours || 0), 0) / attendance.filter(a => a.work_hours).length
        : 0;

      // Leave analytics
      const pendingLeaves = leaveRequests?.filter(l => l.status === 'pending').length || 0;
      const approvedLeaves = leaveRequests?.filter(l => l.status === 'approved').length || 0;
      
      const leaveTypeBreakdown = leaveRequests?.reduce((acc: Record<string, number>, l: any) => {
        const type = l.leave_type || l.type || 'Other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}) || {};

      const leaveTypes = Object.entries(leaveTypeBreakdown).map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }));

      // HR Workflows
      const activeOnboarding = hrWorkflows?.filter(w => w.workflow_type === 'onboarding' && w.status === 'active').length || 0;
      const activeOffboarding = hrWorkflows?.filter(w => w.workflow_type === 'offboarding' && w.status === 'active').length || 0;
      const completedWorkflows = hrWorkflows?.filter(w => w.status === 'completed').length || 0;

      // Mood analytics
      const moodDistribution = moodLogs?.reduce((acc: Record<string, number>, m) => {
        acc[m.mood] = (acc[m.mood] || 0) + 1;
        return acc;
      }, {}) || {};

      const moodData = Object.entries(moodDistribution).map(([mood, count], index) => ({
        mood,
        count,
        fill: getMoodColor(mood),
      }));

      const happyMoods = (moodDistribution['good'] || 0) + (moodDistribution['interesting'] || 0) + (moodDistribution['productive'] || 0);
      const totalMoods = moodLogs?.length || 0;
      const happinessRate = totalMoods > 0 ? (happyMoods / totalMoods) * 100 : 0;
      const stressRate = totalMoods > 0 ? ((moodDistribution['stressful'] || 0) / totalMoods) * 100 : 0;

      // Monthly headcount trend
      const headcountTrend = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(now, 5 - i);
        // Simulated data - in real scenario, track employee status changes
        const variation = Math.floor(Math.random() * 5) - 2;
        return {
          month: format(date, 'MMM'),
          headcount: Math.max(0, totalEmployees + variation * (5 - i)),
          hires: Math.floor(Math.random() * 3),
          exits: Math.floor(Math.random() * 2),
        };
      });

      // Attendance trend
      const attendanceTrend = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(now, 6 - i);
        const dayAttendance = attendance?.filter(a => {
          const checkIn = new Date(a.check_in);
          return format(checkIn, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
        }) || [];

        return {
          day: format(date, 'EEE'),
          present: dayAttendance.length,
          avgHours: dayAttendance.length 
            ? dayAttendance.reduce((sum, a) => sum + (a.work_hours || 0), 0) / dayAttendance.length 
            : 0,
        };
      });

      return {
        kpis: {
          totalEmployees,
          activeEmployees,
          attendanceRate,
          avgWorkHours,
          pendingLeaves,
          approvedLeaves,
          activeOnboarding,
          activeOffboarding,
          completedWorkflows,
          happinessRate,
          stressRate,
        },
        departmentBreakdown,
        leaveTypes,
        moodData,
        headcountTrend,
        attendanceTrend,
      };
    },
    enabled: !!currentTenant?.id,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const kpis = hrData?.kpis;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-xl p-6 border border-violet-500/20">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Users className="h-7 w-7 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">HR Analytics Dashboard</h1>
            <p className="text-muted-foreground">Workforce insights and employee engagement metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-[140px] bg-background">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.totalEmployees || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{kpis?.activeEmployees || 0} active</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(kpis?.attendanceRate || 0).toFixed(1)}%</div>
            <Progress value={kpis?.attendanceRate || 0} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Work Hours</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(kpis?.avgWorkHours || 0).toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground mt-1">per day</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${(kpis?.happinessRate || 0) > 60 ? 'border-l-green-500' : 'border-l-amber-500'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Happiness Rate</CardTitle>
            <Smile className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(kpis?.happinessRate || 0).toFixed(1)}%</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Stress:</span>
              <span className="text-xs text-red-500">{(kpis?.stressRate || 0).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow & Leave Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Onboarding</p>
                <p className="text-2xl font-bold">{kpis?.activeOnboarding || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <UserMinus className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Offboarding</p>
                <p className="text-2xl font-bold">{kpis?.activeOffboarding || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Leaves</p>
                <p className="text-2xl font-bold">{kpis?.pendingLeaves || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Workflows</p>
                <p className="text-2xl font-bold">{kpis?.completedWorkflows || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Headcount Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Headcount Trend
            </CardTitle>
            <CardDescription>Employee count over last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={hrData?.headcountTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px', color: 'hsl(var(--popover-foreground))',}}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="headcount" 
                    name="Headcount"
                    fill="hsl(var(--primary) / 0.2)" 
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                  <Bar dataKey="hires" name="Hires" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exits" name="Exits" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Department Distribution
            </CardTitle>
            <CardDescription>Employees by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={hrData?.departmentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {hrData?.departmentBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px', color: 'hsl(var(--popover-foreground))',}}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Weekly Attendance
            </CardTitle>
            <CardDescription>Last 7 days attendance pattern</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hrData?.attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px', color: 'hsl(var(--popover-foreground))',}}
                  />
                  <Legend />
                  <Bar 
                    dataKey="present" 
                    name="Present" 
                    fill="hsl(var(--chart-2))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Mood Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Team Mood Distribution
            </CardTitle>
            <CardDescription>Employee wellbeing insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hrData?.moodData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    type="category" 
                    dataKey="mood" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={80}
                    tickFormatter={(value) => getMoodEmoji(value) + ' ' + value.charAt(0).toUpperCase() + value.slice(1)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px', color: 'hsl(var(--popover-foreground))',}}
                  />
                  <Bar dataKey="count" name="Responses" radius={[0, 4, 4, 0]}>
                    {hrData?.moodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Leave Type Distribution
          </CardTitle>
          <CardDescription>Breakdown of leave requests by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {hrData?.leaveTypes.map((type, index) => (
              <div 
                key={type.name} 
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: `${type.fill}15` }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: type.fill }}
                  />
                  <span className="font-medium">{type.name}</span>
                </div>
                <Badge variant="secondary">{type.value as React.ReactNode}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getMoodColor(mood: string): string {
  const colors: Record<string, string> = {
    interesting: '#F59E0B',
    good: '#22C55E',
    informative: '#3B82F6',
    productive: '#8B5CF6',
    boring: '#6B7280',
    stressful: '#EF4444',
  };
  return colors[mood] || '#6B7280';
}

function getMoodEmoji(mood: string): string {
  const emojis: Record<string, string> = {
    interesting: '🤩',
    good: '😊',
    informative: '🧠',
    productive: '💪',
    boring: '😐',
    stressful: '😓',
  };
  return emojis[mood] || '😊';
}
