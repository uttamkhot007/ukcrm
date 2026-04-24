import { useState, useEffect } from "react";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Loader2,
  Plus,
  Monitor,
  Laptop,
  Wifi,
  Lock,
  HardDrive,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ITTicket {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  assigned_to: string | null;
  created_at: string;
  user_id: string;
  requester_name?: string;
}

const TICKET_CATEGORIES = [
  { value: "hardware", label: "Hardware Issue", icon: Laptop },
  { value: "software", label: "Software Issue", icon: HardDrive },
  { value: "network", label: "Network Issue", icon: Wifi },
  { value: "security", label: "Security Issue", icon: Lock },
  { value: "access", label: "Access Request", icon: Lock },
  { value: "other", label: "Other", icon: Monitor },
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-green-500/20 text-green-600" },
  { value: "medium", label: "Medium", color: "bg-yellow-500/20 text-yellow-600" },
  { value: "high", label: "High", color: "bg-orange-500/20 text-orange-600" },
  { value: "critical", label: "Critical", color: "bg-red-500/20 text-red-600" },
];

const STATUSES = [
  { value: "open", label: "Open", color: "bg-blue-500/20 text-blue-600" },
  { value: "in_progress", label: "In Progress", color: "bg-yellow-500/20 text-yellow-600" },
  { value: "pending", label: "Pending", color: "bg-orange-500/20 text-orange-600" },
  { value: "resolved", label: "Resolved", color: "bg-green-500/20 text-green-600" },
  { value: "closed", label: "Closed", color: "bg-gray-500/20 text-gray-600" },
];

export function ITSupportTickets() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<ITTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchTickets = async () => {
    if (!currentTenant) return;

    setIsLoading(true);
    
    // Fetch tickets - using valid category types
    const { data, error } = await supabase
      .from("tickets")
      .select(`
        id,
        title,
        description,
        priority,
        status,
        category,
        assigned_to,
        created_at,
        created_by
      `)
      .eq("tenant_id", currentTenant.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch IT tickets",
        variant: "destructive",
      });
    } else {
      // Map to our interface
      const mappedTickets: ITTicket[] = (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        priority: t.priority,
        status: t.status,
        category: t.category,
        assigned_to: t.assigned_to,
        created_at: t.created_at,
        user_id: t.created_by,
      }));
      setTickets(mappedTickets);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [currentTenant]);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || ticket.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = STATUSES.find((s) => s.value === status);
    return statusConfig?.color || "bg-muted text-muted-foreground";
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = PRIORITIES.find((p) => p.value === priority);
    return priorityConfig?.color || "bg-muted text-muted-foreground";
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    critical: tickets.filter((t) => t.priority === "critical").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
          >
            All
          </Button>
          {STATUSES.slice(0, 4).map((status) => (
            <Button
              key={status.value}
              variant={filterStatus === status.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status.value)}
            >
              {status.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="glass rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-8 text-center">
            <Monitor className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No IT support tickets found</p>
            <p className="text-sm text-muted-foreground mt-1">
              IT-related tickets will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{ticket.title}</h4>
                      <Badge variant="outline" className={getStatusBadge(ticket.status)}>
                        {STATUSES.find((s) => s.value === ticket.status)?.label || ticket.status}
                      </Badge>
                      <Badge variant="outline" className={getPriorityBadge(ticket.priority)}>
                        {PRIORITIES.find((p) => p.value === ticket.priority)?.label || ticket.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        {TICKET_CATEGORIES.find((c) => c.value === ticket.category)?.label || ticket.category}
                      </span>
                      <span>Created {format(new Date(ticket.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
