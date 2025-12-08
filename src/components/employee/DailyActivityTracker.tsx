import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Clock, Trash2, Activity, Building2, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";

const INTERNAL_ACTIVITIES = [
  { value: "self_enablement", label: "Self Enablement" },
  { value: "certification", label: "Certification / Training" },
  { value: "team_enablement", label: "Team Enablement" },
  { value: "cross_team_collaboration", label: "Cross Team Collaboration" },
  { value: "project_planning", label: "Project Planning Discussion" },
  { value: "meeting_manager", label: "Meeting with Manager" },
  { value: "meeting_hr", label: "Meeting with HR" },
  { value: "meeting_management", label: "Meeting with Management" },
  { value: "documentation", label: "Documentation" },
  { value: "admin_work", label: "Administrative Work" },
  { value: "learning", label: "Learning / Research" },
];

const EXTERNAL_ACTIVITIES = [
  { value: "customer_meeting_online", label: "Customer Meeting (Online)" },
  { value: "customer_meeting_onsite", label: "Customer Meeting (Onsite)" },
  { value: "demo", label: "Demo / Presentation" },
  { value: "poc", label: "POC / Pilot" },
  { value: "raising_invoice", label: "Raising Invoice" },
  { value: "payment_collection", label: "Payment Collection" },
  { value: "troubleshooting", label: "Troubleshooting" },
  { value: "incident_monitoring", label: "Incident Monitoring" },
  { value: "incident_response", label: "Incident Response" },
  { value: "technical_support", label: "Technical Support" },
  { value: "implementation", label: "Implementation" },
  { value: "training_delivery", label: "Training Delivery" },
  { value: "consultation", label: "Consultation" },
];

export function DailyActivityTracker() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState<"internal" | "external">("internal");
  const [activityType, setActivityType] = useState("");
  const [duration, setDuration] = useState("30");
  const [description, setDescription] = useState("");
  const [organizationId, setOrganizationId] = useState("");

  const { data: organizations = [] } = useQuery({
    queryKey: ["customer-organizations-activity", currentTenant?.id],
    enabled: !!currentTenant?.id && category === "external",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alliance_organizations")
        .select("id, name")
        .eq("tenant_id", currentTenant!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["daily-activities", user?.id, selectedDate],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_activities")
        .select(`*, organization:alliance_organizations(id, name)`)
        .eq("user_id", user!.id)
        .eq("activity_date", selectedDate)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("daily_activities").insert({
        user_id: user!.id,
        tenant_id: currentTenant!.id,
        activity_date: selectedDate,
        activity_category: category,
        activity_type: activityType,
        duration_minutes: parseInt(duration),
        description: description || null,
        related_organization_id: category === "external" && organizationId ? organizationId : null,
        location_type: category === "external" ? "remote" : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-activities"] });
      setActivityType("");
      setDuration("30");
      setDescription("");
      setOrganizationId("");
      toast.success("Activity logged");
    },
    onError: (error) => toast.error("Failed: " + error.message),
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-activities"] });
      toast.success("Activity removed");
    },
  });

  const totalMinutes = activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
  const activityOptions = category === "internal" ? INTERNAL_ACTIVITIES : EXTERNAL_ACTIVITIES;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Daily Activity Tracker</h1>
            <p className="text-muted-foreground">Log your daily work activities</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{activities.length}</p>
            <p className="text-sm text-muted-foreground">Activities Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</p>
            <p className="text-sm text-muted-foreground">Total Time Logged</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{activities.filter(a => a.activity_category === "external").length}</p>
            <p className="text-sm text-muted-foreground">External Activities</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log New Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={(v: "internal" | "external") => { setCategory(v); setActivityType(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Activity Type</label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger><SelectValue placeholder="Select activity..." /></SelectTrigger>
                <SelectContent>
                  {activityOptions.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {category === "external" && (
              <div>
                <label className="text-sm font-medium">Customer (Optional)</label>
                <Select value={organizationId} onValueChange={setOrganizationId}>
                  <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Duration (minutes)</label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Description (Optional)</label>
            <Textarea placeholder="Brief description..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button onClick={() => addActivityMutation.mutate()} disabled={!activityType || addActivityMutation.isPending}>
            {addActivityMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Plus className="w-4 h-4 mr-2" />Log Activity
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Today's Activities</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : activities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No activities logged for this date</p>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Badge variant={activity.activity_category === "internal" ? "secondary" : "default"}>
                      {activity.activity_category}
                    </Badge>
                    <div>
                      <p className="font-medium capitalize">{activity.activity_type.replace(/_/g, " ")}</p>
                      {activity.organization && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{activity.organization.name}
                        </p>
                      )}
                      {activity.description && <p className="text-xs text-muted-foreground">{activity.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{activity.duration_minutes}m</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteActivityMutation.mutate(activity.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
