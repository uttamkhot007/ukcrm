import { useState } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, Info, AlertTriangle, XCircle, CheckCircle, ExternalLink, Briefcase, Ticket, ClipboardCheck, FileText, RefreshCw, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle,
};

const typeColors: Record<string, string> = {
  info: "text-blue-500",
  warning: "text-amber-500",
  error: "text-red-500",
  success: "text-green-500",
};

const categoryConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  deals: { icon: Briefcase, label: "Deals", color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" },
  tickets: { icon: Ticket, label: "Tickets", color: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" },
  approvals: { icon: ClipboardCheck, label: "Approvals", color: "bg-green-500/10 text-green-600 hover:bg-green-500/20" },
  requests: { icon: FileText, label: "Requests", color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20" },
  renewals: { icon: RefreshCw, label: "Renewals", color: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20" },
  compliance: { icon: Shield, label: "Compliance", color: "bg-red-500/10 text-red-600 hover:bg-red-500/20" },
};

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const { notifications, unreadCount, unreadCountByCategory, markAsRead, markAllAsRead } = useNotifications();

  const filteredNotifications = categoryFilter
    ? notifications.filter((n) => n.category === categoryFilter)
    : notifications;

  const categoriesWithUnread = Object.entries(unreadCountByCategory).filter(([_, count]) => count > 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-medium">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        {/* Category badges */}
        {categoriesWithUnread.length > 0 && (
          <div className="p-2 border-b flex flex-wrap gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-xs",
                !categoryFilter && "bg-muted"
              )}
              onClick={() => setCategoryFilter(null)}
            >
              All ({unreadCount})
            </Button>
            {categoriesWithUnread.map(([category, count]) => {
              const config = categoryConfig[category];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <Button
                  key={category}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs gap-1",
                    categoryFilter === category ? config.color : "hover:bg-muted"
                  )}
                  onClick={() => setCategoryFilter(categoryFilter === category ? null : category)}
                >
                  <Icon className="w-3 h-3" />
                  {config.label}
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        )}

        <ScrollArea className="h-[350px]">
          {filteredNotifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {categoryFilter ? `No ${categoryFilter} notifications` : "No notifications"}
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Info;
                const iconColor = typeColors[notification.type] || "text-muted-foreground";
                const categoryConf = notification.category ? categoryConfig[notification.category] : null;
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                      !notification.is_read && "bg-primary/5"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", iconColor)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm truncate">{notification.title}</p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {categoryConf && (
                              <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
                                {categoryConf.label}
                              </Badge>
                            )}
                            {!notification.is_read && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Link to="/notifications" onClick={() => setOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full justify-center">
              View all notifications
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
