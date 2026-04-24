import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Search,
  FileCheck,
  Clock,
  AlertTriangle,
  Building2,
  Loader2,
  Calendar,
  Shield,
  Users,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { CustomerContractSheet } from "./CustomerContractSheet";

interface CustomerContract {
  id: string;
  organization_id: string;
  deal_id: string | null;
  contract_name: string;
  contract_type: string;
  solution_details: any[];
  license_details: any;
  start_date: string;
  end_date: string;
  status: string;
  sla_response_hours: number;
  sla_resolution_hours: number;
  escalation_matrix: any[];
  support_contacts: any[];
  notes: string | null;
  assigned_technical_team: string[];
  created_at: string;
  organization?: {
    id: string;
    name: string;
    organization_type: string;
    solutions: string[] | null;
    services: string[] | null;
  };
}

const CONTRACT_TYPES = [
  { value: "support", label: "Support" },
  { value: "professional_services", label: "Professional Services" },
  { value: "managed_services", label: "Managed Services" },
  { value: "training", label: "Training" },
  { value: "consultation", label: "Consultation" },
];

const getStatusBadge = (status: string, daysRemaining: number) => {
  if (status === "expired" || daysRemaining < 0) {
    return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Expired</Badge>;
  }
  if (status === "cancelled") {
    return <Badge variant="secondary">Cancelled</Badge>;
  }
  if (status === "pending") {
    return <Badge variant="outline">Pending</Badge>;
  }
  if (daysRemaining <= 30) {
    return <Badge className="bg-orange-500"><Clock className="w-3 h-3 mr-1" />Expiring Soon</Badge>;
  }
  return <Badge className="bg-green-500"><FileCheck className="w-3 h-3 mr-1" />Active</Badge>;
};

export function CustomerContractsView() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    organization_id: "",
    contract_name: "",
    contract_type: "support",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    sla_response_hours: 24,
    sla_resolution_hours: 72,
    notes: "",
  });

  // Fetch customer organizations
  const { data: organizations = [] } = useQuery({
    queryKey: ["customer-organizations", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alliance_organizations")
        .select("id, name, organization_type, solutions, services")
        .eq("tenant_id", currentTenant!.id)
        .eq("organization_type", "customer")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch contracts
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["customer-support-contracts", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_support_contracts")
        .select(`
          *,
          organization:alliance_organizations(id, name, organization_type, solutions, services)
        `)
        .eq("tenant_id", currentTenant!.id)
        .order("end_date", { ascending: true });
      if (error) throw error;
      return data as CustomerContract[];
    },
  });

  const createContractMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customer_support_contracts").insert({
        ...formData,
        tenant_id: currentTenant!.id,
        created_by: user!.id,
        status: "active",
        solution_details: [],
        license_details: {},
        escalation_matrix: [],
        support_contacts: [],
        assigned_technical_team: [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-support-contracts"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success("Contract created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create contract: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      organization_id: "",
      contract_name: "",
      contract_type: "support",
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: "",
      sla_response_hours: 24,
      sla_resolution_hours: 72,
      notes: "",
    });
  };

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.contract_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.organization?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || contract.contract_type === typeFilter;
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: contracts.length,
    active: contracts.filter((c) => c.status === "active").length,
    expiringSoon: contracts.filter((c) => {
      const days = differenceInDays(parseISO(c.end_date), new Date());
      return days > 0 && days <= 30 && c.status === "active";
    }).length,
    expired: contracts.filter((c) => differenceInDays(parseISO(c.end_date), new Date()) < 0).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Contracts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <FileCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expiringSoon}</p>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expired}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contracts or customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CONTRACT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Customer Contract</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Customer *</label>
                <Select
                  value={formData.organization_id}
                  onValueChange={(v) => setFormData({ ...formData, organization_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Contract Name *</label>
                <Input
                  placeholder="e.g., Annual Support Contract"
                  value={formData.contract_name}
                  onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contract Type</label>
                <Select
                  value={formData.contract_type}
                  onValueChange={(v) => setFormData({ ...formData, contract_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date *</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">SLA Response (hours)</label>
                <Input
                  type="number"
                  value={formData.sla_response_hours}
                  onChange={(e) =>
                    setFormData({ ...formData, sla_response_hours: parseInt(e.target.value) || 24 })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">SLA Resolution (hours)</label>
                <Input
                  type="number"
                  value={formData.sla_resolution_hours}
                  onChange={(e) =>
                    setFormData({ ...formData, sla_resolution_hours: parseInt(e.target.value) || 72 })
                  }
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createContractMutation.mutate()}
                  disabled={
                    createContractMutation.isPending ||
                    !formData.organization_id ||
                    !formData.contract_name ||
                    !formData.end_date
                  }
                >
                  {createContractMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create Contract
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No contracts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredContracts.map((contract) => {
                  const daysRemaining = differenceInDays(parseISO(contract.end_date), new Date());
                  return (
                    <TableRow
                      key={contract.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedContractId(contract.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{contract.organization?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {contract.organization?.solutions?.slice(0, 2).join(", ") || "No solutions"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{contract.contract_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {contract.contract_type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Shield className="w-3 h-3 text-muted-foreground" />
                          <span>{contract.sla_response_hours}h / {contract.sla_resolution_hours}h</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span>
                            {format(parseISO(contract.start_date), "MMM d, yyyy")} -{" "}
                            {format(parseISO(contract.end_date), "MMM d, yyyy")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(contract.status, daysRemaining)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContractId(contract.id);
                          }}
                        >
                          <Users className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Contract Details Sheet */}
      <CustomerContractSheet
        contractId={selectedContractId}
        open={!!selectedContractId}
        onOpenChange={(open) => !open && setSelectedContractId(null)}
      />
    </div>
  );
}
