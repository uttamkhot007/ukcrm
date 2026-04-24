import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Upload, Receipt } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ExpenseReportDetailsSheetProps {
  report: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseReportDetailsSheet({
  report,
  open,
  onOpenChange,
}: ExpenseReportDetailsSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = report.user_id === user?.id;
  const isDraft = report.status === "draft";

  const [newItem, setNewItem] = useState({
    description: "",
    amount: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    category_id: "",
    merchant_name: "",
    notes: "",
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["expense-items", report.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_items")
        .select("*, expense_categories(*)")
        .eq("expense_report_id", report.id)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expense_items").insert({
        expense_report_id: report.id,
        description: newItem.description,
        amount: parseFloat(newItem.amount),
        expense_date: newItem.expense_date,
        category_id: newItem.category_id || null,
        merchant_name: newItem.merchant_name || null,
        notes: newItem.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-items", report.id] });
      queryClient.invalidateQueries({ queryKey: ["expense-reports"] });
      queryClient.invalidateQueries({ queryKey: ["expense-stats"] });
      toast.success("Expense added");
      setNewItem({
        description: "",
        amount: "",
        expense_date: format(new Date(), "yyyy-MM-dd"),
        category_id: "",
        merchant_name: "",
        notes: "",
      });
    },
    onError: () => {
      toast.error("Failed to add expense");
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("expense_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-items", report.id] });
      queryClient.invalidateQueries({ queryKey: ["expense-reports"] });
      queryClient.invalidateQueries({ queryKey: ["expense-stats"] });
      toast.success("Expense removed");
    },
    onError: () => {
      toast.error("Failed to remove expense");
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddItem = () => {
    if (!newItem.description || !newItem.amount) {
      toast.error("Please fill in description and amount");
      return;
    }
    addItemMutation.mutate();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <SheetTitle>{report.title}</SheetTitle>
            <Badge variant={report.status === "draft" ? "outline" : "default"}>
              {report.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            {report.report_number}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Amount:</span>
                  <p className="text-xl font-bold mt-1">
                    {formatCurrency(Number(report.total_amount))}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Items:</span>
                  <p className="text-xl font-bold mt-1">{items?.length || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="font-medium mt-1">
                    {format(new Date(report.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                {report.submitted_at && (
                  <div>
                    <span className="text-muted-foreground">Submitted:</span>
                    <p className="font-medium mt-1">
                      {format(new Date(report.submitted_at), "MMM d, yyyy")}
                    </p>
                  </div>
                )}
              </div>
              {report.description && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {report.description}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Add New Expense (only for draft reports) */}
          {isOwner && isDraft && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Expense
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="e.g., Taxi to airport"
                      value={newItem.description}
                      onChange={(e) =>
                        setNewItem({ ...newItem, description: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newItem.amount}
                      onChange={(e) =>
                        setNewItem({ ...newItem, amount: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newItem.expense_date}
                      onChange={(e) =>
                        setNewItem({ ...newItem, expense_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={newItem.category_id}
                      onValueChange={(value) =>
                        setNewItem({ ...newItem, category_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Merchant</Label>
                    <Input
                      placeholder="Optional"
                      value={newItem.merchant_name}
                      onChange={(e) =>
                        setNewItem({ ...newItem, merchant_name: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button onClick={handleAddItem} disabled={addItemMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Expense Items */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Expenses ({items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : !items?.length ? (
                <p className="text-muted-foreground text-center py-4">
                  No expenses added yet
                </p>
              ) : (
                <div className="space-y-3">
                  {items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.description}</span>
                          {item.expense_categories && (
                            <Badge variant="outline" className="text-xs">
                              {item.expense_categories.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(item.expense_date), "MMM d, yyyy")}
                          {item.merchant_name && ` • ${item.merchant_name}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">
                          {formatCurrency(Number(item.amount))}
                        </span>
                        {isOwner && isDraft && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
