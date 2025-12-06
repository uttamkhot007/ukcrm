import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, subMonths, isWeekend, setHours, setMinutes } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Clock, Users, TrendingUp, Calendar, Timer, BarChart3, Download, AlertTriangle, FileText, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in: string;
  check_out: string | null;
  work_hours: number | null;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

// Default work start time (9:00 AM)
const WORK_START_HOUR = 9;
const WORK_START_MINUTE = 0;
const LATE_THRESHOLD_MINUTES = 15; // Grace period

export function AttendanceReports() {
  const { isManager, isAdmin } = useAuth();
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly" | "late">("weekly");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  const canViewReports = isManager || isAdmin;

  // Get all attendance records for the selected period
  const { data: attendanceData = [], isLoading } = useQuery({
    queryKey: ["attendance-reports", selectedMonth, viewMode],
    enabled: canViewReports,
    queryFn: async () => {
      const monthDate = new Date(selectedMonth + "-01");
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .gte("check_in", monthStart.toISOString())
        .lte("check_in", monthEnd.toISOString())
        .order("check_in", { ascending: true });

      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });

  // Get profiles for user names
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-for-attendance"],
    enabled: canViewReports,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, department");
      if (error) throw error;
      return data;
    },
  });

  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.full_name || "Unknown";
  };

  const getProfileDepartment = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.department || "N/A";
  };

  // Check if a check-in is late
  const isLateArrival = (checkIn: string): boolean => {
    const checkInDate = parseISO(checkIn);
    const workStart = setMinutes(setHours(checkInDate, WORK_START_HOUR), WORK_START_MINUTE + LATE_THRESHOLD_MINUTES);
    return checkInDate > workStart;
  };

  // Get late arrival minutes
  const getLateMinutes = (checkIn: string): number => {
    const checkInDate = parseISO(checkIn);
    const workStart = setMinutes(setHours(checkInDate, WORK_START_HOUR), WORK_START_MINUTE);
    const diff = (checkInDate.getTime() - workStart.getTime()) / (1000 * 60);
    return Math.max(0, Math.round(diff));
  };

  // Get late arrivals data
  const getLateArrivals = () => {
    return attendanceData
      .filter(r => isLateArrival(r.check_in))
      .map(r => ({
        ...r,
        name: getProfileName(r.user_id),
        department: getProfileDepartment(r.user_id),
        date: format(parseISO(r.check_in), "MMM d, yyyy"),
        checkInTime: format(parseISO(r.check_in), "hh:mm a"),
        lateMinutes: getLateMinutes(r.check_in),
      }))
      .sort((a, b) => b.lateMinutes - a.lateMinutes);
  };

  // Late arrivals by employee
  const getLateArrivalsByEmployee = () => {
    const lateMap = new Map<string, { count: number; totalMinutes: number }>();
    
    attendanceData.forEach(record => {
      if (isLateArrival(record.check_in)) {
        const current = lateMap.get(record.user_id) || { count: 0, totalMinutes: 0 };
        lateMap.set(record.user_id, {
          count: current.count + 1,
          totalMinutes: current.totalMinutes + getLateMinutes(record.check_in),
        });
      }
    });

    return Array.from(lateMap.entries())
      .map(([userId, data]) => ({
        name: getProfileName(userId),
        userId,
        lateCount: data.count,
        avgLateMinutes: Math.round(data.totalMinutes / data.count),
      }))
      .sort((a, b) => b.lateCount - a.lateCount);
  };

  // Calculate stats
  const lateArrivals = attendanceData.filter(r => isLateArrival(r.check_in));
  const stats = {
    totalRecords: attendanceData.length,
    uniqueEmployees: new Set(attendanceData.map(r => r.user_id)).size,
    totalHours: attendanceData.reduce((sum, r) => sum + (r.work_hours || 0), 0),
    avgHoursPerDay: attendanceData.length > 0 
      ? (attendanceData.reduce((sum, r) => sum + (r.work_hours || 0), 0) / attendanceData.length).toFixed(1)
      : 0,
    lateArrivals: lateArrivals.length,
    latePercentage: attendanceData.length > 0 
      ? ((lateArrivals.length / attendanceData.length) * 100).toFixed(1)
      : 0,
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Date", "Employee", "Department", "Check In", "Check Out", "Work Hours", "Late Arrival", "Late Minutes"];
    const rows = attendanceData.map(r => [
      format(parseISO(r.check_in), "yyyy-MM-dd"),
      getProfileName(r.user_id),
      getProfileDepartment(r.user_id),
      format(parseISO(r.check_in), "HH:mm"),
      r.check_out ? format(parseISO(r.check_out), "HH:mm") : "",
      r.work_hours?.toFixed(2) || "",
      isLateArrival(r.check_in) ? "Yes" : "No",
      isLateArrival(r.check_in) ? getLateMinutes(r.check_in).toString() : "0",
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance-report-${selectedMonth}.csv`;
    link.click();
    toast.success("CSV exported successfully");
  };

  // Export to PDF (simplified HTML-based PDF)
  const exportToPDF = () => {
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report - ${format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
          .stats { display: flex; gap: 20px; margin: 20px 0; }
          .stat-box { padding: 15px; background: #f9f9f9; border-radius: 8px; }
          .late { color: #dc2626; }
        </style>
      </head>
      <body>
        <h1>Attendance Report</h1>
        <p>${format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</p>
        
        <div class="stats">
          <div class="stat-box"><strong>Total Records:</strong> ${stats.totalRecords}</div>
          <div class="stat-box"><strong>Employees:</strong> ${stats.uniqueEmployees}</div>
          <div class="stat-box"><strong>Total Hours:</strong> ${stats.totalHours.toFixed(0)}h</div>
          <div class="stat-box"><strong>Late Arrivals:</strong> ${stats.lateArrivals} (${stats.latePercentage}%)</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Department</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${attendanceData.map(r => `
              <tr>
                <td>${format(parseISO(r.check_in), "MMM d, yyyy")}</td>
                <td>${getProfileName(r.user_id)}</td>
                <td>${getProfileDepartment(r.user_id)}</td>
                <td>${format(parseISO(r.check_in), "hh:mm a")}</td>
                <td>${r.check_out ? format(parseISO(r.check_out), "hh:mm a") : "-"}</td>
                <td>${r.work_hours?.toFixed(1) || "-"}h</td>
                <td class="${isLateArrival(r.check_in) ? 'late' : ''}">${isLateArrival(r.check_in) ? `Late (${getLateMinutes(r.check_in)}min)` : "On Time"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
    toast.success("PDF generated - use print dialog to save");
  };

  // Daily chart data
  const getDailyData = () => {
    const monthDate = new Date(selectedMonth + "-01");
    const days = eachDayOfInterval({
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
    });

    return days.map(day => {
      const dayRecords = attendanceData.filter(r => 
        format(parseISO(r.check_in), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
      );
      const totalHours = dayRecords.reduce((sum, r) => sum + (r.work_hours || 0), 0);
      const employeeCount = new Set(dayRecords.map(r => r.user_id)).size;
      const lateCount = dayRecords.filter(r => isLateArrival(r.check_in)).length;

      return {
        date: format(day, "d"),
        fullDate: format(day, "MMM d"),
        hours: Math.round(totalHours * 10) / 10,
        employees: employeeCount,
        lateCount,
        isWeekend: isWeekend(day),
      };
    });
  };

  // Weekly chart data
  const getWeeklyData = () => {
    const monthDate = new Date(selectedMonth + "-01");
    const weeks: { week: number; start: Date; end: Date }[] = [];
    let currentDate = startOfMonth(monthDate);
    let weekNum = 1;

    while (currentDate <= endOfMonth(monthDate)) {
      const weekStart = currentDate;
      const weekEnd = endOfWeek(currentDate);
      weeks.push({ week: weekNum, start: weekStart, end: weekEnd > endOfMonth(monthDate) ? endOfMonth(monthDate) : weekEnd });
      currentDate = new Date(weekEnd.getTime() + 86400000);
      weekNum++;
    }

    return weeks.map(w => {
      const weekRecords = attendanceData.filter(r => {
        const checkIn = parseISO(r.check_in);
        return checkIn >= w.start && checkIn <= w.end;
      });
      const totalHours = weekRecords.reduce((sum, r) => sum + (r.work_hours || 0), 0);
      const avgHours = weekRecords.length > 0 ? totalHours / weekRecords.length : 0;

      return {
        week: `Week ${w.week}`,
        hours: Math.round(totalHours * 10) / 10,
        avgHours: Math.round(avgHours * 10) / 10,
        records: weekRecords.length,
      };
    });
  };

  // Employee breakdown
  const getEmployeeData = () => {
    const employeeMap = new Map<string, number>();
    
    attendanceData.forEach(record => {
      const current = employeeMap.get(record.user_id) || 0;
      employeeMap.set(record.user_id, current + (record.work_hours || 0));
    });

    return Array.from(employeeMap.entries())
      .map(([userId, hours]) => ({
        name: getProfileName(userId),
        hours: Math.round(hours * 10) / 10,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  };

  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    };
  });

  if (!canViewReports) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to view attendance reports.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Attendance Reports</h1>
            <p className="text-muted-foreground">Team attendance patterns and analytics</p>
          </div>
        </div>
        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">By Employee</SelectItem>
              <SelectItem value="late">Late Arrivals</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{stats.totalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employees</p>
                <p className="text-2xl font-bold">{stats.uniqueEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Timer className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{stats.totalHours.toFixed(0)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Hours/Day</p>
                <p className="text-2xl font-bold">{stats.avgHoursPerDay}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Late Arrivals</p>
                <p className="text-2xl font-bold">{stats.lateArrivals}</p>
                <p className="text-xs text-muted-foreground">{stats.latePercentage}% of total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts or Late Arrivals View */}
      {viewMode === "late" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Late Arrivals List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Late Arrivals This Month
              </CardTitle>
              <CardDescription>
                Employees who checked in after {WORK_START_HOUR}:{WORK_START_MINUTE.toString().padStart(2, '0')} AM + {LATE_THRESHOLD_MINUTES}min grace period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {getLateArrivals().length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No late arrivals this month
                  </p>
                ) : (
                  getLateArrivals().map((record, idx) => (
                    <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-red-500 border-red-500">
                          +{record.lateMinutes}min
                        </Badge>
                        <div>
                          <p className="font-medium">{record.name}</p>
                          <p className="text-sm text-muted-foreground">{record.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{record.checkInTime}</p>
                        <p className="text-xs text-muted-foreground">{record.department}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Late Arrivals by Employee */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Frequent Late Arrivals</CardTitle>
              <CardDescription>Employees with most late check-ins</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getLateArrivalsByEmployee().slice(0, 5).map((emp, index) => (
                  <div key={emp.userId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{emp.name}</span>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-red-500">{emp.lateCount} times</Badge>
                      <p className="text-xs text-muted-foreground mt-1">Avg: {emp.avgLateMinutes}min late</p>
                    </div>
                  </div>
                ))}
                {getLateArrivalsByEmployee().length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No late arrivals
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Late Arrivals Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Late Arrivals</CardTitle>
              <CardDescription>Number of late check-ins per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={getDailyData().filter(d => !d.isWeekend)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg shadow-lg p-3">
                            <p className="font-medium">{data.fullDate}</p>
                            <p className="text-sm text-red-500">
                              Late: {data.lateCount}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Total: {data.employees}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="lateCount" 
                    fill="hsl(var(--destructive))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Main Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {viewMode === "daily" && "Daily Attendance"}
                {viewMode === "weekly" && "Weekly Attendance"}
                {viewMode === "monthly" && "Employee Hours"}
              </CardTitle>
              <CardDescription>
                {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  {viewMode === "daily" ? (
                    <BarChart data={getDailyData()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border rounded-lg shadow-lg p-3">
                                <p className="font-medium">{data.fullDate}</p>
                                <p className="text-sm text-muted-foreground">
                                  Hours: {data.hours}h
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Employees: {data.employees}
                                </p>
                                <p className="text-sm text-red-500">
                                  Late: {data.lateCount}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="hours" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  ) : viewMode === "weekly" ? (
                    <LineChart data={getWeeklyData()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="week" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border rounded-lg shadow-lg p-3">
                                <p className="font-medium">{data.week}</p>
                                <p className="text-sm text-muted-foreground">
                                  Total Hours: {data.hours}h
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Records: {data.records}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="hours" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={getEmployeeData()} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border rounded-lg shadow-lg p-3">
                                <p className="font-medium">{data.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Total Hours: {data.hours}h
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="hours" 
                        fill="hsl(var(--primary))" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Contributors</CardTitle>
              <CardDescription>Employees with most hours this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getEmployeeData().slice(0, 5).map((emp, index) => (
                  <div key={emp.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? "default" : "secondary"} className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{emp.name}</span>
                    </div>
                    <Badge variant="outline">{emp.hours}h</Badge>
                  </div>
                ))}
                {getEmployeeData().length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Distribution Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hours Distribution</CardTitle>
              <CardDescription>Work hours by employee</CardDescription>
            </CardHeader>
            <CardContent>
              {getEmployeeData().length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={getEmployeeData().slice(0, 5)}
                      dataKey="hours"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {getEmployeeData().slice(0, 5).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}