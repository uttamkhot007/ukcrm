import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { ProcurementStats } from "./ProcurementStats";
import { ProcurementRequestsList } from "./ProcurementRequestsList";
import { PurchaseOrdersList } from "./PurchaseOrdersList";
import { NewProcurementRequestDialog } from "./NewProcurementRequestDialog";
import { ProcurementRequestDetailsSheet } from "./ProcurementRequestDetailsSheet";

interface ProcurementModuleProps {
  initialTab?: string;
}

export function ProcurementModule({ initialTab = "requests" }: ProcurementModuleProps) {
  const { currentTenant } = useTenant();
  const [requests, setRequests] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: requestsData } = await (supabase
        .from("procurement_requests" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);

      setRequests(requestsData || []);

      const { data: posData } = await (supabase
        .from("purchase_orders" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);

      setPurchaseOrders(posData || []);
    } catch (error) {
      console.error("Error fetching procurement data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentTenant?.id]);

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.request_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalRequests: requests.length,
    pendingRequests: requests.filter((r) => r.status === "submitted" || r.status === "under_review").length,
    approvedRequests: requests.filter((r) => r.status === "approved").length,
    totalPOs: purchaseOrders.length,
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  const renderContent = () => {
    switch (initialTab) {
      case "requests":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="po_created">PO Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ProcurementRequestsList
              requests={filteredRequests}
              onRefresh={fetchData}
              onViewDetails={handleViewDetails}
            />
          </div>
        );
      case "purchase-orders":
        return <PurchaseOrdersList orders={purchaseOrders} onRefresh={fetchData} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Procurement</h1>
          <p className="text-muted-foreground">Manage procurement requests and purchase orders</p>
        </div>
        <NewProcurementRequestDialog onSuccess={fetchData} />
      </div>

      <ProcurementStats stats={stats} />

      <div className="min-w-0">
        {renderContent()}
      </div>

      <ProcurementRequestDetailsSheet
        request={selectedRequest}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onRefresh={fetchData}
      />
    </div>
  );
}
