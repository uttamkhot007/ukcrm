import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Send, Trash2, Plane } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { NewTravelRequestDialog } from "./NewTravelRequestDialog";
import { TravelRequestDetailsSheet } from "./TravelRequestDetailsSheet";

export function TravelRequestsList() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["travel-requests", user?.id, currentTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("travel_requests")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (currentTenant) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("travel_requests")
        .update({ 
          status: "submitted",
          submitted_at: new Date().toISOString()
        })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-requests"] });
      toast.success("Travel request submitted for approval");
    },
    onError: () => {
      toast.error("Failed to submit request");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("travel_requests")
        .delete()
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-requests"] });
      toast.success("Travel request deleted");
    },
    onError: () => {
      toast.error("Failed to delete request");
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Draft", variant: "outline" },
      submitted: { label: "Pending Approval", variant: "secondary" },
      approved: { label: "Approved", variant: "default" },
      rejected: { label: "Rejected", variant: "destructive" },
      cancelled: { label: "Cancelled", variant: "outline" },
      completed: { label: "Completed", variant: "default" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          My Travel Requests
        </CardTitle>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !requests?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            No travel requests found. Plan your next trip!
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-muted-foreground">
                      {request.request_number}
                    </span>
                    {getStatusBadge(request.status)}
                    <Badge variant="outline">
                      {request.travel_type}
                    </Badge>
                  </div>
                  <h4 className="font-medium mt-1">{request.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {request.departure_city} → {request.destination_city}
                    {" • "}
                    {format(new Date(request.departure_date), "MMM d")} - {format(new Date(request.return_date), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-lg font-semibold">
                    {formatCurrency(Number(request.estimated_cost || 0))}
                  </p>
                  <p className="text-xs text-muted-foreground">estimated</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {request.status === "draft" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => submitMutation.mutate(request.id)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(request.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <NewTravelRequestDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

      {selectedRequest && (
        <TravelRequestDetailsSheet
          request={selectedRequest}
          open={!!selectedRequest}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
        />
      )}
    </Card>
  );
}
