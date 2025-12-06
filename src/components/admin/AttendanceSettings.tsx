import { useState, useEffect } from "react";
import { Clock, Bell, AlertTriangle, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AttendanceConfig {
  work_start_time: string;
  late_threshold_minutes: number;
  work_end_time: string;
  early_departure_threshold_minutes: number;
  late_arrival_alert_enabled: boolean;
  early_departure_alert_enabled: boolean;
  alert_managers_on_late: boolean;
  alert_managers_on_early_departure: boolean;
  consecutive_late_threshold: number;
}

export function AttendanceSettings() {
  const [config, setConfig] = useState<AttendanceConfig>({
    work_start_time: "09:00",
    late_threshold_minutes: 15,
    work_end_time: "18:00",
    early_departure_threshold_minutes: 15,
    late_arrival_alert_enabled: true,
    early_departure_alert_enabled: true,
    alert_managers_on_late: true,
    alert_managers_on_early_departure: true,
    consecutive_late_threshold: 3,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setConfig({
          work_start_time: data.work_start_time?.slice(0, 5) || "09:00",
          late_threshold_minutes: data.late_threshold_minutes || 15,
          work_end_time: data.work_end_time?.slice(0, 5) || "18:00",
          early_departure_threshold_minutes: data.early_departure_threshold_minutes || 15,
          late_arrival_alert_enabled: data.late_arrival_alert_enabled ?? true,
          early_departure_alert_enabled: data.early_departure_alert_enabled ?? true,
          alert_managers_on_late: data.alert_managers_on_late ?? true,
          alert_managers_on_early_departure: data.alert_managers_on_early_departure ?? true,
          consecutive_late_threshold: data.consecutive_late_threshold || 3,
        });
      }
    } catch (error) {
      console.error("Error fetching attendance settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("organization_settings")
        .select("id")
        .limit(1)
        .single();

      const updateData = {
        work_start_time: config.work_start_time + ":00",
        late_threshold_minutes: config.late_threshold_minutes,
        work_end_time: config.work_end_time + ":00",
        early_departure_threshold_minutes: config.early_departure_threshold_minutes,
        late_arrival_alert_enabled: config.late_arrival_alert_enabled,
        early_departure_alert_enabled: config.early_departure_alert_enabled,
        alert_managers_on_late: config.alert_managers_on_late,
        alert_managers_on_early_departure: config.alert_managers_on_early_departure,
        consecutive_late_threshold: config.consecutive_late_threshold,
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        const { error } = await supabase
          .from("organization_settings")
          .update(updateData)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("organization_settings")
          .insert({ ...updateData, name: "My Organization" });
        if (error) throw error;
      }

      toast.success("Attendance settings saved successfully");
    } catch (error) {
      console.error("Error saving attendance settings:", error);
      toast.error("Failed to save attendance settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Work Hours Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Work Hours Configuration
          </CardTitle>
          <CardDescription>
            Set the standard work hours for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="work_start_time">Work Start Time</Label>
              <Input
                id="work_start_time"
                type="time"
                value={config.work_start_time}
                onChange={(e) => setConfig({ ...config, work_start_time: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The official start time for work
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_end_time">Work End Time</Label>
              <Input
                id="work_end_time"
                type="time"
                value={config.work_end_time}
                onChange={(e) => setConfig({ ...config, work_end_time: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The official end time for work
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Late Arrival Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Late Arrival Settings
          </CardTitle>
          <CardDescription>
            Configure late arrival thresholds and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="late_threshold">Late Threshold (minutes)</Label>
              <Input
                id="late_threshold"
                type="number"
                min={0}
                max={120}
                value={config.late_threshold_minutes}
                onChange={(e) => setConfig({ ...config, late_threshold_minutes: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Minutes after start time before marking as late
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="consecutive_late">Consecutive Late Alert Threshold</Label>
              <Input
                id="consecutive_late"
                type="number"
                min={1}
                max={10}
                value={config.consecutive_late_threshold}
                onChange={(e) => setConfig({ ...config, consecutive_late_threshold: parseInt(e.target.value) || 3 })}
              />
              <p className="text-xs text-muted-foreground">
                Alert after this many consecutive late arrivals
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Enable Late Arrival Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Track and flag late arrivals in reports
              </p>
            </div>
            <Switch
              checked={config.late_arrival_alert_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, late_arrival_alert_enabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Notify Managers on Late Arrivals</Label>
              <p className="text-sm text-muted-foreground">
                Send alerts to managers when employees arrive late
              </p>
            </div>
            <Switch
              checked={config.alert_managers_on_late}
              onCheckedChange={(checked) => setConfig({ ...config, alert_managers_on_late: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Early Departure Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-red-500" />
            Early Departure Settings
          </CardTitle>
          <CardDescription>
            Configure early departure thresholds and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="early_departure_threshold">Early Departure Threshold (minutes)</Label>
            <Input
              id="early_departure_threshold"
              type="number"
              min={0}
              max={120}
              value={config.early_departure_threshold_minutes}
              onChange={(e) => setConfig({ ...config, early_departure_threshold_minutes: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Minutes before end time to mark as early departure
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Enable Early Departure Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Track and flag early departures in reports
              </p>
            </div>
            <Switch
              checked={config.early_departure_alert_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, early_departure_alert_enabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Notify Managers on Early Departures</Label>
              <p className="text-sm text-muted-foreground">
                Send alerts to managers when employees leave early
              </p>
            </div>
            <Switch
              checked={config.alert_managers_on_early_departure}
              onCheckedChange={(checked) => setConfig({ ...config, alert_managers_on_early_departure: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
