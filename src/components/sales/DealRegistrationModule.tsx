import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Plus, 
  FileCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Eye,
  Filter,
  Calendar
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { NewDealRegistrationDialog } from "./NewDealRegistrationDialog";
import { DealRegistrationDetailsSheet } from "./DealRegistrationDetailsSheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DealRegistration {
  id: string;
  dr_number: string;
  vendor_name: string;
  vendor_program: string | null;
  customer_name: string;
  opportunity_value: number;
  expected_close_date: string | null;
  status: string;
  priority: string;
  sla_deadline: string | null;
  dr_id_from_vendor: string | null;
  dr_expiry_date: string | null;
  created_at: string;
  requester_id: string;
  assigned_to: string | null;
}

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-500/10 text-yellow-500" },
  in_progress: { label: "In Progress", icon: AlertCircle, color: "bg-blue-500/10 text-blue-500" },
  approved: { label: "Approved", icon: CheckCircle2, color: "bg-green-500/10 text-green-500" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-500/10 text-red-500" },
  expired: { label: "Expired", icon: Clock, color: "bg-gray-500/10 text-gray-500" },
  closed: { label: "Closed", icon: FileCheck, color: "bg-purple-500/10 text-purple-500" },
};

const priorityColors = {
  low: "bg-gray-500/10 text-gray-500",
  medium: "bg-blue-500/10 text-blue-500",
  high: "bg-orange-500/10 text-orange-500",
  critical: "bg-red-500/10 text-red-500",
};

export function DealRegistrationModule() {
  const { user, role } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [selectedDRId, setSelectedDRId] = useState<string | null>(null);

  const isAccountsTeam = role === 'admin' || role === 'manager';

  // Fetch deal registrations
  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['deal-registrations', currentTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('deal_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentTenant?.id) {
        query = query.eq('tenant_id', currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DealRegistration[];
    },
    enabled: !!user,
  });

  const filteredRegistrations = registrations.filter(dr => {
    const matchesSearch = 
      dr.dr_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dr.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dr.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || dr.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    inProgress: registrations.filter(r => r.status === 'in_progress').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
  };

  const getStatusInfo = (status: string) => statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  const isSLABreached = (slaDeadline: string | null) => {
    if (!slaDeadline) return false;
    return new Date(slaDeadline) < new Date();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <FileCheck className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Deal Registration</h1>
            <p className="text-muted-foreground">Request and track vendor deal registrations</p>
          </div>
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New DR Request
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Requests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by DR number, vendor, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Registrations List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg">No deal registrations found</h3>
            <p className="text-muted-foreground mb-4">
              {registrations.length === 0 
                ? "Create your first deal registration request" 
                : "Try adjusting your search or filter criteria"}
            </p>
            {registrations.length === 0 && (
              <Button onClick={() => setIsNewDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New DR Request
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRegistrations.map((dr) => {
            const statusInfo = getStatusInfo(dr.status);
            const StatusIcon = statusInfo.icon;
            const slaBreached = isSLABreached(dr.sla_deadline);

            return (
              <Card 
                key={dr.id} 
                className={cn(
                  "hover:shadow-md transition-all cursor-pointer",
                  slaBreached && dr.status === 'pending' && "border-red-500/50"
                )}
                onClick={() => setSelectedDRId(dr.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", statusInfo.color)}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{dr.dr_number}</span>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                          <Badge className={priorityColors[dr.priority as keyof typeof priorityColors]}>
                            {dr.priority}
                          </Badge>
                          {slaBreached && dr.status === 'pending' && (
                            <Badge variant="destructive">SLA Breached</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          <span className="font-medium text-foreground">{dr.vendor_name}</span>
                          {dr.vendor_program && <span> • {dr.vendor_program}</span>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Customer: {dr.customer_name}</span>
                          <span>Value: ${dr.opportunity_value?.toLocaleString() || 0}</span>
                          {dr.expected_close_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(dr.expected_close_date), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                        {dr.dr_id_from_vendor && (
                          <div className="text-sm text-green-600 mt-1">
                            DR ID: {dr.dr_id_from_vendor}
                            {dr.dr_expiry_date && (
                              <span className="text-muted-foreground ml-2">
                                (Expires: {format(new Date(dr.dr_expiry_date), "MMM d, yyyy")})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{formatDistanceToNow(new Date(dr.created_at), { addSuffix: true })}</div>
                      {dr.sla_deadline && dr.status === 'pending' && (
                        <div className={cn("text-xs", slaBreached ? "text-red-500" : "text-muted-foreground")}>
                          SLA: {formatDistanceToNow(new Date(dr.sla_deadline), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <NewDealRegistrationDialog 
        open={isNewDialogOpen} 
        onOpenChange={setIsNewDialogOpen} 
      />
      <DealRegistrationDetailsSheet
        drId={selectedDRId}
        open={!!selectedDRId}
        onOpenChange={(open) => !open && setSelectedDRId(null)}
      />
    </div>
  );
}
