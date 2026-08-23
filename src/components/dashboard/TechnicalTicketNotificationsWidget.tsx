import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Ticket, 
  Bell, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  User, 
  ArrowRight,
  RefreshCw,
  Inbox,
  Send
} from "lucide-react";

interface TicketWithDetails {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  sla_deadline: string | null;
  created_by: string;
  assigned_to: string | null;
}

interface TicketNotificationsWidgetProps {
  onNavigate?: (module: string) => void;
}

export function TechnicalTicketNotificationsWidget({ onNavigate }: TicketNotificationsWidgetProps) {
  const { user, teams } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("assigned");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if user is in technical team
  const isTechnicalTeam = teams.some(team => 
    team === "technical" || 
    team === "managed_services" ||
    team === "presales"
  );

  // Don't render if not in technical team
  if (!isTechnicalTeam) {
    return null;
  }

  // Fetch tickets assigned to current user
  const { data: assignedTickets = [], isLoading: loadingAssigned, refetch: refetchAssigned } = useQuery({
    queryKey: ["technical-assigned-tickets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("assigned_to", user.id)
        .not("status", "in", '("resolved","closed")')
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as TicketWithDetails[];
    },
    enabled: !!user?.id,
  });

  // Fetch tickets created by current user (internal tickets they raised)
  const { data: myTickets = [], isLoading: loadingMyTickets, refetch: refetchMy } = useQuery({
    queryKey: ["technical-my-tickets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as TicketWithDetails[];
    },
    enabled: !!user?.id,
  });

  // Fetch ticket-related notifications
  const { data: ticketNotifications = [], isLoading: loadingNotifications, refetch: refetchNotifications } = useQuery({
    queryKey: ["ticket-notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("category", "ticket")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Subscribe to realtime updates for tickets
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("technical-tickets-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `assigned_to=eq.${user.id}`,
        },
        () => {
          refetchAssigned();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `created_by=eq.${user.id}`,
        },
        () => {
          refetchMy();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetchAssigned, refetchMy, refetchNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchAssigned(), refetchMy(), refetchNotifications()]);
    setIsRefreshing(false);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
    refetchNotifications();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-amber-500 text-black";
      case "low": return "bg-blue-500 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "in_progress": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "pending_customer": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "escalated": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "resolved": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "closed": return "bg-muted text-muted-foreground border-border";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const isSLABreached = (slaDeadline: string | null) => {
    if (!slaDeadline) return false;
    return new Date(slaDeadline) < new Date();
  };

  const openTicketsCount = assignedTickets.length;
  const myOpenTicketsCount = myTickets.filter(t => !["resolved", "closed"].includes(t.status)).length;
  const unreadNotifications = ticketNotifications.length;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Ticket className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">
              Ticket Notifications
            </CardTitle>
            {unreadNotifications > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                {unreadNotifications}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Inbox className="h-3 w-3" />
            {openTicketsCount} assigned
          </Badge>
          <Badge variant="outline" className="text-xs gap-1">
            <Send className="h-3 w-3" />
            {myOpenTicketsCount} raised
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 h-8">
            <TabsTrigger value="assigned" className="text-xs gap-1 px-1">
              <Inbox className="h-3 w-3" />
              <span className="hidden sm:inline">Assigned</span>
            </TabsTrigger>
            <TabsTrigger value="my-tickets" className="text-xs gap-1 px-1">
              <Send className="h-3 w-3" />
              <span className="hidden sm:inline">My Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="updates" className="text-xs gap-1 px-1 relative">
              <Bell className="h-3 w-3" />
              <span className="hidden sm:inline">Updates</span>
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] flex items-center justify-center text-destructive-foreground">
                  {unreadNotifications}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[280px] mt-3">
            {/* Assigned Tickets Tab */}
            <TabsContent value="assigned" className="mt-0 space-y-2">
              {loadingAssigned ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : assignedTickets.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">No open tickets assigned</p>
                </div>
              ) : (
                assignedTickets.map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className="p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer"
                    onClick={() => onNavigate?.("support")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-muted-foreground">{ticket.ticket_number}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </Badge>
                          {isSLABreached(ticket.sla_deadline) && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0 gap-0.5">
                              <AlertCircle className="h-2.5 w-2.5" />
                              SLA
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-sm font-medium mt-1 line-clamp-1">{ticket.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(ticket.status)}`}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* My Tickets Tab */}
            <TabsContent value="my-tickets" className="mt-0 space-y-2">
              {loadingMyTickets ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : myTickets.length === 0 ? (
                <div className="text-center py-8">
                  <Ticket className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No tickets raised</p>
                </div>
              ) : (
                myTickets.map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className="p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer"
                    onClick={() => onNavigate?.("support")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-muted-foreground">{ticket.ticket_number}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <h4 className="text-sm font-medium mt-1 line-clamp-1">{ticket.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(ticket.status)}`}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(ticket.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Updates/Notifications Tab */}
            <TabsContent value="updates" className="mt-0 space-y-2">
              {loadingNotifications ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : ticketNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No new updates</p>
                </div>
              ) : (
                ticketNotifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className="p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="p-1 rounded-full bg-primary/10 shrink-0">
                        <Bell className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium line-clamp-1">{notification.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 text-[10px] px-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationAsRead(notification.id);
                            }}
                          >
                            Mark read
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-3 text-xs"
          onClick={() => onNavigate?.("support")}
        >
          View All Tickets
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
