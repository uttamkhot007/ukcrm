import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import {
  FileText,
  CheckCircle,
  Clock,
  Play,
  Pause,
  CreditCard,
  Package,
  Loader2,
  Search,
  Eye,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountsWorkflowBoards } from "./AccountsWorkflowBoards";
import { AccountsWorkflowStageView } from "./AccountsWorkflowStageView";
import { OrderRequestDetails } from "./OrderRequestDetails";
import { getAccountsStageProgress, formatAccountsStageName } from "@/lib/accounts-workflow-templates";

interface AccountsWorkflowsProps {
  filterType?: string;
}

export function AccountsWorkflows({ filterType = "all" }: AccountsWorkflowsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch accounts workflows
  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["accounts-workflows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_workflows")
        .select(`
          *,
          deals:deal_id (title, value, contacts:contact_id (name, company))
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Update workflow status
  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ workflowId, newStatus }: { workflowId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("accounts_workflows")
        .update({ status: newStatus })
        .eq("id", workflowId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-workflows"] });
      toast.success("Workflow updated");
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "active":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "on_hold":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const filteredWorkflows = workflows.filter((w) => {
    if (filterType !== "all" && w.workflow_type !== filterType) return false;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        w.title.toLowerCase().includes(searchLower) ||
        w.workflow_type.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const stats = {
    order_processing: workflows.filter(w => w.workflow_type === "order_processing" && w.status === "active").length,
    payment_collection: workflows.filter(w => w.workflow_type === "payment_collection" && w.status === "active").length,
    completed: workflows.filter(w => w.status === "completed").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workflow Template Boards */}
      <AccountsWorkflowBoards onWorkflowCreated={() => queryClient.invalidateQueries({ queryKey: ["accounts-workflows"] })} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.order_processing}</p>
              <p className="text-sm text-muted-foreground">Active Order Processing</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.payment_collection}</p>
              <p className="text-sm text-muted-foreground">Active Payment Collection</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Completed Workflows</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search workflows..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Workflows Table */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Activity</CardTitle>
          <CardDescription>Track order processing and payment collection workflows</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredWorkflows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No workflows found</p>
              <p className="text-sm">Start an Order Processing request to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Deal</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkflows.map((workflow) => {
                  const progress = getAccountsStageProgress(
                    workflow.current_stage,
                    workflow.workflow_type as "order_processing" | "payment_collection"
                  );
                  const Icon = workflow.workflow_type === "order_processing" ? Package : CreditCard;
                  
                  return (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary" />
                          <div>
                            <span className="font-medium">{workflow.title}</span>
                            {workflow.parent_workflow_id && (
                              <Badge variant="outline" className="ml-2 text-xs">Auto</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{workflow.deals?.title || "-"}</div>
                          <div className="text-muted-foreground">{workflow.deals?.contacts?.company}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatAccountsStageName(workflow.current_stage)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(workflow.status)}>{workflow.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(workflow.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedWorkflow(workflow)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {workflow.status === "active" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateWorkflowMutation.mutate({ workflowId: workflow.id, newStatus: "on_hold" })}
                            >
                              <Pause className="w-4 h-4 text-yellow-500" />
                            </Button>
                          )}
                          {workflow.status === "on_hold" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateWorkflowMutation.mutate({ workflowId: workflow.id, newStatus: "active" })}
                            >
                              <Play className="w-4 h-4 text-green-500" />
                            </Button>
                          )}
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

      {/* Workflow Details Sheet */}
      <Sheet open={!!selectedWorkflow} onOpenChange={() => setSelectedWorkflow(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedWorkflow?.workflow_type === "order_processing" ? (
                <Package className="w-5 h-5 text-blue-500" />
              ) : (
                <CreditCard className="w-5 h-5 text-green-500" />
              )}
              {selectedWorkflow?.title}
            </SheetTitle>
            <SheetDescription>
              {selectedWorkflow?.deals?.title} - {selectedWorkflow?.deals?.contacts?.company}
            </SheetDescription>
          </SheetHeader>

          {selectedWorkflow && (
            <Tabs defaultValue="stages" className="mt-6">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="stages">Workflow Stages</TabsTrigger>
                <TabsTrigger value="details">Order Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="stages" className="mt-4">
                <AccountsWorkflowStageView
                  workflowId={selectedWorkflow.id}
                  workflowType={selectedWorkflow.workflow_type}
                  currentStage={selectedWorkflow.current_stage}
                  onStageComplete={() => {
                    queryClient.invalidateQueries({ queryKey: ["accounts-workflows"] });
                    setSelectedWorkflow(null);
                  }}
                />
              </TabsContent>
              
              <TabsContent value="details" className="mt-4">
                {selectedWorkflow.order_request_id ? (
                  <OrderRequestDetails
                    orderRequestId={selectedWorkflow.order_request_id}
                    onUpdate={() => queryClient.invalidateQueries({ queryKey: ["accounts-workflows"] })}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No order request details available</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
