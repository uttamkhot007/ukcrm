import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  Ticket, Plus, Clock, CheckCircle, AlertTriangle, 
  MessageSquare, Building, Laptop, HelpCircle, FileText 
} from "lucide-react";
import { TicketDetailsSheet } from "./TicketDetailsSheet";

const internalCategories = [
  { value: "it_support", label: "IT Support", icon: Laptop, description: "Hardware, software, access issues" },
  { value: "hr_query", label: "HR Query", icon: Building, description: "HR policies, benefits, leaves" },
  { value: "facilities", label: "Facilities", icon: FileText, description: "Office, infrastructure, supplies" },
  { value: "general", label: "General Query", icon: HelpCircle, description: "Other internal inquiries" },
];

const priorityOptions = [
  { value: "low", label: "Low", sla: "24 hours" },
  { value: "medium", label: "Medium", sla: "8 hours" },
  { value: "high", label: "High", sla: "4 hours" },
  { value: "critical", label: "Critical", sla: "2 hours" },
];

export function EmployeeTicketSection() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("my-tickets");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "it_support",
    priority: "medium",
  });

  // Fetch employee's tickets
  const { data: myTickets = [], isLoading: loadingMyTickets } = useQuery({
    queryKey: ["employee-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("created_by", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch tickets assigned to employee's team
  const { data: teamTickets = [], isLoading: loadingTeamTickets } = useQuery({
    queryKey: ["team-assigned-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("assigned_to", user?.id)
        .not("status", "in", '("resolved","closed")')
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("tickets").insert([{
        ticket_number: "TEMP",
        title: formData.title,
        description: formData.description,
        category: "service_request",
        priority: formData.priority as "low" | "medium" | "high" | "critical",
        created_by: user.id,
        tenant_id: currentTenant?.id,
      }]);

      if (error) throw error;

      toast.success("Ticket created successfully");
      queryClient.invalidateQueries({ queryKey: ["employee-tickets"] });
      setShowNewTicket(false);
      setFormData({ title: "", description: "", category: "it_support", priority: "medium" });
    } catch (error: any) {
      toast.error(error.message || "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      in_progress: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      pending_customer: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      escalated: "bg-red-500/10 text-red-600 border-red-500/20",
      resolved: "bg-green-500/10 text-green-600 border-green-500/20",
      closed: "bg-muted text-muted-foreground border-border",
    };
    return colors[status] || colors.closed;
  };

  const openTickets = myTickets.filter(t => !["resolved", "closed"].includes(t.status)).length;
  const resolvedTickets = myTickets.filter(t => ["resolved", "closed"].includes(t.status)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Support Tickets
          </h2>
          <p className="text-muted-foreground">Raise and track internal support requests</p>
        </div>
        <Button onClick={() => setShowNewTicket(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Ticket className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{myTickets.length}</p>
              <p className="text-xs text-muted-foreground">Total Tickets</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{openTickets}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{resolvedTickets}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{teamTickets.length}</p>
              <p className="text-xs text-muted-foreground">Assigned to You</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="assigned">Assigned to Me</TabsTrigger>
        </TabsList>

        <TabsContent value="my-tickets" className="space-y-3">
          {loadingMyTickets ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : myTickets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No tickets yet</h3>
                <p className="text-muted-foreground text-sm mt-1">Create a ticket to get help from internal teams</p>
                <Button onClick={() => setShowNewTicket(true)} className="mt-4">Create Ticket</Button>
              </CardContent>
            </Card>
          ) : (
            myTickets.map((ticket) => (
              <Card 
                key={ticket.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedTicketId(ticket.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                        <Badge variant="outline" className={getStatusBadge(ticket.status)}>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="secondary">{ticket.priority}</Badge>
                      </div>
                      <h3 className="font-medium truncate">{ticket.title}</h3>
                      {ticket.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{ticket.description}</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(ticket.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="assigned" className="space-y-3">
          {loadingTeamTickets ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : teamTickets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No tickets assigned</h3>
                <p className="text-muted-foreground text-sm mt-1">Tickets assigned to you will appear here</p>
              </CardContent>
            </Card>
          ) : (
            teamTickets.map((ticket) => (
              <Card 
                key={ticket.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedTicketId(ticket.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                        <Badge variant="outline" className={getStatusBadge(ticket.status)}>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="secondary">{ticket.priority}</Badge>
                      </div>
                      <h3 className="font-medium truncate">{ticket.title}</h3>
                      {ticket.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{ticket.description}</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(ticket.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* New Ticket Dialog */}
      <Dialog open={showNewTicket} onOpenChange={setShowNewTicket}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="grid grid-cols-2 gap-2">
                {internalCategories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formData.category === cat.value 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <cat.icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{cat.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary of your issue"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide details about your request..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label} ({opt.sla} SLA)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowNewTicket(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Ticket"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket Details */}
      <TicketDetailsSheet
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicketId(null);
            queryClient.invalidateQueries({ queryKey: ["employee-tickets"] });
            queryClient.invalidateQueries({ queryKey: ["team-assigned-tickets"] });
          }
        }}
      />
    </div>
  );
}
