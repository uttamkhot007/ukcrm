import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Plus, Check, X, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

interface LeavePolicy {
  id: string;
  name: string;
  leave_type: string;
  days_per_year: number;
  carryover_allowed: boolean;
  requires_approval: boolean;
}

interface LeaveRequest {
  id: string;
  request_number: string;
  user_id: string;
  policy_id: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string | null;
  status: string;
  created_at: string;
  leave_policies?: { name: string; leave_type: string };
}

interface LeaveBalance {
  id: string;
  user_id: string;
  policy_id: string;
  year: number;
  entitled_days: number;
  used_days: number;
  pending_days: number;
  leave_policies?: { name: string; leave_type: string };
}

export function LeaveManagement() {
  const [activeTab, setActiveTab] = useState("requests");
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    policy_id: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const queryClient = useQueryClient();

  const { data: policies = [] } = useQuery({
    queryKey: ["leave-policies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_policies").select("*").eq("is_active", true);
      if (error) throw error;
      return data as LeavePolicy[];
    },
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*, leave_policies(name, leave_type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LeaveRequest[];
    },
  });

  const { data: balances = [] } = useQuery({
    queryKey: ["leave-balances"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("leave_balances")
        .select("*, leave_policies(name, leave_type)")
        .eq("user_id", user.user?.id || "")
        .eq("year", new Date().getFullYear());
      if (error) throw error;
      return data as LeaveBalance[];
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: typeof requestFormData) => {
      const { data: user } = await supabase.auth.getUser();
      const days = differenceInDays(new Date(data.end_date), new Date(data.start_date)) + 1;
      const { error } = await supabase.from("leave_requests").insert({
        user_id: user.user?.id!,
        policy_id: data.policy_id,
        start_date: data.start_date,
        end_date: data.end_date,
        days_requested: days,
        reason: data.reason || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      setIsRequestDialogOpen(false);
      setRequestFormData({ policy_id: "", start_date: "", end_date: "", reason: "" });
      toast.success("Leave request submitted successfully");
    },
    onError: () => toast.error("Failed to submit leave request"),
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status,
          approved_by: status === "approved" ? user.user?.id : null,
          approved_at: status === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Leave request updated");
    },
    onError: () => toast.error("Failed to update request"),
  });

  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const approvedRequests = requests.filter((r) => r.status === "approved").length;

  const statusColors: Record<string, string> = {
    pending: "secondary",
    approved: "default",
    rejected: "destructive",
    cancelled: "outline",
  };

  if (requestsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Leave Management</h2>
          <p className="text-muted-foreground">Manage time-off requests and balances</p>
        </div>
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Request Leave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Time Off</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createRequestMutation.mutate(requestFormData); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Leave Type *</Label>
                <Select value={requestFormData.policy_id} onValueChange={(v) => setRequestFormData({ ...requestFormData, policy_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
                  <SelectContent>
                    {policies.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input type="date" value={requestFormData.start_date} onChange={(e) => setRequestFormData({ ...requestFormData, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Input type="date" value={requestFormData.end_date} onChange={(e) => setRequestFormData({ ...requestFormData, end_date: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea value={requestFormData.reason} onChange={(e) => setRequestFormData({ ...requestFormData, reason: e.target.value })} placeholder="Optional reason for leave" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsRequestDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createRequestMutation.isPending}>Submit Request</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{pendingRequests}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{approvedRequests}</div></CardContent>
        </Card>
        {balances.slice(0, 2).map((balance) => (
          <Card key={balance.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{balance.leave_policies?.name}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balance.entitled_days - balance.used_days - balance.pending_days}</div>
              <p className="text-xs text-muted-foreground">days remaining</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">All Requests</TabsTrigger>
          <TabsTrigger value="balances">My Balances</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">{request.request_number}</TableCell>
                      <TableCell>Employee</TableCell>
                      <TableCell><Badge variant="outline">{request.leave_policies?.name}</Badge></TableCell>
                      <TableCell>
                        {format(new Date(request.start_date), "MMM d")} - {format(new Date(request.end_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{request.days_requested}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[request.status] as any}>{request.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => updateRequestMutation.mutate({ id: request.id, status: "approved" })}>
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => updateRequestMutation.mutate({ id: request.id, status: "rejected" })}>
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {balances.map((balance) => (
              <Card key={balance.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {balance.leave_policies?.name}
                    <Badge variant="outline">{balance.year}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entitled</span>
                      <span className="font-medium">{balance.entitled_days} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Used</span>
                      <span className="font-medium">{balance.used_days} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending</span>
                      <span className="font-medium">{balance.pending_days} days</span>
                    </div>
                    <div className="pt-4 border-t flex justify-between">
                      <span className="font-medium">Available</span>
                      <span className="text-lg font-bold text-primary">{balance.entitled_days - balance.used_days - balance.pending_days} days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Team leave calendar coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
