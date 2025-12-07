import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Clock, Trash2, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ActivityDefinition {
  id: string;
  name: string;
  description: string | null;
  team_type: string | null;
  department: string | null;
}

interface AttendanceActivity {
  id: string;
  activity_id: string;
  duration_minutes: number;
  notes: string | null;
  activity_definitions?: ActivityDefinition;
}

interface AttendanceActivityLoggerProps {
  attendanceId: string;
  isEditable: boolean;
}

export function AttendanceActivityLogger({
  attendanceId,
  isEditable,
}: AttendanceActivityLoggerProps) {
  const { user, profile } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [duration, setDuration] = useState<string>("30");
  const [notes, setNotes] = useState<string>("");

  // Fetch activity definitions for user's department/team
  const { data: activityDefinitions = [] } = useQuery({
    queryKey: ["activity-definitions", currentTenant?.id, profile?.department],
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const department = profile?.department?.toLowerCase() || "";
      
      const { data, error } = await supabase
        .from("activity_definitions")
        .select("*")
        .eq("tenant_id", currentTenant!.id)
        .eq("is_active", true)
        .or(`team_type.is.null,department.ilike.%${department}%`);

      if (error) throw error;
      return data as ActivityDefinition[];
    },
  });

  // Fetch logged activities for this attendance
  const { data: loggedActivities = [] } = useQuery({
    queryKey: ["attendance-activities", attendanceId],
    enabled: !!attendanceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_activities")
        .select(`
          *,
          activity_definitions (id, name, description, team_type, department)
        `)
        .eq("attendance_id", attendanceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AttendanceActivity[];
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: async () => {
      if (!selectedActivity || !duration) return;

      const { error } = await supabase.from("attendance_activities").insert({
        attendance_id: attendanceId,
        activity_id: selectedActivity,
        user_id: user!.id,
        tenant_id: currentTenant!.id,
        duration_minutes: parseInt(duration),
        notes: notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-activities", attendanceId] });
      setSelectedActivity("");
      setDuration("30");
      setNotes("");
      toast.success("Activity logged successfully");
    },
    onError: (error) => {
      toast.error("Failed to log activity: " + error.message);
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityLogId: string) => {
      const { error } = await supabase
        .from("attendance_activities")
        .delete()
        .eq("id", activityLogId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-activities", attendanceId] });
      toast.success("Activity removed");
    },
    onError: (error) => {
      toast.error("Failed to remove activity: " + error.message);
    },
  });

  const totalMinutes = loggedActivities.reduce(
    (sum, act) => sum + (act.duration_minutes || 0),
    0
  );
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Group activities by type
  const commonActivities = activityDefinitions.filter((a) => !a.team_type);
  const teamActivities = activityDefinitions.filter((a) => a.team_type);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Daily Activities
          </div>
          <Badge variant="secondary">
            {totalHours}h {remainingMinutes}m logged
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditable && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedActivity} onValueChange={setSelectedActivity}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select activity..." />
              </SelectTrigger>
              <SelectContent>
                {commonActivities.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Common Activities
                    </div>
                    {commonActivities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.name}
                      </SelectItem>
                    ))}
                  </>
                )}
                {teamActivities.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                      Team Activities
                    </div>
                    {teamActivities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Minutes"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-24"
                min="1"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
            <Button
              onClick={() => addActivityMutation.mutate()}
              disabled={!selectedActivity || !duration || addActivityMutation.isPending}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        )}

        {/* Logged activities list */}
        <div className="space-y-2">
          {loggedActivities.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              No activities logged yet
            </p>
          ) : (
            loggedActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">
                      {activity.activity_definitions?.name || "Unknown Activity"}
                    </p>
                    {activity.notes && (
                      <p className="text-xs text-muted-foreground">{activity.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {Math.floor(activity.duration_minutes / 60) > 0 &&
                      `${Math.floor(activity.duration_minutes / 60)}h `}
                    {activity.duration_minutes % 60}m
                  </Badge>
                  {isEditable && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteActivityMutation.mutate(activity.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
