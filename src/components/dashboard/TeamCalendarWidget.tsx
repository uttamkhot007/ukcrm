import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Video, 
  ChevronLeft, 
  ChevronRight,
  Users
} from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

interface TeamCalendarWidgetProps {
  teamType?: string;
  showPresalesCalendar?: boolean;
  title?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  meeting_link: string | null;
  owner_id: string;
  team_type: string | null;
  status: string;
}

const eventTypeColors: Record<string, string> = {
  meeting: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  demo: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  poc: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  training: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  follow_up: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  reminder: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function TeamCalendarWidget({ 
  teamType, 
  showPresalesCalendar = false,
  title = "Team Calendar"
}: TeamCalendarWidgetProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events", currentTenant?.id, teamType, showPresalesCalendar, currentMonth],
    queryFn: async () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      let query = supabase
        .from("calendar_events")
        .select("*")
        .gte("start_time", monthStart.toISOString())
        .lte("start_time", monthEnd.toISOString())
        .eq("status", "scheduled")
        .order("start_time", { ascending: true });

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      if (teamType) {
        query = query.eq("team_type", teamType);
      }

      if (showPresalesCalendar) {
        query = query.eq("team_type", "presales");
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CalendarEvent[];
    },
    enabled: !!user,
  });

  const selectedDayEvents = events.filter((event) =>
    isSameDay(new Date(event.start_time), selectedDate)
  );

  const datesWithEvents = events.map((event) => new Date(event.start_time));

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          modifiers={{
            hasEvent: datesWithEvents,
          }}
          modifiersStyles={{
            hasEvent: {
              fontWeight: "bold",
              textDecoration: "underline",
              textDecorationColor: "hsl(var(--primary))",
            },
          }}
          className="rounded-md border w-full"
        />

        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <span>Events on {format(selectedDate, "MMM d, yyyy")}</span>
            {selectedDayEvents.length > 0 && (
              <Badge variant="secondary">{selectedDayEvents.length}</Badge>
            )}
          </h4>
          
          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No events scheduled
            </p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {selectedDayEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(event.start_time), "h:mm a")}</span>
                        {event.end_time && (
                          <span>- {format(new Date(event.end_time), "h:mm a")}</span>
                        )}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      {event.meeting_link && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Video className="h-3 w-3" />
                          <a 
                            href={event.meeting_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Join Meeting
                          </a>
                        </div>
                      )}
                    </div>
                    <Badge className={eventTypeColors[event.event_type] || "bg-gray-100"}>
                      {event.event_type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
