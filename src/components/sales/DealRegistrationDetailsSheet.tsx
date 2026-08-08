import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileCheck,
  Calendar,
  DollarSign,
  Building,
  User,
  MessageSquare,
  History,
  Loader2,
  Send
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DealRegistrationDetailsSheetProps {
  drId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-500/10 text-yellow-500" },
  in_progress: { label: "In Progress", icon: AlertCircle, color: "bg-blue-500/10 text-blue-500" },
  approved: { label: "Approved", icon: CheckCircle2, color: "bg-green-500/10 text-green-500" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-500/10 text-red-500" },
  expired: { label: "Expired", icon: Clock, color: "bg-muted text-muted-foreground" },
  closed: { label: "Closed", icon: FileCheck, color: "bg-purple-500/10 text-purple-500" },
};

export function DealRegistrationDetailsSheet({ drId, open, onOpenChange }: DealRegistrationDetailsSheetProps) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [drIdFromVendor, setDrIdFromVendor] = useState("");
  const [drExpiryDate, setDrExpiryDate] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const isAccountsTeam = role === 'admin' || role === 'manager';

  // Fetch deal registration details
  const { data: dr, isLoading } = useQuery({
    queryKey: ['deal-registration', drId],
    queryFn: async () => {
      if (!drId) return null;
      const { data, error } = await supabase
        .from('deal_registrations')
        .select('*')
        .eq('id', drId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!drId,
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ['dr-comments', drId],
    queryFn: async () => {
      if (!drId) return [];
      const { data, error } = await supabase
        .from('deal_registration_comments')
        .select('*')
        .eq('deal_registration_id', drId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!drId,
  });

  // Fetch history
  const { data: history = [] } = useQuery({
    queryKey: ['dr-history', drId],
    queryFn: async () => {
      if (!drId) return [];
      const { data, error } = await supabase
        .from('deal_registration_history')
        .select('*')
        .eq('deal_registration_id', drId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!drId,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!user || !drId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from('deal_registration_comments')
        .insert({
          deal_registration_id: drId,
          user_id: user.id,
          content: newComment,
          is_internal: isAccountsTeam,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dr-comments', drId] });
      setNewComment("");
      toast.success("Comment added");
    },
    onError: (error) => {
      toast.error("Failed to add comment: " + error.message);
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, updates }: { status: string; updates?: Record<string, any> }) => {
      if (!drId || !user) throw new Error("Not authenticated");
      
      const updateData: Record<string, any> = { status, ...updates };
      
      if (status === 'approved') {
        updateData.approval_date = new Date().toISOString().split('T')[0];
        updateData.dr_id_from_vendor = drIdFromVendor;
        updateData.dr_expiry_date = drExpiryDate;
      } else if (status === 'rejected') {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('deal_registrations')
        .update(updateData)
        .eq('id', drId);
      if (error) throw error;

      // Add history entry
      await supabase.from('deal_registration_history').insert({
        deal_registration_id: drId,
        user_id: user.id,
        action: `Status changed to ${status}`,
        old_value: dr?.status,
        new_value: status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-registration', drId] });
      queryClient.invalidateQueries({ queryKey: ['deal-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['dr-history', drId] });
      toast.success("Status updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  if (!dr) return null;

  const statusInfo = statusConfig[dr.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", statusInfo.color)}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <SheetTitle>{dr.dr_number}</SheetTitle>
              <SheetDescription>{dr.vendor_name} - {dr.customer_name}</SheetDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
            <Badge variant="outline">{dr.priority}</Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Deal Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Vendor:</span>
                  <p className="font-medium">{dr.vendor_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Program:</span>
                  <p className="font-medium">{dr.vendor_program || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Customer:</span>
                  <p className="font-medium">{dr.customer_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Opportunity Value:</span>
                  <p className="font-medium">${dr.opportunity_value?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Expected Close:</span>
                  <p className="font-medium">
                    {dr.expected_close_date ? format(new Date(dr.expected_close_date), "MMM d, yyyy") : "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="font-medium">{format(new Date(dr.created_at), "MMM d, yyyy HH:mm")}</p>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {dr.description && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{dr.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {dr.requirements && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{dr.requirements}</p>
                </CardContent>
              </Card>
            )}

            {/* Competitor Info */}
            {dr.competitor_info && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Competitor Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{dr.competitor_info}</p>
                </CardContent>
              </Card>
            )}

            {/* DR Result - if approved */}
            {dr.dr_id_from_vendor && (
              <Card className="border-green-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-600">Deal Registration Approved</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">DR ID from Vendor:</span>
                    <p className="font-medium text-green-600">{dr.dr_id_from_vendor}</p>
                  </div>
                  {dr.dr_expiry_date && (
                    <div>
                      <span className="text-muted-foreground">Expiry Date:</span>
                      <p className="font-medium">{format(new Date(dr.dr_expiry_date), "MMM d, yyyy")}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Rejection Reason */}
            {dr.rejection_reason && (
              <Card className="border-red-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-600">Rejection Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{dr.rejection_reason}</p>
                </CardContent>
              </Card>
            )}

            {/* Admin Actions */}
            {isAccountsTeam && (dr.status === 'pending' || dr.status === 'in_progress') && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dr.status === 'pending' && (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ status: 'in_progress' })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Start Processing
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>DR ID from Vendor</Label>
                      <Input
                        value={drIdFromVendor}
                        onChange={(e) => setDrIdFromVendor(e.target.value)}
                        placeholder="Enter DR ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>DR Expiry Date</Label>
                      <Input
                        type="date"
                        value={drExpiryDate}
                        onChange={(e) => setDrExpiryDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => updateStatusMutation.mutate({ status: 'approved' })}
                    disabled={updateStatusMutation.isPending || !drIdFromVendor}
                  >
                    {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve with DR ID
                  </Button>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Rejection Reason</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    variant="destructive"
                    onClick={() => updateStatusMutation.mutate({ status: 'rejected' })}
                    disabled={updateStatusMutation.isPending || !rejectionReason}
                  >
                    {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <div className="space-y-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3 pr-4">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No comments yet
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <Card key={comment.id}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">User</span>
                                {comment.is_internal && (
                                  <Badge variant="outline" className="text-xs">Internal</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1"
                  rows={2}
                />
                <Button 
                  onClick={() => addCommentMutation.mutate()}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No history yet
                  </div>
                ) : (
                  history.map((entry) => (
                    <Card key={entry.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{entry.action}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {entry.old_value && entry.new_value && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            {entry.old_value} → {entry.new_value}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
