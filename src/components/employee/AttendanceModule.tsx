import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, parseISO, differenceInMinutes, startOfMonth, endOfMonth, isToday } from "date-fns";
import { Clock, LogIn, LogOut, Calendar, Timer, TrendingUp, Smile, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";
import { AttendanceMoodDialog } from "./AttendanceMoodDialog";
import { AttendanceActivityLogger } from "./AttendanceActivityLogger";

interface AttendanceRecord {
  id: string;
  user_id: string;
  tenant_id: string | null;
  check_in: string;
  check_out: string | null;
  work_hours: number | null;
  notes: string | null;
  mood_check_in: string | null;
  mood_check_out: string | null;
  created_at: string;
}

const moodEmojis: Record<string, string> = {
  interesting: "🤩",
  good: "😊",
  informative: "🧠",
  productive: "💪",
  boring: "😐",
  stressful: "😓",
};

export function AttendanceModule() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [showMoodDialog, setShowMoodDialog] = useState(false);
  const [moodType, setMoodType] = useState<"check_in" | "check_out">("check_in");
  const [pendingMood, setPendingMood] = useState<string | null>(null);

  // Get today's attendance
  const { data: todayAttendance, isLoading: loadingToday } = useQuery({
    queryKey: ["attendance-today", user?.id, currentTenant?.id],
    enabled: !!user && !!currentTenant,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user!.id)
        .eq("tenant_id", currentTenant!.id)
        .gte("check_in", today.toISOString())
        .order("check_in", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] as AttendanceRecord | undefined;
    },
  });

  // Get attendance history
  const { data: attendanceHistory = [] } = useQuery({
    queryKey: ["attendance-history", user?.id, currentTenant?.id],
    enabled: !!user && !!currentTenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user!.id)
        .eq("tenant_id", currentTenant!.id)
        .order("check_in", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });

  // Get monthly stats
  const { data: monthlyStats } = useQuery({
    queryKey: ["attendance-monthly", user?.id, currentTenant?.id],
    enabled: !!user && !!currentTenant,
    queryFn: async () => {
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user!.id)
        .eq("tenant_id", currentTenant!.id)
        .gte("check_in", monthStart.toISOString())
        .lte("check_in", monthEnd.toISOString());

      if (error) throw error;

      const totalDays = data?.length || 0;
      const totalHours = data?.reduce((sum, record) => sum + (record.work_hours || 0), 0) || 0;
      const avgHours = totalDays > 0 ? totalHours / totalDays : 0;

      return { totalDays, totalHours: totalHours.toFixed(1), avgHours: avgHours.toFixed(1) };
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (mood: string) => {
      const { data, error } = await supabase
        .from("attendance")
        .insert({
          user_id: user!.id,
          tenant_id: currentTenant!.id,
          check_in: new Date().toISOString(),
          mood_check_in: mood,
        })
        .select()
        .single();

      if (error) throw error;

      // Log mood to employee_mood_logs
      await supabase.from("employee_mood_logs").insert({
        user_id: user!.id,
        tenant_id: currentTenant!.id,
        attendance_id: data.id,
        mood: mood,
        mood_type: "check_in",
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-monthly"] });
      toast.success("Checked in successfully! Have a productive day.");
    },
    onError: (error) => {
      toast.error("Failed to check in: " + error.message);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (mood: string) => {
      if (!todayAttendance) return;

      const checkOutTime = new Date();
      const checkInTime = parseISO(todayAttendance.check_in);
      const workMinutes = differenceInMinutes(checkOutTime, checkInTime);
      const workHours = Math.round((workMinutes / 60) * 100) / 100;

      const { error } = await supabase
        .from("attendance")
        .update({
          check_out: checkOutTime.toISOString(),
          work_hours: workHours,
          mood_check_out: mood,
        })
        .eq("id", todayAttendance.id);

      if (error) throw error;

      // Log mood to employee_mood_logs
      await supabase.from("employee_mood_logs").insert({
        user_id: user!.id,
        tenant_id: currentTenant!.id,
        attendance_id: todayAttendance.id,
        mood: mood,
        mood_type: "check_out",
        session_duration_minutes: workMinutes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-monthly"] });
      toast.success("Checked out successfully! See you tomorrow.");
    },
    onError: (error) => {
      toast.error("Failed to check out: " + error.message);
    },
  });

  const isCheckedIn = todayAttendance && !todayAttendance.check_out;
  const isCheckedOut = todayAttendance && todayAttendance.check_out;

  const getCurrentWorkTime = () => {
    if (!todayAttendance) return "0h 0m";
    const checkInTime = parseISO(todayAttendance.check_in);
    const endTime = todayAttendance.check_out ? parseISO(todayAttendance.check_out) : new Date();
    const minutes = differenceInMinutes(endTime, checkInTime);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleCheckInClick = () => {
    setMoodType("check_in");
    setShowMoodDialog(true);
  };

  const handleCheckOutClick = () => {
    setMoodType("check_out");
    setShowMoodDialog(true);
  };

  const handleMoodSubmit = (mood: string) => {
    if (moodType === "check_in") {
      checkInMutation.mutate(mood);
    } else {
      checkOutMutation.mutate(mood);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Clock className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track your daily work hours and activities</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Check In/Out Card */}
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Today's Attendance</CardTitle>
            <CardDescription>{format(new Date(), "EEEE, MMMM d, yyyy")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isCheckedIn ? "default" : isCheckedOut ? "secondary" : "outline"}
                    className={cn(
                      isCheckedIn && "bg-green-500 hover:bg-green-500/80",
                      isCheckedOut && "bg-blue-500 hover:bg-blue-500/80"
                    )}
                  >
                    {isCheckedIn ? "Working" : isCheckedOut ? "Completed" : "Not Started"}
                  </Badge>
                  {todayAttendance?.mood_check_in && (
                    <span className="text-xl" title="Check-in mood">
                      {moodEmojis[todayAttendance.mood_check_in] || ""}
                    </span>
                  )}
                  {todayAttendance?.mood_check_out && (
                    <span className="text-xl" title="Check-out mood">
                      {moodEmojis[todayAttendance.mood_check_out] || ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Work Time</p>
                <p className="text-2xl font-bold">{getCurrentWorkTime()}</p>
              </div>
            </div>

            {todayAttendance && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <LogIn className="w-3 h-3" /> Check In
                  </p>
                  <p className="font-medium">{format(parseISO(todayAttendance.check_in), "hh:mm a")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <LogOut className="w-3 h-3" /> Check Out
                  </p>
                  <p className="font-medium">
                    {todayAttendance.check_out ? format(parseISO(todayAttendance.check_out), "hh:mm a") : "—"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleCheckInClick}
                disabled={!!todayAttendance || checkInMutation.isPending}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Check In
              </Button>
              <Button
                onClick={handleCheckOutClick}
                disabled={!isCheckedIn || checkOutMutation.isPending}
                variant="destructive"
                className="flex-1"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Check Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Days This Month</p>
                <p className="text-2xl font-bold">{monthlyStats?.totalDays || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Timer className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{monthlyStats?.totalHours || 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Logger - only show when checked in */}
      {todayAttendance && (
        <AttendanceActivityLogger
          attendanceId={todayAttendance.id}
          isEditable={isCheckedIn || false}
        />
      )}

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {attendanceHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No attendance records yet</p>
            ) : (
              attendanceHistory.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg",
                    isToday(parseISO(record.check_in)) ? "bg-primary/5 border border-primary/20" : "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[40px]">
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(record.check_in), "EEE")}
                      </p>
                      <p className="font-bold">{format(parseISO(record.check_in), "d")}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(record.check_in), "MMM")}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm">
                        <LogIn className="w-3 h-3 text-green-500" />
                        <span>{format(parseISO(record.check_in), "hh:mm a")}</span>
                        {record.mood_check_in && (
                          <span title="Check-in mood">{moodEmojis[record.mood_check_in]}</span>
                        )}
                        {record.check_out && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <LogOut className="w-3 h-3 text-red-500" />
                            <span>{format(parseISO(record.check_out), "hh:mm a")}</span>
                            {record.mood_check_out && (
                              <span title="Check-out mood">{moodEmojis[record.mood_check_out]}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {record.work_hours ? (
                      <Badge variant="secondary">{record.work_hours.toFixed(1)}h</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-500 border-amber-500">
                        In Progress
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mood Dialog */}
      <AttendanceMoodDialog
        open={showMoodDialog}
        onOpenChange={setShowMoodDialog}
        type={moodType}
        onSubmit={handleMoodSubmit}
      />
    </div>
  );
}
