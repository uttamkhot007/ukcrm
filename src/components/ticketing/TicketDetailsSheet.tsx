import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Clock, AlertTriangle, User, Building, MessageSquare, Send, 
  Zap, Tag, History, Star, Phone, Mail, X, Plus 
} from "lucide-react";
import { toast } from "sonner";
import { AuditInfo } from "@/components/shared/AuditInfo";

interface TicketDetailsSheetProps {
  ticketId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions = [
  { value: "open", label: "Open", color: "bg-blue-500" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { value: "pending_customer", label: "Pending Customer", color: "bg-purple-500" },
  { value: "pending_vendor", label: "Pending Vendor", color: "bg-indigo-500" },
  { value: "escalated", label: "Escalated", color: "bg-red-500" },
  { value: "resolved", label: "Resolved", color: "bg-green-500" },
  { value: "closed", label: "Closed", color: "bg-slate-500" },
];

const priorityColors: Record<string, string> = {
  low: "bg-slate-500",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  critical: "bg-red-500",
};

export function TicketDetailsSheet({ ticketId, open, onOpenChange }: TicketDetailsSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [showCannedResponses, setShowCannedResponses] = useState(false);

  const { data: ticket, refetch: refetchTicket } = useQuery({
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

  const { data: comments, refetch: refetchComments } = useQuery({
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

  const { data: history } = useQuery({
    queryKey: ["ticket-history", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("ticket_history")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  const { data: cannedResponses } = useQuery({
    queryKey: ["canned-responses-quick"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canned_responses")
        .select("*")
        .eq("is_active", true)
        .order("usage_count", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Real-time comments subscription
  useEffect(() => {
    if (!ticketId) return;
    
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_comments", filter: `ticket_id=eq.${ticketId}` },
        () => {
          refetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, refetchComments]);

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
      refetchComments();
      refetchTicket();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const useCannedResponse = async (response: any) => {
    let content = response.content;
    // Replace placeholders
    if (ticket?.contact?.name) {
      content = content.replace(/\{\{customer_name\}\}/g, ticket.contact.name);
    }
    content = content.replace(/\{\{ticket_number\}\}/g, ticket?.ticket_number || "");
    
    setNewComment(content);
    setShowCannedResponses(false);

    // Increment usage count
    await supabase
      .from("canned_responses")
      .update({ usage_count: (response.usage_count || 0) + 1 })
      .eq("id", response.id);
  };

  const addTag = async () => {
    if (!ticket || !newTag.trim()) return;
    try {
      const currentTags = ticket.tags || [];
      if (currentTags.includes(newTag.trim())) {
        toast.error("Tag already exists");
        return;
      }
      
      const { error } = await supabase
        .from("tickets")
        .update({ tags: [...currentTags, newTag.trim()] })
        .eq("id", ticket.id);
      
      if (error) throw error;
      setNewTag("");
      refetchTicket();
      toast.success("Tag added");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const removeTag = async (tagToRemove: string) => {
    if (!ticket) return;
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ tags: (ticket.tags || []).filter((t: string) => t !== tagToRemove) })
        .eq("id", ticket.id);
      
      if (error) throw error;
      refetchTicket();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getSlaStatus = () => {
    if (!ticket?.sla_deadline || ["resolved", "closed"].includes(ticket.status)) return null;
    const deadline = new Date(ticket.sla_deadline);
    const now = new Date();
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursLeft < 0) return { label: "SLA Breached", color: "text-destructive bg-destructive/10", icon: AlertTriangle };
    if (hoursLeft < 1) return { label: "Critical", color: "text-red-500 bg-red-500/10", icon: Clock };
    if (hoursLeft < 4) return { label: "Warning", color: "text-amber-500 bg-amber-500/10", icon: Clock };
    return { label: `Due ${formatDistanceToNow(deadline, { addSuffix: true })}`, color: "text-muted-foreground bg-muted", icon: Clock };
  };

  if (!ticket) return null;

  const slaStatus = getSlaStatus();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{ticket.ticket_number}</span>
                  <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                  {slaStatus && (
                    <Badge variant="outline" className={slaStatus.color}>
                      <slaStatus.icon className="w-3 h-3 mr-1" />
                      {slaStatus.label}
                    </Badge>
                  )}
                </SheetTitle>
              </div>
            </SheetHeader>
            <h2 className="text-lg font-semibold mt-2">{ticket.title}</h2>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="details" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-2 grid grid-cols-3 w-auto">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="conversation">
                Conversation ({comments?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 p-4">
              <TabsContent value="details" className="mt-0 space-y-4">
                {/* Status & Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Status</label>
                    <Select value={ticket.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Category</label>
                    <Badge variant="outline" className="mt-2 block w-fit">
                      {ticket.category.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm text-muted-foreground">Description</label>
                  <p className="mt-1 text-sm">{ticket.description || "No description provided"}</p>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(ticket.tags || []).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X 
                          className="w-3 h-3 cursor-pointer hover:text-destructive" 
                          onClick={() => removeTag(tag)} 
                        />
                      </Badge>
                    ))}
                    <div className="flex items-center gap-1">
                      <Input
                        placeholder="Add tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        className="h-7 w-24 text-xs"
                        onKeyDown={(e) => e.key === "Enter" && addTag()}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={addTag}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contact Info */}
                {ticket.contact && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Customer Information
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{ticket.contact.name}</span>
                      </div>
                      {ticket.contact.company && (
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          <span>{ticket.contact.company}</span>
                        </div>
                      )}
                      {ticket.contact.email && (
                        <a href={`mailto:${ticket.contact.email}`} className="flex items-center gap-2 text-primary hover:underline">
                          <Mail className="w-4 h-4" />
                          {ticket.contact.email}
                        </a>
                      )}
                      {ticket.contact.phone && (
                        <a href={`tel:${ticket.contact.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                          <Phone className="w-4 h-4" />
                          {ticket.contact.phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-muted-foreground">Created</label>
                    <p>{format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                  {ticket.first_response_at && (
                    <div>
                      <label className="text-muted-foreground">First Response</label>
                      <p>{format(new Date(ticket.first_response_at), "MMM d, yyyy 'at' h:mm a")}</p>
                    </div>
                  )}
                  {ticket.resolved_at && (
                    <div>
                      <label className="text-muted-foreground">Resolved</label>
                      <p>{format(new Date(ticket.resolved_at), "MMM d, yyyy 'at' h:mm a")}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="conversation" className="mt-0 space-y-4">
                {/* Comments */}
                <div className="space-y-3">
                  {comments?.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No comments yet</p>
                  )}
                  {comments?.map((comment) => (
                    <div 
                      key={comment.id} 
                      className={`p-3 rounded-lg ${comment.is_internal ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted"}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">U</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">Agent</span>
                        {comment.is_internal && (
                          <Badge variant="outline" className="text-xs text-amber-600">Internal</Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Box */}
                <div className="space-y-2 pt-2 border-t">
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
                    <Popover open={showCannedResponses} onOpenChange={setShowCannedResponses}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Zap className="w-4 h-4 mr-1" />
                          Templates
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="end">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Quick Replies</h4>
                          {cannedResponses?.length === 0 && (
                            <p className="text-sm text-muted-foreground">No templates available</p>
                          )}
                          {cannedResponses?.map((response) => (
                            <div
                              key={response.id}
                              className="p-2 rounded hover:bg-muted cursor-pointer"
                              onClick={() => useCannedResponse(response)}
                            >
                              <p className="text-sm font-medium">{response.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{response.content}</p>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Textarea
                    placeholder="Type your reply..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={4}
                  />
                  <Button onClick={handleAddComment} disabled={!newComment.trim()} className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Send Reply
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                <div className="space-y-3">
                  {history?.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No activity yet</p>
                  )}
                  {history?.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 text-sm">
                      <div className="p-1.5 bg-muted rounded">
                        <History className="w-3 h-3" />
                      </div>
                      <div className="flex-1">
                        <p>
                          <span className="font-medium">{item.action.replace("_", " ")}</span>
                          {item.old_value && item.new_value && (
                            <span className="text-muted-foreground">
                              : {item.old_value} → {item.new_value}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Audit Information */}
                <div className="mt-6">
                  <AuditInfo
                    createdAt={ticket?.created_at}
                    updatedAt={ticket?.updated_at}
                    createdBy={ticket?.created_by}
                    updatedBy={(ticket as any)?.updated_by}
                    compact
                  />
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
