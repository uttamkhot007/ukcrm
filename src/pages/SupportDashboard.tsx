import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/api/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Headphones, 
  Plus, 
  TicketIcon, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  LogOut,
  BarChart3,
  MessageSquare,
  Bot,
  Building2,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import SupportNewTicketDialog from "@/components/support/SupportNewTicketDialog";
import SupportTicketDetailsSheet from "@/components/support/SupportTicketDetailsSheet";
import SupportAIAssistant from "@/components/support/SupportAIAssistant";

export default function SupportDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isAIOpen, setIsAIOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/support");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*, user_category")
        .eq("user_id", session.user.id)
        .single();

      if (profile?.user_category !== "customer") {
        await supabase.auth.signOut();
        navigate("/support");
        toast.error("Access denied");
        return;
      }

      setUser({ ...session.user, profile });
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/support");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: organizationAccess } = useQuery({
    queryKey: ["customer-organization-access", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_organization_access")
        .select(`
          *,
          organization:alliance_organizations(*)
        `)
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["customer-support-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/support");
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      waiting_on_customer: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      resolved: "bg-green-500/10 text-green-500 border-green-500/20",
      closed: "bg-muted text-muted-foreground border-border",
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

  const stats = {
    total: tickets?.length || 0,
    open: tickets?.filter(t => t.status === "open").length || 0,
    inProgress: tickets?.filter(t => t.status === "in_progress").length || 0,
    resolved: tickets?.filter(t => t.status === "resolved" || t.status === "closed").length || 0,
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Headphones className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Support Center</h1>
              <p className="text-sm text-muted-foreground">
                Welcome, {user.profile?.full_name || user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAIOpen(true)}
              className="gap-2"
            >
              <Bot className="h-4 w-4" />
              AI Assistant
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tickets</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <TicketIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.open}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.inProgress}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="tickets" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="tickets" className="gap-2">
                <TicketIcon className="h-4 w-4" />
                My Tickets
              </TabsTrigger>
              <TabsTrigger value="organization" className="gap-2">
                <Building2 className="h-4 w-4" />
                Organization
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Reports
              </TabsTrigger>
            </TabsList>
            <Button onClick={() => setIsNewTicketOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Ticket
            </Button>
          </div>

          <TabsContent value="tickets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Support Tickets</CardTitle>
                <CardDescription>
                  View and manage your support requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ticketsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : tickets?.length === 0 ? (
                  <div className="text-center py-12">
                    <TicketIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">No tickets yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first support ticket to get help
                    </p>
                    <Button onClick={() => setIsNewTicketOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Ticket
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {tickets?.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedTicketId(ticket.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-mono text-muted-foreground">
                                  {ticket.ticket_number}
                                </span>
                                <Badge variant="outline" className={getStatusColor(ticket.status)}>
                                  {ticket.status.replace(/_/g, " ")}
                                </Badge>
                                <Badge variant="outline" className={getSeverityColor(ticket.severity)}>
                                  {ticket.severity}
                                </Badge>
                              </div>
                              <h4 className="font-medium truncate">{ticket.title}</h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {ticket.description}
                              </p>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <p>{format(new Date(ticket.created_at), "MMM d, yyyy")}</p>
                              <p className="text-xs">{format(new Date(ticket.created_at), "h:mm a")}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="organization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Organizations</CardTitle>
                <CardDescription>
                  Organizations you have access to
                </CardDescription>
              </CardHeader>
              <CardContent>
                {organizationAccess?.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">No organization access</h3>
                    <p className="text-muted-foreground">
                      Contact support to link your account to your organization
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {organizationAccess?.map((access: any) => (
                      <div key={access.id} className="p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{access.organization?.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {access.organization?.industry || "No industry specified"}
                            </p>
                            {access.is_primary_contact && (
                              <Badge variant="secondary" className="mt-1">Primary Contact</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Ticket Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Tickets</span>
                      <span className="font-medium">{stats.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Resolution Rate</span>
                      <span className="font-medium">
                        {stats.total > 0 
                          ? Math.round((stats.resolved / stats.total) * 100) 
                          : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Average Response</span>
                      <span className="font-medium">{"< 4 hours"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tickets?.slice(0, 3).map((ticket) => (
                    <div key={ticket.id} className="flex items-center gap-3 py-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm truncate flex-1">{ticket.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(ticket.created_at), "MMM d")}
                      </span>
                    </div>
                  ))}
                  {(!tickets || tickets.length === 0) && (
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <SupportNewTicketDialog
        open={isNewTicketOpen}
        onOpenChange={setIsNewTicketOpen}
        organizations={organizationAccess?.map((a: any) => a.organization) || []}
      />

      <SupportTicketDetailsSheet
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => !open && setSelectedTicketId(null)}
      />

      <SupportAIAssistant
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
      />
    </div>
  );
}
