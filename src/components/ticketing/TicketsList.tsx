import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { Clock, AlertTriangle } from "lucide-react";

interface TicketsListProps {
  statusFilter: string | null;
  onTicketSelect: (id: string) => void;
}

const priorityColors: Record<string, string> = {
  low: "bg-slate-500",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  critical: "bg-red-500",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-500",
  in_progress: "bg-amber-500",
  pending_customer: "bg-purple-500",
  pending_vendor: "bg-indigo-500",
  escalated: "bg-red-500",
  resolved: "bg-green-500",
  closed: "bg-slate-500",
};

export function TicketsList({ statusFilter, onTicketSelect }: TicketsListProps) {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select(`
          *,
          contact:contacts(name, company)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter === "open") {
        query = query.in("status", ["open", "in_progress"] as const);
      } else if (statusFilter) {
        query = query.eq("status", statusFilter as "open" | "in_progress" | "pending_customer" | "pending_vendor" | "escalated" | "resolved" | "closed");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getSlaStatus = (slaDeadline: string | null, status: string) => {
    if (!slaDeadline || ["resolved", "closed"].includes(status)) return null;
    const deadline = new Date(slaDeadline);
    const now = new Date();
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursLeft < 0) return { label: "Breached", color: "text-destructive" };
    if (hoursLeft < 1) return { label: "Critical", color: "text-red-500" };
    if (hoursLeft < 4) return { label: "Warning", color: "text-amber-500" };
    return { label: formatDistanceToNow(deadline, { addSuffix: true }), color: "text-muted-foreground" };
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading tickets...</div>;
  }

  if (!tickets?.length) {
    return <div className="py-8 text-center text-muted-foreground">No tickets found</div>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => {
            const slaStatus = getSlaStatus(ticket.sla_deadline, ticket.status);
            return (
              <TableRow 
                key={ticket.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onTicketSelect(ticket.id)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium">{ticket.ticket_number}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-[250px]">{ticket.title}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{ticket.contact?.name || "—"}</p>
                    <p className="text-sm text-muted-foreground">{ticket.contact?.company || ""}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={priorityColors[ticket.priority]}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`border-0 ${statusColors[ticket.status]}`}>
                    {ticket.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {slaStatus && (
                    <div className={`flex items-center gap-1 ${slaStatus.color}`}>
                      {slaStatus.label === "Breached" ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      <span className="text-sm">{slaStatus.label}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(ticket.created_at), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
