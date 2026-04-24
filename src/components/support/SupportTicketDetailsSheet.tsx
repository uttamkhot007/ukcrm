import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Clock, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  MessageSquare,
  FileText,
  History
} from "lucide-react";

interface SupportTicketDetailsSheetProps {
  ticketId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SupportTicketDetailsSheet({
  ticketId,
  open,
  onOpenChange,
}: SupportTicketDetailsSheetProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["support-ticket-detail", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_support_tickets")
        .select(`
          *,
          organization:alliance_organizations(name)
        `)
        .eq("id", ticketId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  const { data: comments } = useQuery({
    queryKey: ["support-ticket-comments", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_support_ticket_comments")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  const { data: history } = useQuery({
    queryKey: ["support-ticket-history", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_support_ticket_history")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  const handleAddComment = async () => {
    if (!newComment.trim() || !ticketId) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("customer_support_ticket_comments")
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          content: newComment,
          is_internal: false,
        });

      if (error) throw error;

      toast.success("Comment added");
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["support-ticket-comments", ticketId] });
    } catch (error: any) {
      toast.error(error.message || "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "resolved":
      case "closed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      waiting_on_customer: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      resolved: "bg-green-500/10 text-green-500 border-green-500/20",
      closed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    };
    return colors[status] || colors.open;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-500/10 text-red-500 border-red-500/20",
      high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      low: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    return colors[severity] || colors.medium;
  };

  if (!ticketId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {getStatusIcon(ticket?.status || "open")}
            {ticket?.ticket_number}
          </SheetTitle>
          <SheetDescription>{ticket?.title}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse">Loading...</div>
          </div>
        ) : ticket ? (
          <Tabs defaultValue="details" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details" className="gap-1">
                <FileText className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="conversation" className="gap-1">
                <MessageSquare className="h-4 w-4" />
                Conversation
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className={getStatusColor(ticket.status)}>
                  {ticket.status.replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline" className={getSeverityColor(ticket.severity)}>
                  {ticket.severity}
                </Badge>
                <Badge variant="outline">
                  {ticket.ticket_type === "sales_query" ? "Sales Query" : "Technical Issue"}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Organization</p>
                  <p className="font-medium">{(ticket as any).organization?.name}</p>
                </div>

                {ticket.ticket_type === "sales_query" && (
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">
                      {ticket.sales_category?.replace(/_/g, " ")}
                    </p>
                  </div>
                )}

                {ticket.ticket_type === "technical_issue" && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Solution/Service</p>
                      <p className="font-medium">{ticket.solution_service || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Issue Type</p>
                      <p className="font-medium">{ticket.issue_type || "-"}</p>
                    </div>
                  </>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{ticket.description || "No description provided"}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">
                      {format(new Date(ticket.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">SLA Deadline</p>
                    <p className="text-sm font-medium">
                      {ticket.sla_deadline 
                        ? format(new Date(ticket.sla_deadline), "MMM d, yyyy h:mm a")
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="conversation" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {comments?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No messages yet</p>
                    </div>
                  ) : (
                    comments?.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {comment.user_id?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Customer</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <Separator className="my-4" />

              <div className="space-y-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="w-full gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <ScrollArea className="h-[400px]">
                {history?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No history yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history?.map((item) => (
                      <div key={item.id} className="flex gap-3 text-sm">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div>
                          <p>{item.action}</p>
                          {item.old_value && item.new_value && (
                            <p className="text-muted-foreground">
                              {item.old_value} → {item.new_value}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.created_at), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Ticket not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
