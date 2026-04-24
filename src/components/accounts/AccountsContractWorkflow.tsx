import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format } from "date-fns";
import {
  FileText,
  CheckCircle,
  Package,
  Key,
  Receipt,
  CreditCard,
  ArrowRight,
  Search,
  Building2,
  User,
  Calendar,
  DollarSign,
  Loader2,
  Play,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClosedWonWorkflowInitiator } from "./ClosedWonWorkflowInitiator";

type ClosedWonSubstage = 
  | "odf_created" 
  | "odf_approved" 
  | "invoice_raised" 
  | "payment_received"
  | "request_odf"
  | "process_order"
  | "get_license"
  | "raise_invoice"
  | "collect_payment";

interface Contract {
  id: string;
  title: string;
  value: number;
  organization_name: string | null;
  closed_won_substage: ClosedWonSubstage | null;
  actual_close_date: string | null;
  contact_id: string | null;
  order_type: string | null;
  includes_support: boolean | null;
  includes_managed_service: boolean | null;
  includes_renewal: boolean | null;
  contact?: {
    name: string;
    company: string | null;
  };
}

const WORKFLOW_STAGES: { id: ClosedWonSubstage; label: string; icon: React.ElementType; description: string }[] = [
  { id: "request_odf", label: "Request ODF", icon: FileText, description: "Initiate Order Delivery Form request" },
  { id: "odf_approved", label: "ODF Approved", icon: CheckCircle, description: "Committee approved the ODF" },
  { id: "process_order", label: "Process Order", icon: Package, description: "Order is being processed" },
  { id: "get_license", label: "Get License", icon: Key, description: "License acquisition in progress" },
  { id: "raise_invoice", label: "Raise Invoice", icon: Receipt, description: "Invoice raised with license details" },
  { id: "collect_payment", label: "Collect Payment", icon: CreditCard, description: "Payment collection pending" },
];

const STAGE_ORDER: ClosedWonSubstage[] = [
  "request_odf",
  "odf_approved", 
  "process_order",
  "get_license",
  "raise_invoice",
  "collect_payment",
  "payment_received",
];

interface AccountsContractWorkflowProps {
  filterStage?: string;
}

export function AccountsContractWorkflow({ filterStage = "all" }: AccountsContractWorkflowProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [workflowDeal, setWorkflowDeal] = useState<Contract | null>(null);
  const { formatCurrency } = useOrganizationSettings();
  const queryClient = useQueryClient();

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["closed-won-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          id,
          title,
          value,
          organization_name,
          closed_won_substage,
          actual_close_date,
          contact_id,
          order_type,
          includes_support,
          includes_managed_service,
          includes_renewal,
          contacts:contact_id (
            name,
            company
          )
        `)
        .eq("stage", "closed_won")
        .order("actual_close_date", { ascending: false });

      if (error) throw error;
      return data as Contract[];
    },
  });

  // Check which deals have active workflows
  const { data: workflowDeals = [] } = useQuery({
    queryKey: ["deals-with-workflows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_sale_workflows")
        .select("deal_id")
        .eq("workflow_type", "odf_approval");

      if (error) throw error;
      return data.map(d => d.deal_id);
    },
  });

  const updateSubstageMutation = useMutation({
    mutationFn: async ({ dealId, substage }: { dealId: string; substage: ClosedWonSubstage }) => {
      const { error } = await supabase
        .from("deals")
        .update({ closed_won_substage: substage })
        .eq("id", dealId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["closed-won-contracts"] });
      toast.success("Contract stage updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update stage: " + error.message);
    },
  });

  const moveToNextStage = (contract: Contract) => {
    const currentIndex = contract.closed_won_substage 
      ? STAGE_ORDER.indexOf(contract.closed_won_substage)
      : -1;
    
    if (currentIndex < STAGE_ORDER.length - 1) {
      const nextStage = STAGE_ORDER[currentIndex + 1];
      updateSubstageMutation.mutate({ dealId: contract.id, substage: nextStage });
    }
  };

  const getContractsByStage = (stage: string) => {
    if (stage === "all") return contracts;
    if (stage === "completed") {
      return contracts.filter(c => c.closed_won_substage === "payment_received");
    }
    return contracts.filter(c => c.closed_won_substage === stage);
  };

  const filteredContracts = getContractsByStage(filterStage)
    .filter(c => 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact?.company?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const getStageStats = () => {
    const stats: Record<string, number> = { all: contracts.length, completed: 0 };
    WORKFLOW_STAGES.forEach(stage => {
      stats[stage.id] = contracts.filter(c => c.closed_won_substage === stage.id).length;
    });
    stats.completed = contracts.filter(c => c.closed_won_substage === "payment_received").length;
    return stats;
  };

  const stats = getStageStats();

  const getStageColor = (stage: ClosedWonSubstage | null): string => {
    switch (stage) {
      case "request_odf": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "odf_approved": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "process_order": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "get_license": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "raise_invoice": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "collect_payment": return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300";
      case "payment_received": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStageLabel = (stage: ClosedWonSubstage | null): string => {
    if (!stage) return "Pending";
    const found = WORKFLOW_STAGES.find(s => s.id === stage);
    if (found) return found.label;
    if (stage === "payment_received") return "Completed";
    if (stage === "odf_created") return "ODF Created";
    if (stage === "invoice_raised") return "Invoice Raised";
    return stage.replace(/_/g, " ");
  };

  const getTitle = () => {
    if (filterStage === "all") return "All Contracts";
    if (filterStage === "completed") return "Completed Contracts";
    return WORKFLOW_STAGES.find(s => s.id === filterStage)?.label || "Contracts";
  };

  const getDescription = () => {
    if (filterStage === "all") return "All closed-won deals in the fulfillment workflow";
    if (filterStage === "completed") return "Contracts with payment received";
    return WORKFLOW_STAGES.find(s => s.id === filterStage)?.description || "";
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
      {/* Workflow Pipeline Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {WORKFLOW_STAGES.map((stage, index) => (
          <Card 
            key={stage.id} 
            className={`transition-all ${filterStage === stage.id ? 'ring-2 ring-primary' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stage.icon className="w-5 h-5 text-primary" />
                {index < WORKFLOW_STAGES.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground hidden lg:block ml-auto" />
                )}
              </div>
              <p className="text-sm font-medium">{stage.label}</p>
              <p className="text-2xl font-bold text-primary">{stats[stage.id] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search contracts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <CardTitle>{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredContracts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No contracts found in this stage</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Close Date</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Current Stage</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {contract.contact?.company || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {contract.contact?.name || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {contract.actual_close_date 
                          ? format(new Date(contract.actual_close_date), "MMM d, yyyy")
                          : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        {formatCurrency(contract.value)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStageColor(contract.closed_won_substage)}>
                        {getStageLabel(contract.closed_won_substage)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!workflowDeals.includes(contract.id) ? (
                          <Button
                            size="sm"
                            onClick={() => setWorkflowDeal(contract)}
                            className="gap-1"
                          >
                            <Play className="w-3 h-3" />
                            Start Workflow
                          </Button>
                        ) : (
                          <>
                            <Select
                              value={contract.closed_won_substage || ""}
                              onValueChange={(value) => 
                                updateSubstageMutation.mutate({ 
                                  dealId: contract.id, 
                                  substage: value as ClosedWonSubstage 
                                })
                              }
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Set stage" />
                              </SelectTrigger>
                              <SelectContent>
                                {WORKFLOW_STAGES.map(stage => (
                                  <SelectItem key={stage.id} value={stage.id}>
                                    {stage.label}
                                  </SelectItem>
                                ))}
                                <SelectItem value="payment_received">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                            {contract.closed_won_substage !== "payment_received" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => moveToNextStage(contract)}
                                disabled={updateSubstageMutation.isPending}
                              >
                                <ArrowRight className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Workflow Initiator Dialog */}
      {workflowDeal && (
        <ClosedWonWorkflowInitiator
          deal={{
            id: workflowDeal.id,
            title: workflowDeal.title,
            value: workflowDeal.value,
            organization_name: workflowDeal.organization_name,
            order_type: workflowDeal.order_type,
            includes_support: workflowDeal.includes_support || false,
            includes_managed_service: workflowDeal.includes_managed_service || false,
            includes_renewal: workflowDeal.includes_renewal || false,
            contacts: workflowDeal.contact,
          }}
          open={!!workflowDeal}
          onOpenChange={(open) => !open && setWorkflowDeal(null)}
          onWorkflowCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["deals-with-workflows"] });
            queryClient.invalidateQueries({ queryKey: ["post-sale-workflows"] });
          }}
        />
      )}
    </div>
  );
}
