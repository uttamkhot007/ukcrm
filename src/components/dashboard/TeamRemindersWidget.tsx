import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Check, 
  Clock, 
  AlertTriangle,
  Calendar,
  DollarSign,
  RefreshCcw,
  Presentation,
  Target
} from "lucide-react";
import { format, isPast, isToday, isTomorrow, differenceInHours } from "date-fns";
import { toast } from "sonner";

interface TeamReminder {
  id: string;
  title: string;
  message: string;
  reminder_type: string;
  target_team: string | null;
  due_date: string;
  priority: string;
  is_read: boolean;
  is_dismissed: boolean;
  related_entity_type: string | null;
  related_entity_id: string | null;
}

const reminderTypeIcons: Record<string, typeof Bell> = {
  deal_follow_up: Target,
  payment_due: DollarSign,
  renewal_due: RefreshCcw,
  demo_scheduled: Presentation,
  poc_deadline: Calendar,
  training: Calendar,
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function TeamRemindersWidget() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["team-reminders", user?.id, currentTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("team_reminders")
        .select("*")
        .eq("target_user_id", user?.id)
        .eq("is_dismissed", false)
        .order("due_date", { ascending: true })
        .limit(10);

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TeamReminder[];
    },
    enabled: !!user,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_reminders")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-reminders"] });
    },
  });

  const dismissReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_reminders")
        .update({ is_dismissed: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-reminders"] });
      toast.success("Reminder dismissed");
    },
  });

  const getTimeLabel = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isPast(date)) {
      const hoursAgo = differenceInHours(new Date(), date);
      if (hoursAgo < 24) return "Overdue";
      return `${Math.floor(hoursAgo / 24)} days overdue`;
    }
    if (isToday(date)) return "Due today";
    if (isTomorrow(date)) return "Due tomorrow";
    return format(date, "MMM d");
  };

  const getUrgencyClass = (dueDate: string, priority: string) => {
    const date = new Date(dueDate);
    if (isPast(date) || priority === "urgent") return "border-l-red-500";
    if (isToday(date) || priority === "high") return "border-l-orange-500";
    if (isTomorrow(date) || priority === "medium") return "border-l-yellow-500";
    return "border-l-green-500";
  };

  const unreadCount = reminders.filter((r) => !r.is_read).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Reminders
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No pending reminders</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {reminders.map((reminder) => {
              const Icon = reminderTypeIcons[reminder.reminder_type] || Bell;
              return (
                <div
                  key={reminder.id}
                  className={`p-3 rounded-lg border-l-4 bg-card hover:bg-accent/50 transition-colors ${getUrgencyClass(
                    reminder.due_date,
                    reminder.priority
                  )} ${!reminder.is_read ? "bg-accent/30" : ""}`}
                  onClick={() => !reminder.is_read && markAsRead.mutate(reminder.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{reminder.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {reminder.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeLabel(reminder.due_date)}
                          </span>
                          <Badge className={priorityColors[reminder.priority]}>
                            {reminder.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissReminder.mutate(reminder.id);
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
