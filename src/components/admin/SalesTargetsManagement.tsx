import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Target, Plus, Edit, Trash2, Loader2, TrendingUp, TrendingDown, DollarSign, Award } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

interface SalesTarget {
  id: string;
  user_id: string;
  tenant_id: string | null;
  target_period: string;
  period_start: string;
  period_end: string;
  top_line_target: number;
  bottom_line_target: number;
  incentive_eligibility_cap: number;
  currency: string;
  notes: string | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  job_title: string | null;
}

export function SalesTargetsManagement() {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { formatCurrency } = useOrganizationSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<SalesTarget | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("monthly");
  
  const [formData, setFormData] = useState({
    user_id: "",
    target_period: "monthly",
    period_start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    period_end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    top_line_target: "",
    bottom_line_target: "",
    incentive_eligibility_cap: "",
    notes: "",
  });

  // Fetch sales team members
  const { data: salesMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["sales-team-profiles", currentTenant?.id],
    queryFn: async () => {
      // First get user_ids from user_teams with sales team
      const { data: teamData, error: teamError } = await supabase
        .from("user_teams")
        .select("user_id")
        .eq("team", "sales");

      if (teamError) throw teamError;

      const userIds = teamData?.map(t => t.user_id) || [];
      if (userIds.length === 0) return [];

      // Then fetch profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url, job_title")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;
      return profiles as Profile[];
    },
    enabled: !!user,
  });

  // Fetch sales targets
  const { data: targets = [], isLoading: targetsLoading } = useQuery({
    queryKey: ["sales-targets", currentTenant?.id, selectedPeriod],
    queryFn: async () => {
      let query = supabase
        .from("sales_targets")
        .select("*")
        .eq("target_period", selectedPeriod)
        .order("period_start", { ascending: false });

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SalesTarget[];
    },
    enabled: !!user,
  });

  // Fetch current period achievements
  const { data: achievements = {} } = useQuery({
    queryKey: ["sales-achievements", currentTenant?.id],
    queryFn: async () => {
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      let query = supabase
        .from("deals")
        .select("value, user_id, assigned_to")
        .eq("stage", "closed_won")
        .gte("actual_close_date", monthStart.toISOString().split("T")[0])
        .lte("actual_close_date", monthEnd.toISOString().split("T")[0]);

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by user
      const achievementMap: Record<string, number> = {};
      (data || []).forEach(deal => {
        const userId = deal.assigned_to || deal.user_id;
        achievementMap[userId] = (achievementMap[userId] || 0) + (Number(deal.value) || 0);
      });

      return achievementMap;
    },
    enabled: !!user,
  });

  // Create/Update target mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        user_id: data.user_id,
        tenant_id: currentTenant?.id,
        target_period: data.target_period,
        period_start: data.period_start,
        period_end: data.period_end,
        top_line_target: parseFloat(data.top_line_target) || 0,
        bottom_line_target: parseFloat(data.bottom_line_target) || 0,
        incentive_eligibility_cap: parseFloat(data.incentive_eligibility_cap) || 0,
        notes: data.notes || null,
        created_by: user?.id,
        updated_by: user?.id,
      };

      if (editingTarget) {
        const { error } = await supabase
          .from("sales_targets")
          .update(payload)
          .eq("id", editingTarget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sales_targets")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-targets"] });
      toast.success(editingTarget ? "Target updated" : "Target created");
      handleCloseDialog();
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        toast.error("A target already exists for this user in this period");
      } else {
        toast.error("Failed to save target");
      }
    },
  });

  // Delete target mutation
  const deleteMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase
        .from("sales_targets")
        .delete()
        .eq("id", targetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-targets"] });
      toast.success("Target deleted");
    },
    onError: () => {
      toast.error("Failed to delete target");
    },
  });

  const handleOpenDialog = (target?: SalesTarget) => {
    if (target) {
      setEditingTarget(target);
      setFormData({
        user_id: target.user_id,
        target_period: target.target_period,
        period_start: target.period_start,
        period_end: target.period_end,
        top_line_target: target.top_line_target.toString(),
        bottom_line_target: target.bottom_line_target.toString(),
        incentive_eligibility_cap: target.incentive_eligibility_cap.toString(),
        notes: target.notes || "",
      });
    } else {
      setEditingTarget(null);
      updatePeriodDates("monthly");
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTarget(null);
    setFormData({
      user_id: "",
      target_period: "monthly",
      period_start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      period_end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
      top_line_target: "",
      bottom_line_target: "",
      incentive_eligibility_cap: "",
      notes: "",
    });
  };

  const updatePeriodDates = (period: string) => {
    const now = new Date();
    let start: Date, end: Date;

    switch (period) {
      case "quarterly":
        start = startOfQuarter(now);
        end = endOfQuarter(now);
        break;
      case "yearly":
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    setFormData(prev => ({
      ...prev,
      target_period: period,
      period_start: format(start, "yyyy-MM-dd"),
      period_end: format(end, "yyyy-MM-dd"),
    }));
  };

  const getMemberName = (userId: string) => {
    const member = salesMembers.find(m => m.user_id === userId);
    return member?.full_name || member?.email || "Unknown";
  };

  const getMemberAvatar = (userId: string) => {
    const member = salesMembers.find(m => m.user_id === userId);
    return {
      url: member?.avatar_url,
      initials: member?.full_name?.split(" ").map(n => n[0]).join("") || "?",
    };
  };

  const getAchievementPercentage = (target: SalesTarget) => {
    const achieved = achievements[target.user_id] || 0;
    return Math.min((achieved / target.top_line_target) * 100, 150);
  };

  if (membersLoading || targetsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Sales Targets
          </h3>
          <p className="text-sm text-muted-foreground">
            Set top line, bottom line & incentive targets for sales team members
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Target
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Top Line Target</p>
                <p className="text-lg font-bold">
                  {formatCurrency(targets.reduce((sum, t) => sum + t.top_line_target, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Bottom Line Target</p>
                <p className="text-lg font-bold">
                  {formatCurrency(targets.reduce((sum, t) => sum + t.bottom_line_target, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Award className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Incentive Cap</p>
                <p className="text-lg font-bold">
                  {formatCurrency(targets.reduce((sum, t) => sum + t.incentive_eligibility_cap, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Targets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {targets.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No targets set for this period. Click "Add Target" to create one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales Person</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Top Line</TableHead>
                  <TableHead className="text-right">Bottom Line</TableHead>
                  <TableHead className="text-right">Incentive Cap</TableHead>
                  <TableHead>Achievement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map(target => {
                  const avatar = getMemberAvatar(target.user_id);
                  const achievementPct = getAchievementPercentage(target);
                  const achieved = achievements[target.user_id] || 0;

                  return (
                    <TableRow key={target.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={avatar.url || undefined} />
                            <AvatarFallback className="text-xs">{avatar.initials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{getMemberName(target.user_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(target.period_start), "MMM d")} - {format(new Date(target.period_end), "MMM d, yyyy")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(target.top_line_target)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(target.bottom_line_target)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(target.incentive_eligibility_cap)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex justify-between text-xs">
                            <span>{formatCurrency(achieved)}</span>
                            <Badge 
                              variant={achievementPct >= 100 ? "default" : achievementPct >= 75 ? "secondary" : "outline"}
                            >
                              {achievementPct.toFixed(0)}%
                            </Badge>
                          </div>
                          <Progress value={Math.min(achievementPct, 100)} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(target)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(target.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTarget ? "Edit Sales Target" : "Add Sales Target"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sales Person</Label>
              <Select
                value={formData.user_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
                disabled={!!editingTarget}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a sales person" />
                </SelectTrigger>
                <SelectContent>
                  {salesMembers.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Period</Label>
              <Select
                value={formData.target_period}
                onValueChange={updatePeriodDates}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={formData.period_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={formData.period_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Top Line Target (Revenue)</Label>
              <Input
                type="number"
                placeholder="e.g., 500000"
                value={formData.top_line_target}
                onChange={(e) => setFormData(prev => ({ ...prev, top_line_target: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Bottom Line Target (Profit)</Label>
              <Input
                type="number"
                placeholder="e.g., 100000"
                value={formData.bottom_line_target}
                onChange={(e) => setFormData(prev => ({ ...prev, bottom_line_target: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Incentive Eligibility Cap</Label>
              <Input
                type="number"
                placeholder="e.g., 50000"
                value={formData.incentive_eligibility_cap}
                onChange={(e) => setFormData(prev => ({ ...prev, incentive_eligibility_cap: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate(formData)}
              disabled={!formData.user_id || !formData.top_line_target || saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTarget ? "Update Target" : "Create Target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
