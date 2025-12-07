import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Clock, AlertTriangle, User, MessageSquare, Tag } from "lucide-react";
import { toast } from "sonner";

interface TicketKanbanProps {
  onTicketSelect: (id: string) => void;
}

const COLUMNS = [
  { id: "open", label: "Open", color: "bg-blue-500" },
  { id: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { id: "pending_customer", label: "Pending Customer", color: "bg-purple-500" },
  { id: "pending_vendor", label: "Pending Vendor", color: "bg-indigo-500" },
  { id: "escalated", label: "Escalated", color: "bg-red-500" },
  { id: "resolved", label: "Resolved", color: "bg-green-500" },
];

const priorityColors: Record<string, string> = {
  low: "border-l-slate-400",
  medium: "border-l-blue-500",
  high: "border-l-amber-500",
  critical: "border-l-red-500",
};

export function TicketKanban({ onTicketSelect }: TicketKanbanProps) {
  const queryClient = useQueryClient();
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets-kanban"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          contact:contacts(name, company),
          comments:ticket_comments(id)
        `)
        .not("status", "eq", "closed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("tickets-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tickets-kanban"] });
          queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleDragStart = (ticketId: string) => {
    setDraggedTicket(ticketId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: string) => {
    if (!draggedTicket) return;
    
    const ticket = tickets?.find(t => t.id === draggedTicket);
    if (!ticket || ticket.status === status) {
      setDraggedTicket(null);
      return;
    }

    try {
      const updates: any = { status };
      if (status === "resolved") updates.resolved_at = new Date().toISOString();

      const { error } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", draggedTicket);

      if (error) throw error;

      toast.success(`Ticket moved to ${status.replace("_", " ")}`);
      queryClient.invalidateQueries({ queryKey: ["tickets-kanban"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDraggedTicket(null);
    }
  };

  const getSlaStatus = (slaDeadline: string | null, status: string) => {
    if (!slaDeadline || ["resolved", "closed"].includes(status)) return null;
    const deadline = new Date(slaDeadline);
    const now = new Date();
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursLeft < 0) return { icon: AlertTriangle, color: "text-destructive" };
    if (hoursLeft < 1) return { icon: Clock, color: "text-red-500" };
    if (hoursLeft < 4) return { icon: Clock, color: "text-amber-500" };
    return null;
  };

  const getTicketsByStatus = (status: string) => {
    return tickets?.filter(t => t.status === status) || [];
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading tickets...</div>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((column) => {
        const columnTickets = getTicketsByStatus(column.id);
        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-80"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${column.color}`} />
              <h3 className="font-semibold text-sm">{column.label}</h3>
              <Badge variant="secondary" className="ml-auto">{columnTickets.length}</Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="space-y-3 pr-2">
                {columnTickets.map((ticket) => {
                  const slaStatus = getSlaStatus(ticket.sla_deadline, ticket.status);
                  return (
                    <Card
                      key={ticket.id}
                      className={`p-3 cursor-pointer hover:shadow-md transition-all border-l-4 ${priorityColors[ticket.priority]} ${
                        draggedTicket === ticket.id ? "opacity-50" : ""
                      }`}
                      draggable
                      onDragStart={() => handleDragStart(ticket.id)}
                      onClick={() => onTicketSelect(ticket.id)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-muted-foreground font-mono">{ticket.ticket_number}</p>
                          {slaStatus && (
                            <slaStatus.icon className={`w-4 h-4 ${slaStatus.color}`} />
                          )}
                        </div>
                        <p className="font-medium text-sm line-clamp-2">{ticket.title}</p>
                        
                        {ticket.contact && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span className="truncate">{ticket.contact.name}</span>
                          </div>
                        )}

                        {ticket.tags && ticket.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {ticket.tags.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {ticket.assigned_to ? "A" : "?"}
                              </AvatarFallback>
                            </Avatar>
                            {ticket.comments && ticket.comments.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MessageSquare className="w-3 h-3" />
                                {ticket.comments.length}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {columnTickets.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    No tickets
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
