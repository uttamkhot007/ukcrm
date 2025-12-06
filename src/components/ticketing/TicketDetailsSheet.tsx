import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { Clock, AlertTriangle, User, Building, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

interface TicketDetailsSheetProps {
  ticketId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "pending_customer", label: "Pending Customer" },
  { value: "pending_vendor", label: "Pending Vendor" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export function TicketDetailsSheet({ ticketId, open, onOpenChange }: TicketDetailsSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const { data: ticket } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          contact:contacts(name, company, email, phone)
        `)
        .eq("id", ticketId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  const { data: comments } = useQuery({
    queryKey: ["ticket-comments", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("ticket_comments")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket || !user) return;
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "resolved") updates.resolved_at = new Date().toISOString();
      if (newStatus === "closed") updates.closed_at = new Date().toISOString();

      const { error } = await supabase.from("tickets").update(updates).eq("id", ticket.id);
      if (error) throw error;

      await supabase.from("ticket_history").insert({
        ticket_id: ticket.id,
        user_id: user.id,
        action: "status_change",
        old_value: ticket.status,
        new_value: newStatus,
      });

      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddComment = async () => {
    if (!ticket || !user || !newComment.trim()) return;
    try {
      const { error } = await supabase.from("ticket_comments").insert({
        ticket_id: ticket.id,
        user_id: user.id,
        comment: newComment,
        is_internal: isInternal,
      });
      if (error) throw error;

      if (!ticket.first_response_at) {
        await supabase.from("tickets").update({ first_response_at: new Date().toISOString() }).eq("id", ticket.id);
      }

      toast.success("Comment added");
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getSlaStatus = () => {
    if (!ticket?.sla_deadline || ["resolved", "closed"].includes(ticket.status)) return null;
    const deadline = new Date(ticket.sla_deadline);
    const now = new Date();
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursLeft < 0) return { label: "SLA Breached", color: "text-destructive bg-destructive/10" };
    if (hoursLeft < 1) return { label: "Critical", color: "text-red-500 bg-red-500/10" };
    if (hoursLeft < 4) return { label: "Warning", color: "text-amber-500 bg-amber-500/10" };
    return { label: `Due ${formatDistanceToNow(deadline, { addSuffix: true })}`, color: "text-muted-foreground bg-muted" };
  };

  if (!ticket) return null;

  const slaStatus = getSlaStatus();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>{ticket.ticket_number}</span>
            {slaStatus && (
              <Badge variant="outline" className={slaStatus.color}>
                {slaStatus.label.includes("Breached") && <AlertTriangle className="w-3 h-3 mr-1" />}
                {!slaStatus.label.includes("Breached") && <Clock className="w-3 h-3 mr-1" />}
                {slaStatus.label}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
          <div className="space-y-6 py-4">
            <div>
              <h3 className="text-lg font-semibold">{ticket.title}</h3>
              <p className="text-muted-foreground mt-1">{ticket.description || "No description"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Select value={ticket.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <Badge className="mt-2 capitalize">{ticket.priority}</Badge>
              </div>
            </div>

            {ticket.contact && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{ticket.contact.name}</span>
                </div>
                {ticket.contact.company && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building className="w-4 h-4" />
                    {ticket.contact.company}
                  </div>
                )}
              </div>
            )}

            <Separator />

            <div>
              <h4 className="font-medium flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4" />
                Comments ({comments?.length || 0})
              </h4>

              <div className="space-y-3">
                {comments?.map((comment) => (
                  <div 
                    key={comment.id} 
                    className={`p-3 rounded-lg ${comment.is_internal ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted"}`}
                  >
                    {comment.is_internal && (
                      <Badge variant="outline" className="text-xs mb-2 text-amber-600">Internal Note</Badge>
                    )}
                    <p className="text-sm">{comment.comment}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-input"
                    />
                    Internal note
                  </label>
                  <Button onClick={handleAddComment} disabled={!newComment.trim()} size="sm">
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
