import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function BudgetManagement() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    name: "",
    fiscal_year: `${currentYear}-${currentYear + 1}`,
    budget_type: "annual",
    start_date: `${currentYear}-04-01`,
    end_date: `${currentYear + 1}-03-31`,
    total_budget: 0,
    notes: ""
  });

  // Fetch budgets
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("budgets") as any)
        .select(`
          *,
          items:budget_items(*, ledger:ledger_accounts(name))
        `)
        .eq("tenant_id", currentTenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch ledger accounts for budget allocation
  const { data: ledgers = [] } = useQuery({
    queryKey: ["ledgers-for-budget", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("ledger_accounts") as any)
        .select("id, name, account_group:account_groups(name, nature)")
        .eq("tenant_id", currentTenant.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Create budget mutation
  const createBudget = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase
        .from("budgets") as any)
        .insert({
          tenant_id: currentTenant?.id,
          ...formData,
          status: "draft"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget created successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create budget");
      console.error(error);
    }
  });

  // Update budget status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await (supabase
        .from("budgets") as any)
        .update({ 
          status,
          ...(status === "approved" ? { approved_at: new Date().toISOString() } : {})
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget status updated");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      fiscal_year: `${currentYear}-${currentYear + 1}`,
      budget_type: "annual",
      start_date: `${currentYear}-04-01`,
      end_date: `${currentYear + 1}-03-31`,
      total_budget: 0,
      notes: ""
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "approved":
        return <Badge className="bg-blue-500">Approved</Badge>;
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "closed":
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateBudgetUtilization = (budget: any) => {
    if (!budget.items || budget.items.length === 0) return { utilized: 0, percentage: 0 };
    const totalActual = budget.items.reduce((sum: number, item: any) => sum + (item.actual_amount || 0), 0);
    const percentage = budget.total_budget > 0 ? (totalActual / budget.total_budget) * 100 : 0;
    return { utilized: totalActual, percentage: Math.min(percentage, 100) };
  };

  const getVarianceIndicator = (variance: number) => {
    if (variance < 0) {
      return <span className="text-green-700 dark:text-green-400 flex items-center"><TrendingDown className="h-3 w-3 mr-1" />Under</span>;
    } else if (variance > 0) {
      return <span className="text-red-600 flex items-center"><TrendingUp className="h-3 w-3 mr-1" />Over</span>;
    }
    return <span className="text-muted-foreground">On Budget</span>;
  };

  const formatCurrency = (amount: number) => `₹${Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const stats = {
    totalBudgets: budgets.length,
    activeBudgets: budgets.filter((b: any) => b.status === "active").length,
    totalAllocated: budgets.filter((b: any) => b.status === "active").reduce((sum: number, b: any) => sum + (b.total_budget || 0), 0),
    totalUtilized: budgets.filter((b: any) => b.status === "active").reduce((sum: number, b: any) => {
      return sum + (b.items?.reduce((s: number, i: any) => s + (i.actual_amount || 0), 0) || 0);
    }, 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6" />
            Budget Management
          </h2>
          <p className="text-muted-foreground">Plan and track financial budgets</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Budget
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Budgets</div>
            <div className="text-2xl font-bold">{stats.totalBudgets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Active Budgets</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.activeBudgets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Allocated</div>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAllocated)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Utilized</div>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalUtilized)}</div>
            {stats.totalAllocated > 0 && (
              <Progress value={(stats.totalUtilized / stats.totalAllocated) * 100} className="mt-2 h-2" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budgets List */}
      <Card>
        <CardHeader>
          <CardTitle>Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Budget Name</TableHead>
                <TableHead>Fiscal Year</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Utilized</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : budgets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No budgets found. Create your first budget.
                  </TableCell>
                </TableRow>
              ) : (
                budgets.map((budget: any) => {
                  const utilization = calculateBudgetUtilization(budget);
                  return (
                    <TableRow key={budget.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedBudget(budget)}>
                      <TableCell className="font-medium">{budget.name}</TableCell>
                      <TableCell>{budget.fiscal_year}</TableCell>
                      <TableCell className="capitalize">{budget.budget_type}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(budget.start_date), "MMM yyyy")} - {format(new Date(budget.end_date), "MMM yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(budget.total_budget)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(utilization.utilized)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={utilization.percentage} className="w-20 h-2" />
                          <span className="text-sm">{utilization.percentage.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(budget.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {budget.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: budget.id, status: "approved" }); }}
                            >
                              <CheckCircle className="h-4 w-4 text-green-700 dark:text-green-400" />
                            </Button>
                          )}
                          {budget.status === "approved" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: budget.id, status: "active" }); }}
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Budget Details Dialog */}
      {selectedBudget && (
        <Dialog open={!!selectedBudget} onOpenChange={() => setSelectedBudget(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedBudget.name}
                {getStatusBadge(selectedBudget.status)}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-muted-foreground">Fiscal Year</Label>
                  <p className="font-medium">{selectedBudget.fiscal_year}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium capitalize">{selectedBudget.budget_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Budget</Label>
                  <p className="font-medium">{formatCurrency(selectedBudget.total_budget)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Utilized</Label>
                  <p className="font-medium">{formatCurrency(calculateBudgetUtilization(selectedBudget).utilized)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Budget vs Actual by Account</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Budgeted</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBudget.items?.length > 0 ? (
                      selectedBudget.items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.ledger?.name || "Unassigned"}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(item.budgeted_amount)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(item.actual_amount || 0)}</TableCell>
                          <TableCell className={`text-right font-mono ${item.variance_amount > 0 ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>
                            {item.variance_amount > 0 ? '+' : ''}{formatCurrency(item.variance_amount || 0)}
                          </TableCell>
                          <TableCell>{getVarianceIndicator(item.variance_amount || 0)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No budget allocations yet. Add line items to track spending.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* New Budget Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Budget</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Budget Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Annual Operating Budget 2024-25"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fiscal Year</Label>
                <Input
                  value={formData.fiscal_year}
                  onChange={(e) => setFormData({ ...formData, fiscal_year: e.target.value })}
                  placeholder="2024-2025"
                />
              </div>
              <div>
                <Label>Budget Type</Label>
                <Select value={formData.budget_type} onValueChange={(v) => setFormData({ ...formData, budget_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Total Budget Amount (₹)</Label>
              <Input
                type="number"
                value={formData.total_budget}
                onChange={(e) => setFormData({ ...formData, total_budget: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createBudget.mutate()} disabled={createBudget.isPending || !formData.name}>
              {createBudget.isPending ? "Creating..." : "Create Budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
