import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { differenceInDays, parseISO, startOfToday, subDays, addDays, format } from "date-fns";

const EMPTY_COUNTS = {
  birthdayCount: 0,
  anniversaryCount: 0,
  orgEventCount: 0,
  achievementCount: 0,
  performanceCount: 0,
};

export function useUnreadEventCounts() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const { data: counts = EMPTY_COUNTS } = useQuery({
    queryKey: ["event-counts", user?.id, currentTenant?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const today = startOfToday();

      // Only the window we actually score on, and only the columns we read.
      const rangeStart = format(subDays(today, 30), "yyyy-MM-dd");
      const rangeEnd = format(addDays(today, 30), "yyyy-MM-dd");

      let eventsQuery = supabase
        .from("employee_events")
        .select("id, event_type, event_date")
        .gte("event_date", rangeStart)
        .lte("event_date", rangeEnd);

      if (currentTenant?.id) {
        eventsQuery = eventsQuery.eq("tenant_id", currentTenant.id);
      }

      const { data: events, error } = await eventsQuery;
      if (error) throw error;

      if (!events || events.length === 0) return EMPTY_COUNTS;

      // Only look up wishes for the events actually in range.
      const { data: wishes } = await supabase
        .from("event_wishes")
        .select("event_id")
        .eq("sender_id", user!.id)
        .in("event_id", events.map((e) => e.id));

      const wishedEventIds = new Set(wishes?.map((w) => w.event_id) || []);

      let birthdayCount = 0;
      let anniversaryCount = 0;
      let orgEventCount = 0;
      let achievementCount = 0;
      let performanceCount = 0;

      events.forEach((event) => {
        const daysUntil = differenceInDays(parseISO(event.event_date), today);
        const isUpcoming = daysUntil >= 0 && daysUntil <= 7;
        const isRecent = daysUntil >= -30 && daysUntil <= 30;
        const hasWished = wishedEventIds.has(event.id);

        switch (event.event_type) {
          case "birthday":
            if (isUpcoming && !hasWished) birthdayCount++;
            break;
          case "anniversary":
            if (isUpcoming && !hasWished) anniversaryCount++;
            break;
          case "org_event":
            if (isRecent) orgEventCount++;
            break;
          case "achievement":
            if (isRecent) achievementCount++;
            break;
          case "performance":
            if (isRecent) performanceCount++;
            break;
        }
      });

      return { birthdayCount, anniversaryCount, orgEventCount, achievementCount, performanceCount };
    },
    refetchInterval: 1000 * 60 * 5,
  });

  return counts;
}
