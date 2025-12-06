import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Plus,
  ChevronRight,
  CreditCard,
  Package,
  Key,
  Receipt,
  Loader2,
  Search,
  Filter,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type WorkflowType = "odf" | "payment_collection" | "order_processing" | "license_activation" | "invoice_generation";
type WorkflowStatus = "pending" | "in_progress" | "completed" | "failed" | "paused";

interface WorkflowStep {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  completedAt?: string;
  notes?: string;
}

interface Workflow {
  id: string;
  type: WorkflowType;
  entity_id: string;
  entity_type: string;
  status: WorkflowStatus;
  current_step: number;
  steps: WorkflowStep[];
  created_at: string;
  updated_at: string;
  deal_title?: string;
  deal_value?: number;
  contact_name?: string;
  company_name?: string;
}

const WORKFLOW_TEMPLATES: Record<WorkflowType, { name: string; icon: React.ElementType; steps: string[]; description: string }> = {
  odf: {
    name: "ODF Workflow",
    icon: FileText,
    description: "Order Delivery Form creation and approval workflow",
    steps: [
      "Request ODF",
      "Technical Review",
      "Commercial Review",
      "Management Approval",
      "ODF Generated",
      "Customer Confirmation",
    ],
  },
  payment_collection: {
    name: "Payment Collection",
    icon: CreditCard,
    description: "End-to-end payment collection and reconciliation",
    steps: [
      "Invoice Sent",
      "Payment Reminder (7 days)",
      "Payment Reminder (14 days)",
      "Escalation to Manager",
      "Final Notice",
      "Payment Received",
      "Receipt Generated",
    ],
  },
  order_processing: {
    name: "Order Processing",
    icon: Package,
    description: "Order fulfillment and delivery workflow",
    steps: [
      "Order Received",
      "Stock Verification",
      "Procurement (if needed)",
      "Quality Check",
      "Packaging",
      "Dispatch",
      "Delivery Confirmation",
    ],
  },
  license_activation: {
    name: "License Activation",
    icon: Key,
    description: "Software license provisioning workflow",
    steps: [
      "License Request",
      "Vendor Coordination",
      "License Key Generation",
      "Internal Verification",
      "Customer Delivery",
      "Activation Confirmation",
    ],
  },
  invoice_generation: {
    name: "Invoice Generation",
    icon: Receipt,
    description: "Invoice creation and distribution workflow",
    steps: [
      "Invoice Data Collection",
      "Finance Review",
      "Invoice Generation",
      "Internal Approval",
      "Customer Dispatch",
      "Acknowledgment",
    ],
  },
};

export function AccountsWorkflows() {
  const [activeTab, setActiveTab] = useState<WorkflowType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<string>("");
  const [selectedWorkflowType, setSelectedWorkflowType] = useState<WorkflowType>("odf");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch closed-won deals for workflow creation
  const { data: deals = [] } = useQuery({
    queryKey: ["closed-won-deals-for-workflow"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          id,
          title,
          value,
          contact_id,
          contacts:contact_id (name, company)
        `)
        .eq("stage", "closed_won")
        .order("actual_close_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch workflow logs
  const { data: workflowLogs = [], isLoading } = useQuery({
    queryKey: ["workflow-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Create workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async ({ dealId, workflowType }: { dealId: string; workflowType: WorkflowType }) => {
      const template = WORKFLOW_TEMPLATES[workflowType];
      const steps = template.steps.map((step, index) => ({
        id: `step-${index}`,
        name: step,
        status: index === 0 ? "in_progress" : "pending",
      }));

      const { error } = await supabase.from("workflow_logs").insert({
        workflow_type: workflowType,
        entity_type: "deal",
        entity_id: dealId,
        action: "workflow_started",
        status: "in_progress",
        details: { steps, current_step: 0 },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-logs"] });
      toast.success("Workflow created successfully");
      setIsCreateOpen(false);
      setSelectedDeal("");
    },
    onError: (error) => {
      toast.error("Failed to create workflow: " + error.message);
    },
  });

  // Update workflow step
  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ logId, newStatus, action }: { logId: string; newStatus: string; action: string }) => {
      const { error } = await supabase
        .from("workflow_logs")
        .update({ status: newStatus, action })
        .eq("id", logId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-logs"] });
      toast.success("Workflow updated");
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const filteredLogs = workflowLogs.filter((log) => {
    if (activeTab !== "all" && log.workflow_type !== activeTab) return false;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        log.workflow_type.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower) ||
        log.entity_id.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const workflowStats = Object.keys(WORKFLOW_TEMPLATES).reduce((acc, type) => {
    acc[type] = workflowLogs.filter((l) => l.workflow_type === type).length;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workflow Templates Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(WORKFLOW_TEMPLATES).map(([type, template]) => (
          <Card
            key={type}
            className={`cursor-pointer transition-all hover:shadow-md ${
              activeTab === type ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setActiveTab(type as WorkflowType)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <template.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium">{template.name}</p>
              <p className="text-2xl font-bold text-primary">{workflowStats[type] || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{template.steps.length} steps</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
              <DialogDescription>
                Start a new workflow for a closed-won deal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Deal</Label>
                <Select value={selectedDeal} onValueChange={setSelectedDeal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a deal" />
                  </SelectTrigger>
                  <SelectContent>
                    {deals.map((deal: any) => (
                      <SelectItem key={deal.id} value={deal.id}>
                        {deal.title} - {deal.contacts?.company || "No Company"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Workflow Type</Label>
                <Select
                  value={selectedWorkflowType}
                  onValueChange={(v) => setSelectedWorkflowType(v as WorkflowType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WORKFLOW_TEMPLATES).map(([type, template]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <template.icon className="w-4 h-4" />
                          {template.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedWorkflowType && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Workflow Steps:</p>
                  <div className="space-y-1">
                    {WORKFLOW_TEMPLATES[selectedWorkflowType].steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">
                          {index + 1}
                        </span>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  createWorkflowMutation.mutate({
                    dealId: selectedDeal,
                    workflowType: selectedWorkflowType,
                  })
                }
                disabled={!selectedDeal || createWorkflowMutation.isPending}
              >
                {createWorkflowMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Start Workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workflow Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Activity Log</CardTitle>
          <CardDescription>Track all workflow activities and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No workflow logs found</p>
              <p className="text-sm">Create a workflow to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow Type</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const template = WORKFLOW_TEMPLATES[log.workflow_type as WorkflowType];
                  const Icon = template?.icon || FileText;
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {template?.name || log.workflow_type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.entity_type}: {log.entity_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{log.action.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {log.status === "in_progress" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updateWorkflowMutation.mutate({
                                    logId: log.id,
                                    newStatus: "completed",
                                    action: "workflow_completed",
                                  })
                                }
                              >
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updateWorkflowMutation.mutate({
                                    logId: log.id,
                                    newStatus: "paused",
                                    action: "workflow_paused",
                                  })
                                }
                              >
                                <Pause className="w-4 h-4 text-yellow-500" />
                              </Button>
                            </>
                          )}
                          {log.status === "paused" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateWorkflowMutation.mutate({
                                  logId: log.id,
                                  newStatus: "in_progress",
                                  action: "workflow_resumed",
                                })
                              }
                            >
                              <Play className="w-4 h-4 text-blue-500" />
                            </Button>
                          )}
                          {log.status === "failed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateWorkflowMutation.mutate({
                                  logId: log.id,
                                  newStatus: "in_progress",
                                  action: "workflow_retried",
                                })
                              }
                            >
                              <RotateCcw className="w-4 h-4 text-orange-500" />
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
    </div>
  );
}
