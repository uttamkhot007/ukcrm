import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format } from "date-fns";
import {
  ShoppingCart,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Plus,
  Building2,
  Calendar,
  Loader2,
  Package,
  ArrowRight,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";

interface ProcurementRequest {
  id: string;
  request_number: string;
  title: string;
  description: string | null;
  requested_by: string;
  status: string;
  priority: string;
  total_amount: number;
  created_at: string;
  order_request_id: string | null;
  workflow_id: string | null;
}

interface AccountsProcurementProps {
  orderRequestId?: string;
  onProcurementCreated?: (procurementId: string) => void;
}

export function AccountsProcurement({ orderRequestId, onProcurementCreated }: AccountsProcurementProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    title: "",
    description: "",
    priority: "medium",
    items: [{ description: "", quantity: 1, unit_price: 0 }],
  });
  const { formatCurrency } = useOrganizationSettings();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["accounts-procurement-requests", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("procurement_requests" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;
      return data as ProcurementRequest[];
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (request: typeof newRequest) => {
      const requestNumber = `PR-${Date.now().toString(36).toUpperCase()}`;
      const totalAmount = request.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      const { data, error } = await (supabase
        .from("procurement_requests" as any)
        .insert({
          request_number: requestNumber,
          title: request.title,
          description: request.description,
          requested_by: user?.id,
          status: "submitted",
          priority: request.priority,
          total_amount: totalAmount,
          tenant_id: currentTenant?.id,
          order_request_id: orderRequestId || null,
        })
        .select()
        .single() as any);

      if (error) throw error;

      // Insert items
      if (request.items.length > 0 && data) {
        const items = request.items.map((item) => ({
          procurement_request_id: (data as any).id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
        }));

        await (supabase.from("procurement_request_items" as any).insert(items) as any);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["accounts-procurement-requests"] });
      toast.success("Procurement request created successfully");
      setDialogOpen(false);
      setNewRequest({
        title: "",
        description: "",
        priority: "medium",
        items: [{ description: "", quantity: 1, unit_price: 0 }],
      });
      if (onProcurementCreated && data) {
        onProcurementCreated((data as any).id);
      }
    },
    onError: (error) => {
      toast.error("Failed to create procurement request: " + error.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase
        .from("procurement_requests" as any)
        .update({ status })
        .eq("id", id) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-procurement-requests"] });
      toast.success("Status updated successfully");
    },
  });

  const addItem = () => {
    setNewRequest({
      ...newRequest,
      items: [...newRequest.items, { description: "", quantity: 1, unit_price: 0 }],
    });
  };

  const removeItem = (index: number) => {
    setNewRequest({
      ...newRequest,
      items: newRequest.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...newRequest.items];
    items[index] = { ...items[index], [field]: value };
    setNewRequest({ ...newRequest, items });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      under_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      po_created: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    };
    return styles[status] || "bg-muted text-muted-foreground";
  };

  const filteredRequests = requests.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.request_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || r.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: requests.length,
    submitted: requests.filter((r) => r.status === "submitted").length,
    approved: requests.filter((r) => r.status === "approved").length,
    pending: requests.filter((r) => ["submitted", "under_review"].includes(r.status)).length,
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
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-2xl font-bold">{stats.submitted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Procurement Requests</CardTitle>
            <CardDescription>Request and manage procurement of assets and items</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Procurement Request</DialogTitle>
                <DialogDescription>
                  Request procurement of assets or items
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={newRequest.title}
                    onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                    placeholder="Enter request title"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                    placeholder="Describe what you need"
                  />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={newRequest.priority}
                    onValueChange={(value) => setNewRequest({ ...newRequest, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {newRequest.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            placeholder="Unit Price"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          {newRequest.items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                            >
                              <XCircle className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Total: {formatCurrency(newRequest.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0))}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createRequestMutation.mutate(newRequest)}
                  disabled={!newRequest.title || createRequestMutation.isPending}
                >
                  {createRequestMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Create Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="submitted">Submitted</TabsTrigger>
                <TabsTrigger value="under_review">Under Review</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No procurement requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-sm">{request.request_number}</TableCell>
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell>
                      <Badge variant={request.priority === "urgent" ? "destructive" : "secondary"}>
                        {request.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(request.total_amount || 0)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(request.status)}>
                        {request.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(request.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {request.status === "submitted" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatusMutation.mutate({ id: request.id, status: "approved" })}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateStatusMutation.mutate({ id: request.id, status: "rejected" })}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {request.status === "approved" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: request.id, status: "po_created" })}
                          >
                            <Package className="w-4 h-4 mr-1" />
                            Create PO
                          </Button>
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
    </div>
  );
}
