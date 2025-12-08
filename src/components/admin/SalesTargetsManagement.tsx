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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Target, Plus, Edit, Trash2, Loader2, Award, RefreshCcw, Sparkles, CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface SalesTarget {
  id: string;
  user_id: string;
  tenant_id: string | null;
  target_period: string;
  period_start: string;
  period_end: string;
  top_line_target: number;
  bottom_line_target: number;
  fresh_sales_top_line: number;
  fresh_sales_bottom_line: number;
  renewal_top_line: number;
  renewal_bottom_line: number;
  incentive_eligibility_cap: number;
  incentive_cap_type?: string;
  fresh_sales_bottom_line_type?: string;
  renewal_bottom_line_type?: string;
  incentive_cap_calculated?: number;
  fresh_sales_bottom_line_calculated?: number;
  renewal_bottom_line_calculated?: number;
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

type ValueType = "value" | "percentage";

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
    fresh_sales_top_line: "",
    fresh_sales_bottom_line: "",
    fresh_sales_bottom_line_type: "value" as ValueType,
    renewal_top_line: "",
    renewal_bottom_line: "",
    renewal_bottom_line_type: "value" as ValueType,
    incentive_eligibility_cap: "",
    incentive_cap_type: "value" as ValueType,
    notes: "",
  });

  // Calculate actual values based on type (value or percentage)
  const calculateValue = (input: string, type: ValueType, baseValue: number): number => {
    const numValue = parseFloat(input) || 0;
    if (type === "percentage") {
      return (numValue / 100) * baseValue;
    }
    return numValue;
  };

  // Get display text for calculated values
  const getCalculatedDisplay = (input: string, type: ValueType, baseValue: number): string => {
    if (type === "percentage" && input) {
      const calculated = calculateValue(input, type, baseValue);
      return `= ${formatCurrency(calculated)}`;
    }
    return "";
  };

  // Fetch sales team members
  const { data: salesMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["sales-team-profiles", currentTenant?.id],
    queryFn: async () => {
      const { data: teamData, error: teamError } = await supabase
        .from("user_teams")
        .select("user_id")
        .eq("team", "sales");

      if (teamError) throw teamError;

      const userIds = teamData?.map(t => t.user_id) || [];
      if (userIds.length === 0) return [];

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

  // Fetch current period achievements by deal type
  const { data: achievements = { fresh: {}, renewal: {} } } = useQuery({
    queryKey: ["sales-achievements-by-type", currentTenant?.id],
    queryFn: async () => {
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      let query = supabase
        .from("deals")
        .select("value, user_id, assigned_to, deal_type")
        .eq("stage", "closed_won")
        .gte("actual_close_date", monthStart.toISOString().split("T")[0])
        .lte("actual_close_date", monthEnd.toISOString().split("T")[0]);

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const freshMap: Record<string, number> = {};
      const renewalMap: Record<string, number> = {};
      
      (data || []).forEach(deal => {
        const userId = deal.assigned_to || deal.user_id;
        const value = Number(deal.value) || 0;
        
        if (deal.deal_type === "renewal") {
          renewalMap[userId] = (renewalMap[userId] || 0) + value;
        } else {
          freshMap[userId] = (freshMap[userId] || 0) + value;
        }
      });

      return { fresh: freshMap, renewal: renewalMap };
    },
    enabled: !!user,
  });

  // Create/Update target mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const freshTopLine = parseFloat(data.fresh_sales_top_line) || 0;
      const renewalTopLine = parseFloat(data.renewal_top_line) || 0;
      const totalTopLine = freshTopLine + renewalTopLine;

      // Calculate bottom lines based on type
      const freshBottomLineCalculated = calculateValue(
        data.fresh_sales_bottom_line,
        data.fresh_sales_bottom_line_type,
        freshTopLine
      );
      const renewalBottomLineCalculated = calculateValue(
        data.renewal_bottom_line,
        data.renewal_bottom_line_type,
        renewalTopLine
      );
      
      // Calculate incentive cap based on type
      const incentiveCapCalculated = calculateValue(
        data.incentive_eligibility_cap,
        data.incentive_cap_type,
        totalTopLine
      );

      const payload = {
        user_id: data.user_id,
        tenant_id: currentTenant?.id,
        target_period: data.target_period,
        period_start: data.period_start,
        period_end: data.period_end,
        fresh_sales_top_line: freshTopLine,
        fresh_sales_bottom_line: parseFloat(data.fresh_sales_bottom_line) || 0,
        fresh_sales_bottom_line_type: data.fresh_sales_bottom_line_type,
        fresh_sales_bottom_line_calculated: freshBottomLineCalculated,
        renewal_top_line: renewalTopLine,
        renewal_bottom_line: parseFloat(data.renewal_bottom_line) || 0,
        renewal_bottom_line_type: data.renewal_bottom_line_type,
        renewal_bottom_line_calculated: renewalBottomLineCalculated,
        top_line_target: totalTopLine,
        bottom_line_target: freshBottomLineCalculated + renewalBottomLineCalculated,
        incentive_eligibility_cap: parseFloat(data.incentive_eligibility_cap) || 0,
        incentive_cap_type: data.incentive_cap_type,
        incentive_cap_calculated: incentiveCapCalculated,
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
        fresh_sales_top_line: target.fresh_sales_top_line.toString(),
        fresh_sales_bottom_line: target.fresh_sales_bottom_line.toString(),
        fresh_sales_bottom_line_type: (target.fresh_sales_bottom_line_type || "value") as ValueType,
        renewal_top_line: target.renewal_top_line.toString(),
        renewal_bottom_line: target.renewal_bottom_line.toString(),
        renewal_bottom_line_type: (target.renewal_bottom_line_type || "value") as ValueType,
        incentive_eligibility_cap: target.incentive_eligibility_cap.toString(),
        incentive_cap_type: (target.incentive_cap_type || "value") as ValueType,
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
      fresh_sales_top_line: "",
      fresh_sales_bottom_line: "",
      fresh_sales_bottom_line_type: "value",
      renewal_top_line: "",
      renewal_bottom_line: "",
      renewal_bottom_line_type: "value",
      incentive_eligibility_cap: "",
      incentive_cap_type: "value",
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

  // Calculate totals
  const totalFreshTarget = targets.reduce((sum, t) => sum + (t.fresh_sales_top_line || 0), 0);
  const totalRenewalTarget = targets.reduce((sum, t) => sum + (t.renewal_top_line || 0), 0);
  const totalIncentiveCap = targets.reduce((sum, t) => sum + (t.incentive_eligibility_cap || 0), 0);

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
            Set Fresh Sales & Renewal targets (Top Line, Bottom Line) for sales team members
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fresh Sales Target</p>
                <p className="text-lg font-bold">{formatCurrency(totalFreshTarget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <RefreshCcw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Renewal Target</p>
                <p className="text-lg font-bold">{formatCurrency(totalRenewalTarget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Top Line</p>
                <p className="text-lg font-bold">{formatCurrency(totalFreshTarget + totalRenewalTarget)}</p>
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
                <p className="text-lg font-bold">{formatCurrency(totalIncentiveCap)}</p>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sales Person</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        Fresh (Top/Bottom)
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <RefreshCcw className="h-3 w-3 text-blue-600" />
                        Renewal (Top/Bottom)
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Incentive Cap</TableHead>
                    <TableHead>Fresh Achievement</TableHead>
                    <TableHead>Renewal Achievement</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map(target => {
                    const avatar = getMemberAvatar(target.user_id);
                    const freshAchieved = achievements.fresh[target.user_id] || 0;
                    const renewalAchieved = achievements.renewal[target.user_id] || 0;
                    const freshPct = target.fresh_sales_top_line > 0 
                      ? Math.min((freshAchieved / target.fresh_sales_top_line) * 100, 150) 
                      : 0;
                    const renewalPct = target.renewal_top_line > 0 
                      ? Math.min((renewalAchieved / target.renewal_top_line) * 100, 150) 
                      : 0;

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
                            {format(new Date(target.period_start), "MMM d")} - {format(new Date(target.period_end), "MMM d")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm">
                            <span className="font-medium">{formatCurrency(target.fresh_sales_top_line)}</span>
                            <span className="text-muted-foreground"> / </span>
                            {target.fresh_sales_bottom_line_type === "percentage" ? (
                              <span className="text-muted-foreground">
                                {target.fresh_sales_bottom_line}% ({formatCurrency(target.fresh_sales_bottom_line_calculated || 0)})
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{formatCurrency(target.fresh_sales_bottom_line)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm">
                            <span className="font-medium">{formatCurrency(target.renewal_top_line)}</span>
                            <span className="text-muted-foreground"> / </span>
                            {target.renewal_bottom_line_type === "percentage" ? (
                              <span className="text-muted-foreground">
                                {target.renewal_bottom_line}% ({formatCurrency(target.renewal_bottom_line_calculated || 0)})
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{formatCurrency(target.renewal_bottom_line)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm">
                            {target.incentive_cap_type === "percentage" ? (
                              <span>{target.incentive_eligibility_cap}% ({formatCurrency(target.incentive_cap_calculated || 0)})</span>
                            ) : (
                              <span>{formatCurrency(target.incentive_eligibility_cap)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[100px]">
                            <div className="flex justify-between text-xs">
                              <span>{formatCurrency(freshAchieved)}</span>
                              <Badge 
                                variant={freshPct >= 100 ? "default" : freshPct >= 75 ? "secondary" : "outline"}
                                className="text-[10px] px-1"
                              >
                                {freshPct.toFixed(0)}%
                              </Badge>
                            </div>
                            <Progress value={Math.min(freshPct, 100)} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[100px]">
                            <div className="flex justify-between text-xs">
                              <span>{formatCurrency(renewalAchieved)}</span>
                              <Badge 
                                variant={renewalPct >= 100 ? "default" : renewalPct >= 75 ? "secondary" : "outline"}
                                className="text-[10px] px-1"
                              >
                                {renewalPct.toFixed(0)}%
                              </Badge>
                            </div>
                            <Progress value={Math.min(renewalPct, 100)} className="h-1.5" />
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.period_start && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.period_start ? format(parseISO(formData.period_start), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.period_start ? parseISO(formData.period_start) : undefined}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, period_start: format(date, "yyyy-MM-dd") }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.period_end && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.period_end ? format(parseISO(formData.period_end), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.period_end ? parseISO(formData.period_end) : undefined}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, period_end: format(date, "yyyy-MM-dd") }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Fresh Sales Targets */}
            <div className="border rounded-lg p-3 space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <Label className="font-medium">Fresh Sales Targets</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Top Line (Revenue)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 300000"
                    value={formData.fresh_sales_top_line}
                    onChange={(e) => setFormData(prev => ({ ...prev, fresh_sales_top_line: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Bottom Line (Profit)</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.fresh_sales_bottom_line_type}
                      onValueChange={(value: ValueType) => setFormData(prev => ({ ...prev, fresh_sales_bottom_line_type: value }))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="value">₹</SelectItem>
                        <SelectItem value="percentage">%</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder={formData.fresh_sales_bottom_line_type === "percentage" ? "e.g., 20" : "e.g., 60000"}
                      value={formData.fresh_sales_bottom_line}
                      onChange={(e) => setFormData(prev => ({ ...prev, fresh_sales_bottom_line: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                  {formData.fresh_sales_bottom_line_type === "percentage" && formData.fresh_sales_bottom_line && (
                    <p className="text-xs text-muted-foreground">
                      {getCalculatedDisplay(formData.fresh_sales_bottom_line, "percentage", parseFloat(formData.fresh_sales_top_line) || 0)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Renewal Targets */}
            <div className="border rounded-lg p-3 space-y-3 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2">
                <RefreshCcw className="h-4 w-4 text-blue-600" />
                <Label className="font-medium">Renewal Targets</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Top Line (Revenue)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 200000"
                    value={formData.renewal_top_line}
                    onChange={(e) => setFormData(prev => ({ ...prev, renewal_top_line: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Bottom Line (Profit)</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.renewal_bottom_line_type}
                      onValueChange={(value: ValueType) => setFormData(prev => ({ ...prev, renewal_bottom_line_type: value }))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="value">₹</SelectItem>
                        <SelectItem value="percentage">%</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder={formData.renewal_bottom_line_type === "percentage" ? "e.g., 20" : "e.g., 40000"}
                      value={formData.renewal_bottom_line}
                      onChange={(e) => setFormData(prev => ({ ...prev, renewal_bottom_line: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                  {formData.renewal_bottom_line_type === "percentage" && formData.renewal_bottom_line && (
                    <p className="text-xs text-muted-foreground">
                      {getCalculatedDisplay(formData.renewal_bottom_line, "percentage", parseFloat(formData.renewal_top_line) || 0)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Incentive Eligibility Cap</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.incentive_cap_type}
                  onValueChange={(value: ValueType) => setFormData(prev => ({ ...prev, incentive_cap_type: value }))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="value">₹</SelectItem>
                    <SelectItem value="percentage">%</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder={formData.incentive_cap_type === "percentage" ? "e.g., 10" : "e.g., 50000"}
                  value={formData.incentive_eligibility_cap}
                  onChange={(e) => setFormData(prev => ({ ...prev, incentive_eligibility_cap: e.target.value }))}
                  className="flex-1"
                />
              </div>
              {formData.incentive_cap_type === "percentage" && formData.incentive_eligibility_cap && (
                <p className="text-xs text-muted-foreground">
                  {getCalculatedDisplay(
                    formData.incentive_eligibility_cap, 
                    "percentage", 
                    (parseFloat(formData.fresh_sales_top_line) || 0) + (parseFloat(formData.renewal_top_line) || 0)
                  )}
                </p>
              )}
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
              disabled={!formData.user_id || (!formData.fresh_sales_top_line && !formData.renewal_top_line) || saveMutation.isPending}
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
