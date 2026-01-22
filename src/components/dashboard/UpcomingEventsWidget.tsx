import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isToday, isTomorrow, differenceInDays, addYears, isBefore, startOfToday } from "date-fns";
import { Cake, CalendarHeart, PartyPopper, Trophy, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/contexts/TenantContext";

const EVENT_CONFIG = {
  birthday: { icon: Cake, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  anniversary: { icon: CalendarHeart, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  org_event: { icon: PartyPopper, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  achievement: { icon: Trophy, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  performance: { icon: Award, color: "text-green-500", bgColor: "bg-green-500/10" },
};

interface EmployeeEvent {
  id: string;
  event_type: string;
  title: string;
  event_date: string;
  description: string | null;
}

interface UpcomingEventsWidgetProps {
  onNavigate?: (module: string) => void;
}

export function UpcomingEventsWidget({ onNavigate }: UpcomingEventsWidgetProps) {
  const { currentTenant } = useTenant();
  
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["upcoming-events-widget", currentTenant?.id],
    queryFn: async () => {
      const today = startOfToday();
      let query = supabase
        .from("employee_events")
        .select("*")
        .order("event_date", { ascending: true });
      
      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process events - for recurring events (birthdays/anniversaries), calculate next occurrence
      const processedEvents = (data || []).map((event) => {
        let eventDate = parseISO(event.event_date);
        
        // For recurring events, find next occurrence
        if (event.is_recurring) {
          while (isBefore(eventDate, today)) {
            eventDate = addYears(eventDate, 1);
          }
        }

        return {
          ...event,
          nextDate: eventDate,
          daysUntil: differenceInDays(eventDate, today),
        };
      });

      // Filter to upcoming events (next 14 days) and sort
      return processedEvents
        .filter((e) => e.daysUntil >= 0 && e.daysUntil <= 14)
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 5) as (EmployeeEvent & { nextDate: Date; daysUntil: number })[];
    },
  });

  const getDateLabel = (daysUntil: number) => {
    if (daysUntil === 0) return { text: "Today!", variant: "destructive" as const };
    if (daysUntil === 1) return { text: "Tomorrow", variant: "default" as const };
    return { text: `In ${daysUntil} days`, variant: "secondary" as const };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-pink-500" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle 
          className="text-lg flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
          onClick={() => onNavigate?.("employee-events")}
        >
          <PartyPopper className="w-5 h-5 text-pink-500" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <PartyPopper className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming events</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const config = EVENT_CONFIG[event.event_type as keyof typeof EVENT_CONFIG] || EVENT_CONFIG.org_event;
              const Icon = config.icon;
              const dateLabel = getDateLabel(event.daysUntil);

              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-colors",
                    event.daysUntil === 0 ? "bg-primary/5 border border-primary/20" : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bgColor)}>
                    <Icon className={cn("w-5 h-5", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(event.nextDate, "EEEE, MMM d")}
                    </p>
                  </div>
                  <Badge variant={dateLabel.variant} className="shrink-0">
                    {dateLabel.text}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
