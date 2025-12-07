import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, DollarSign, Users, Save } from "lucide-react";

interface WorkflowSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SalaryThresholds {
  ceo_interview_threshold: number;
  management_interview_threshold: number;
}

export function WorkflowSettingsDialog({
  open,
  onOpenChange,
}: WorkflowSettingsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [thresholds, setThresholds] = useState<SalaryThresholds>({
    ceo_interview_threshold: 1500000,
    management_interview_threshold: 3000000,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["workflow-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_settings")
        .select("*")
        .eq("setting_key", "salary_thresholds")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings?.setting_value) {
      const value = settings.setting_value as unknown as SalaryThresholds;
      setThresholds({
        ceo_interview_threshold: value.ceo_interview_threshold || 1500000,
        management_interview_threshold: value.management_interview_threshold || 3000000,
      });
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from("workflow_settings")
        .select("id")
        .eq("setting_key", "salary_thresholds")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("workflow_settings")
          .update({ setting_value: thresholds as unknown as Record<string, unknown> })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workflow_settings")
          .insert({
            setting_key: "salary_thresholds",
            setting_value: thresholds as unknown as Record<string, unknown>,
          });
        if (error) throw error;
      }
    },
    },
    onSuccess: () => {
      toast({ title: "Settings Saved", description: "Workflow settings have been updated." });
      queryClient.invalidateQueries({ queryKey: ["workflow-settings"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    },
  });

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
    return `₹${value.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Workflow Settings
          </DialogTitle>
          <DialogDescription>
            Configure thresholds and rules for HR workflows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Salary-Based Interview Thresholds
              </CardTitle>
              <CardDescription className="text-xs">
                Define salary limits that trigger additional interview rounds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ceo-threshold">
                  CEO Interview Threshold
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="ceo-threshold"
                    type="number"
                    value={thresholds.ceo_interview_threshold}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        ceo_interview_threshold: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatCurrency(thresholds.ceo_interview_threshold)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Candidates with expected salary above this amount require CEO interview.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mgmt-threshold">
                  Additional Management Interview Threshold
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="mgmt-threshold"
                    type="number"
                    value={thresholds.management_interview_threshold}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        management_interview_threshold: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatCurrency(thresholds.management_interview_threshold)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Candidates with expected salary above this amount require additional management team interview.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Interview Levels Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <div className="flex justify-between items-center py-1 border-b">
                  <span>Standard Roles</span>
                  <span className="text-muted-foreground">Manager Interview Only</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b">
                  <span>Senior Roles (&gt;{formatCurrency(thresholds.ceo_interview_threshold)})</span>
                  <span className="text-muted-foreground">+ CEO Interview</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>Executive Roles (&gt;{formatCurrency(thresholds.management_interview_threshold)})</span>
                  <span className="text-muted-foreground">+ Management Panel</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending} className="gap-2">
            <Save className="w-4 h-4" />
            {saveSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
