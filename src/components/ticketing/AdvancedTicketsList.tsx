import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Clock, AlertTriangle, Search, Filter, ChevronDown, 
  RefreshCw, ArrowUpDown, Eye, MoreHorizontal, Tag, User 
} from "lucide-react";
import { toast } from "sonner";

interface AdvancedTicketsListProps {
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

const STATUSES = ["open", "in_progress", "pending_customer", "pending_vendor", "escalated", "resolved", "closed"];
const PRIORITIES = ["low", "medium", "high", "critical"];
const CATEGORIES = ["incident", "service_request", "change_request", "problem", "security_alert"];

export function AdvancedTicketsList({ onTicketSelect }: AdvancedTicketsListProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    status: [] as string[],
    priority: [] as string[],
    category: [] as string[],
    assignee: "",
  });
  const [sortBy, setSortBy] = useState<"created_at" | "priority" | "sla_deadline">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ["tickets-advanced", filters, sortBy, sortOrder],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select(`
          *,
          contact:contacts(name, company)
        `)
        .order(sortBy, { ascending: sortOrder === "asc" });

      if (filters.status.length > 0) {
        query = query.in("status", filters.status as any);
      }
      if (filters.priority.length > 0) {
        query = query.in("priority", filters.priority as any);
      }
      if (filters.category.length > 0) {
        query = query.in("category", filters.category as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("tickets-list-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tickets-advanced"] });
          queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const getSlaStatus = (slaDeadline: string | null, status: string) => {
    if (!slaDeadline || ["resolved", "closed"].includes(status)) return null;
    const deadline = new Date(slaDeadline);
    const now = new Date();
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursLeft < 0) return { label: "Breached", color: "text-destructive bg-destructive/10", icon: AlertTriangle };
    if (hoursLeft < 1) return { label: "Critical", color: "text-red-500 bg-red-500/10", icon: Clock };
    if (hoursLeft < 4) return { label: "Warning", color: "text-amber-500 bg-amber-500/10", icon: Clock };
    return { label: formatDistanceToNow(deadline, { addSuffix: true }), color: "text-muted-foreground", icon: Clock };
  };

  const toggleFilter = (type: "status" | "priority" | "category", value: string) => {
    setFilters((prev) => {
      const current = prev[type];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [type]: updated };
    });
  };

  const toggleSelectAll = () => {
    if (selectedTickets.size === filteredTickets?.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(filteredTickets?.map((t) => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTickets(newSelected);
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selectedTickets.size === 0) return;
    try {
      const updates: any = { status };
      if (status === "resolved") updates.resolved_at = new Date().toISOString();

      const { error } = await supabase
        .from("tickets")
        .update(updates)
        .in("id", Array.from(selectedTickets));

      if (error) throw error;
      toast.success(`Updated ${selectedTickets.size} tickets`);
      setSelectedTickets(new Set());
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredTickets = tickets?.filter((ticket) =>
    ticket.title.toLowerCase().includes(search.toLowerCase()) ||
    ticket.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
    ticket.contact?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const activeFiltersCount = filters.status.length + filters.priority.length + filters.category.length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          {/* Filters */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge className="ml-1">{activeFiltersCount}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((status) => (
                      <Badge
                        key={status}
                        variant={filters.status.includes(status) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleFilter("status", status)}
                      >
                        {status.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Priority</h4>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITIES.map((priority) => (
                      <Badge
                        key={priority}
                        variant={filters.priority.includes(priority) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleFilter("priority", priority)}
                      >
                        {priority}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Category</h4>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((category) => (
                      <Badge
                        key={category}
                        variant={filters.category.includes(category) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleFilter("category", category)}
                      >
                        {category.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setFilters({ status: [], priority: [], category: [], assignee: "" })}
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-40">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Created Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="sla_deadline">SLA Deadline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {selectedTickets.size > 0 && (
            <Select onValueChange={bulkUpdateStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={`Update ${selectedTickets.size} selected`} />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading tickets...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedTickets.size === filteredTickets?.length && filteredTickets?.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets?.map((ticket) => {
                  const slaStatus = getSlaStatus(ticket.sla_deadline, ticket.status);
                  return (
                    <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedTickets.has(ticket.id)}
                          onCheckedChange={() => toggleSelect(ticket.id)}
                        />
                      </TableCell>
                      <TableCell onClick={() => onTicketSelect(ticket.id)}>
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</p>
                          <p className="font-medium truncate max-w-[200px]">{ticket.title}</p>
                          {ticket.tags && ticket.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Tag className="w-3 h-3 text-muted-foreground" />
                              {ticket.tags.slice(0, 2).map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-xs py-0">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={() => onTicketSelect(ticket.id)}>
                        <div>
                          <p className="font-medium">{ticket.contact?.name || "—"}</p>
                          <p className="text-sm text-muted-foreground">{ticket.contact?.company || ""}</p>
                        </div>
                      </TableCell>
                      <TableCell onClick={() => onTicketSelect(ticket.id)}>
                        <Badge variant="outline">{ticket.category.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell onClick={() => onTicketSelect(ticket.id)}>
                        <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                      </TableCell>
                      <TableCell onClick={() => onTicketSelect(ticket.id)}>
                        <Badge variant="outline" className={`border-0 ${statusColors[ticket.status]}`}>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={() => onTicketSelect(ticket.id)}>
                        {slaStatus && (
                          <div className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${slaStatus.color}`}>
                            <slaStatus.icon className="w-3 h-3" />
                            <span>{slaStatus.label}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell onClick={() => onTicketSelect(ticket.id)}>
                        {ticket.assigned_to ? (
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs">A</AvatarFallback>
                          </Avatar>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell onClick={() => onTicketSelect(ticket.id)} className="text-muted-foreground text-sm">
                        {format(new Date(ticket.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onTicketSelect(ticket.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
