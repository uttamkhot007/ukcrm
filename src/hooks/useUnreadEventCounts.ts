import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { differenceInDays, parseISO, isAfter, startOfToday } from "date-fns";

export function useUnreadEventCounts() {
  const { user } = useAuth();

  const { data: counts = { birthdayCount: 0, anniversaryCount: 0, orgEventCount: 0, achievementCount: 0, performanceCount: 0 } } = useQuery({
    queryKey: ["event-counts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = startOfToday();

      // Get all events
      const { data: events, error } = await supabase
        .from("employee_events")
        .select("*");

      if (error) throw error;

      // Get user's sent wishes to filter out events they've already wished on
      const { data: wishes } = await supabase
        .from("event_wishes")
        .select("event_id")
        .eq("sender_id", user!.id);

      const wishedEventIds = new Set(wishes?.map(w => w.event_id) || []);

      // Calculate counts - for birthdays/anniversaries, show upcoming within 7 days that haven't been wished
      // For org events, achievements, performance - show recent ones (last 30 days) or upcoming
      let birthdayCount = 0;
      let anniversaryCount = 0;
      let orgEventCount = 0;
      let achievementCount = 0;
      let performanceCount = 0;

      events?.forEach(event => {
        const eventDate = parseISO(event.event_date);
        const daysUntil = differenceInDays(eventDate, today);
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
    refetchInterval: 60000, // Refresh every minute
  });

  return counts;
}
