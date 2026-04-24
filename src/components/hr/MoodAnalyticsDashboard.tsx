import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { format, subDays, startOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { TrendingUp, TrendingDown, Users, Calendar, Smile, Frown } from "lucide-react";
import { Avatar3D } from "@/components/profile/Avatar3D";
import { Sparkles } from "lucide-react";

interface MoodLog {
  id: string;
  user_id: string;
  mood: string;
  mood_type: string | null;
  logged_at: string;
  notes: string | null;
  tenant_id: string | null;
}

interface MoodStats {
  mood: string;
  count: number;
  percentage: number;
}

interface DailyTrend {
  date: string;
  interesting: number;
  good: number;
  informative: number;
  productive: number;
  boring: number;
  stressful: number;
  total: number;
}

interface EmployeeMoodSummary {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
  dominant_mood: string;
  mood_count: number;
  stress_rate: number;
}

const moodConfig = {
  interesting: { emoji: "🤩", color: "#F59E0B", label: "Interesting" },
  good: { emoji: "😊", color: "#22C55E", label: "Good" },
  informative: { emoji: "🧠", color: "#3B82F6", label: "Informative" },
  productive: { emoji: "💪", color: "#8B5CF6", label: "Productive" },
  boring: { emoji: "😐", color: "#6B7280", label: "Boring" },
  stressful: { emoji: "😓", color: "#EF4444", label: "Stressful" },
};

const COLORS = ["#F59E0B", "#22C55E", "#3B82F6", "#8B5CF6", "#6B7280", "#EF4444"];

export function MoodAnalyticsDashboard() {
  const { currentTenant } = useTenant();
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [moodStats, setMoodStats] = useState<MoodStats[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [employeeSummaries, setEmployeeSummaries] = useState<EmployeeMoodSummary[]>([]);
  const [dateRange, setDateRange] = useState<"7" | "14" | "30">("7");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentTenant?.id) {
      fetchMoodData();
    }
  }, [dateRange, currentTenant?.id]);

  const fetchMoodData = async () => {
    if (!currentTenant?.id) return;
    
    setIsLoading(true);
    const days = parseInt(dateRange);
    const startDate = startOfDay(subDays(new Date(), days));

    try {
      // Fetch mood logs for current tenant
      const { data: logs, error } = await supabase
        .from("employee_mood_logs")
        .select("*")
        .eq("tenant_id", currentTenant!.id)
        .gte("logged_at", startDate.toISOString())
        .order("logged_at", { ascending: false });

      if (error) throw error;

      setMoodLogs(logs || []);

      // Calculate mood stats
      const moodCounts = (logs || []).reduce((acc: Record<string, number>, log) => {
        acc[log.mood] = (acc[log.mood] || 0) + 1;
        return acc;
      }, {});

      const total = logs?.length || 0;
      const stats = (Object.entries(moodCounts) as [string, number][]).map(([mood, count]) => ({
        mood,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
      setMoodStats(stats);

      // Calculate daily trends
      const dailyData: Record<string, DailyTrend> = {};
      for (let i = days; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "MMM dd");
        dailyData[date] = {
          date,
          interesting: 0,
          good: 0,
          informative: 0,
          productive: 0,
          boring: 0,
          stressful: 0,
          total: 0,
        };
      }

      (logs || []).forEach((log) => {
        const date = format(new Date(log.logged_at), "MMM dd");
        if (dailyData[date]) {
          const mood = log.mood;
          if (mood === 'interesting' || mood === 'good' || mood === 'informative' || mood === 'productive' || mood === 'boring' || mood === 'stressful') {
            dailyData[date][mood] += 1;
          }
          dailyData[date].total += 1;
        }
      });

      setDailyTrends(Object.values(dailyData));

      // Fetch employee summaries with profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, department");

      if (profiles && logs) {
        const userMoods: Record<string, { moods: Record<string, number>; profile: any }> = {};
        
        logs.forEach((log) => {
          if (!userMoods[log.user_id]) {
            const profile = profiles.find((p) => p.user_id === log.user_id);
            userMoods[log.user_id] = {
              moods: {},
              profile: profile || { full_name: "Unknown", avatar_url: null, department: null },
            };
          }
          userMoods[log.user_id].moods[log.mood] = (userMoods[log.user_id].moods[log.mood] || 0) + 1;
        });

        const summaries = Object.entries(userMoods).map(([userId, data]) => {
          const totalMoods = Object.values(data.moods).reduce((a, b) => a + b, 0);
          const dominantMood = Object.entries(data.moods).sort((a, b) => b[1] - a[1])[0]?.[0] || "good";
          const stressRate = Math.round(((data.moods["stressful"] || 0) / totalMoods) * 100);

          return {
            user_id: userId,
            full_name: data.profile.full_name,
            avatar_url: data.profile.avatar_url,
            department: data.profile.department,
            dominant_mood: dominantMood,
            mood_count: totalMoods,
            stress_rate: stressRate,
          };
        });

        // Sort by stress rate descending to show employees needing attention first
        summaries.sort((a, b) => b.stress_rate - a.stress_rate);
        setEmployeeSummaries(summaries);
      }
    } catch (error) {
      console.error("Error fetching mood data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const overallMoodScore = moodStats.length > 0
    ? Math.round(
        (moodStats.find((s) => s.mood === "good")?.percentage || 0) * 1 +
        (moodStats.find((s) => s.mood === "interesting")?.percentage || 0) * 1.2 +
        (moodStats.find((s) => s.mood === "informative")?.percentage || 0) * 0.8 -
        (moodStats.find((s) => s.mood === "boring")?.percentage || 0) * 0.3 -
        (moodStats.find((s) => s.mood === "stressful")?.percentage || 0) * 0.5
      ) / 10
    : 0;

  const stressedEmployees = employeeSummaries.filter((e) => e.stress_rate > 30);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Team Mood Analytics
          </h2>
          <p className="text-muted-foreground">
            Understand your team's wellbeing and improve workplace happiness
          </p>
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <p className="text-3xl font-bold">{overallMoodScore.toFixed(1)}</p>
              </div>
              {overallMoodScore >= 5 ? (
                <TrendingUp className="w-8 h-8 text-green-500" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Responses</p>
                <p className="text-3xl font-bold">{moodLogs.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Happy Rate</p>
                <p className="text-3xl font-bold">
                  {(moodStats.find((s) => s.mood === "good")?.percentage || 0) +
                    (moodStats.find((s) => s.mood === "interesting")?.percentage || 0)}%
                </p>
              </div>
              <Smile className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={stressedEmployees.length > 0 ? "border-red-500/50 bg-red-500/5" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Need Attention</p>
                <p className="text-3xl font-bold">{stressedEmployees.length}</p>
              </div>
              <Frown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mood Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Mood Distribution</CardTitle>
            <CardDescription>How the team feels overall</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={moodStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {moodStats.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={moodConfig[entry.mood as keyof typeof moodConfig]?.color || "#6B7280"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const config = moodConfig[data.mood as keyof typeof moodConfig];
                        return (
                          <div className="bg-background border rounded-lg p-2 shadow-lg">
                            <p className="font-medium">
                              {config?.emoji} {config?.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {data.count} responses ({data.percentage}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {Object.entries(moodConfig).map(([key, config]) => (
                <Badge key={key} variant="outline" className="gap-1">
                  {config.emoji} {config.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Trends</CardTitle>
            <CardDescription>Mood patterns over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="good" stroke="#22C55E" strokeWidth={2} />
                  <Line type="monotone" dataKey="stressful" stroke="#EF4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="interesting" stroke="#F59E0B" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees Needing Attention */}
      {stressedEmployees.length > 0 && (
        <Card className="border-red-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <Frown className="w-5 h-5" />
              Employees Needing Support
            </CardTitle>
            <CardDescription>
              These team members have reported higher stress levels recently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stressedEmployees.map((employee) => (
                <div
                  key={employee.user_id}
                  className="flex items-center gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20"
                >
                  <Avatar3D
                    name={employee.full_name}
                    avatarUrl={employee.avatar_url}
                    size="md"
                    showHoverEffect={false}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{employee.full_name}</p>
                    <p className="text-xs text-muted-foreground">{employee.department}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-red-500 font-medium">
                        {employee.stress_rate}% stress rate
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Employee Summaries */}
      <Card>
        <CardHeader>
          <CardTitle>Team Mood Overview</CardTitle>
          <CardDescription>Individual mood patterns for all employees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {employeeSummaries.slice(0, 12).map((employee) => {
              const config = moodConfig[employee.dominant_mood as keyof typeof moodConfig];
              return (
                <div
                  key={employee.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Avatar3D
                    name={employee.full_name}
                    avatarUrl={employee.avatar_url}
                    size="sm"
                    showHoverEffect={false}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{employee.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{employee.department}</p>
                  </div>
                  <span className="text-lg" title={config?.label}>
                    {config?.emoji}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}