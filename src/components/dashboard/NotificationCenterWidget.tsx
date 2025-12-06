import { Link } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Check,
  ExternalLink,
  Briefcase,
  Ticket,
  ClipboardCheck,
  FileText,
  RefreshCw,
  Shield,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

const typeColors: Record<string, string> = {
  info: "text-blue-500 bg-blue-500/10",
  success: "text-green-500 bg-green-500/10",
  warning: "text-amber-500 bg-amber-500/10",
  error: "text-red-500 bg-red-500/10",
};

const categoryConfig: Record<string, { icon: typeof Info; label: string; color: string }> = {
  deals: { icon: Briefcase, label: "Deals", color: "text-blue-600" },
  tickets: { icon: Ticket, label: "Tickets", color: "text-amber-600" },
  approvals: { icon: ClipboardCheck, label: "Approvals", color: "text-green-600" },
  requests: { icon: FileText, label: "Requests", color: "text-purple-600" },
  renewals: { icon: RefreshCw, label: "Renewals", color: "text-orange-600" },
  compliance: { icon: Shield, label: "Compliance", color: "text-red-600" },
};

export function NotificationCenterWidget() {
  const { notifications, unreadCount, unreadCountByCategory, markAsRead, markAllAsRead } = useNotifications();

  // Get recent notifications (last 5)
  const recentNotifications = notifications.slice(0, 5);

  // Get categories with unread counts
  const categoriesWithUnread = Object.entries(unreadCountByCategory)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-primary" />
            Notification Center
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Summary */}
        {categoriesWithUnread.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categoriesWithUnread.map(([category, count]) => {
              const config = categoryConfig[category];
              if (!config) return null;
              const CategoryIcon = config.icon;
              return (
                <div
                  key={category}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-xs"
                >
                  <CategoryIcon className={cn("w-3.5 h-3.5", config.color)} />
                  <span className="capitalize">{config.label}</span>
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {count}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Notifications */}
        <ScrollArea className="h-[280px] -mx-2 px-2">
          {recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1 opacity-70">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentNotifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Info;
                const colorClass = typeColors[notification.type] || typeColors.info;
                const categoryConf = notification.category ? categoryConfig[notification.category] : null;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex gap-3 p-2.5 rounded-lg cursor-pointer transition-all hover:bg-muted/70",
                      !notification.is_read && "bg-primary/5 border-l-2 border-primary"
                    )}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className={cn("p-1.5 rounded-full h-fit flex-shrink-0", colorClass)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            notification.is_read && "text-muted-foreground"
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {categoryConf && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[10px] capitalize">
                            {categoryConf.label}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* View All Link */}
        <Link to="/notifications" className="block">
          <Button variant="outline" size="sm" className="w-full text-xs">
            View All Notifications
            <ExternalLink className="w-3 h-3 ml-1.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
