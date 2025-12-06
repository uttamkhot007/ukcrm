import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Ticket, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export function TicketStats() {
  const { data: stats } = useQuery({
    queryKey: ["ticket-stats"],
    queryFn: async () => {
      const { data: tickets, error } = await supabase
        .from("tickets")
        .select("status, sla_deadline");

      if (error) throw error;

      const now = new Date();
      const total = tickets?.length || 0;
      const open = tickets?.filter(t => t.status === "open" || t.status === "in_progress").length || 0;
      const escalated = tickets?.filter(t => t.status === "escalated").length || 0;
      const resolved = tickets?.filter(t => t.status === "resolved" || t.status === "closed").length || 0;
      const breached = tickets?.filter(t => 
        t.sla_deadline && new Date(t.sla_deadline) < now && 
        !["resolved", "closed"].includes(t.status)
      ).length || 0;

      return { total, open, escalated, resolved, breached };
    },
  });

  const statCards = [
    { title: "Total Tickets", value: stats?.total || 0, icon: Ticket, color: "text-blue-500" },
    { title: "Open", value: stats?.open || 0, icon: Clock, color: "text-amber-500" },
    { title: "Escalated", value: stats?.escalated || 0, icon: AlertTriangle, color: "text-red-500" },
    { title: "Resolved", value: stats?.resolved || 0, icon: CheckCircle, color: "text-green-500" },
    { title: "SLA Breached", value: stats?.breached || 0, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
