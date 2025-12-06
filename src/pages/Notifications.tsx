import { useState, useMemo } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from "date-fns";
import {
  Bell,
  CheckCircle2,
  Info,
  AlertTriangle,
  AlertCircle,
  Check,
  CheckCheck,
  Filter,
  ArrowLeft,
  Loader2,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { toast } from "sonner";

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

type DateFilter = "all" | "today" | "yesterday" | "this_week" | "this_month";

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    deleteMultipleNotifications,
    deleteAllNotifications,
  } = useNotifications();
  
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [activeView, setActiveView] = useState<"notifications" | "preferences">("notifications");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Type filter
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      
      // Read status filter
      if (readFilter === "unread" && n.is_read) return false;
      if (readFilter === "read" && !n.is_read) return false;
      
      // Date filter
      if (dateFilter !== "all") {
        const date = parseISO(n.created_at);
        if (dateFilter === "today" && !isToday(date)) return false;
        if (dateFilter === "yesterday" && !isYesterday(date)) return false;
        if (dateFilter === "this_week" && !isThisWeek(date)) return false;
        if (dateFilter === "this_month" && !isThisMonth(date)) return false;
      }
      
      return true;
    });
  }, [notifications, typeFilter, dateFilter, readFilter]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, typeof filteredNotifications> = {};
    
    filteredNotifications.forEach((n) => {
      const date = parseISO(n.created_at);
      let key: string;
      
      if (isToday(date)) {
        key = "Today";
      } else if (isYesterday(date)) {
        key = "Yesterday";
      } else if (isThisWeek(date)) {
        key = "This Week";
      } else if (isThisMonth(date)) {
        key = "This Month";
      } else {
        key = format(date, "MMMM yyyy");
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    
    return groups;
  }, [filteredNotifications]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleDeleteSelected = async () => {
    await deleteMultipleNotifications(Array.from(selectedIds));
    toast.success(`Deleted ${selectedIds.size} notification${selectedIds.size > 1 ? 's' : ''}`);
    clearSelection();
  };

  const handleDeleteSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(id);
    toast.success("Notification deleted");
  };

  const handleDeleteAll = async () => {
    await deleteAllNotifications();
    toast.success("All notifications deleted");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const uniqueTypes = [...new Set(notifications.map((n) => n.type))];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground text-sm">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>
          {selectionMode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select all
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    disabled={selectedIds.size === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete notifications?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {selectedIds.size} notification{selectedIds.size > 1 ? 's' : ''}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSelected}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              {unreadCount > 0 && activeView === "notifications" && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && activeView === "notifications" && (
                <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </>
          )}
          <Button
            variant={activeView === "preferences" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveView(activeView === "preferences" ? "notifications" : "preferences")}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {activeView === "preferences" ? (
          <NotificationPreferences />
        ) : (
          <>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-muted-foreground mb-1.5 block">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {uniqueTypes.map((type) => (
                      <SelectItem key={type} value={type} className="capitalize">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-muted-foreground mb-1.5 block">Date</label>
                <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_week">This week</SelectItem>
                    <SelectItem value="this_month">This month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-muted-foreground mb-1.5 block">Status</label>
                <Select value={readFilter} onValueChange={(v) => setReadFilter(v as "all" | "unread" | "read")}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread only</SelectItem>
                    <SelectItem value="read">Read only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for quick filtering */}
        <Tabs defaultValue="all" className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" onClick={() => setReadFilter("all")}>
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" onClick={() => setReadFilter("unread")}>
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="read" onClick={() => setReadFilter("read")}>
              Read ({notifications.length - unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No notifications found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Try adjusting your filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
                  {date}
                </h3>
                <Card>
                  <ScrollArea className="max-h-[600px]">
                    <div className="divide-y divide-border">
                      {items.map((notification) => {
                        const Icon = typeIcons[notification.type] || Info;
                        const colorClass = typeColors[notification.type] || typeColors.info;
                        
                        return (
                          <div
                            key={notification.id}
                            className={cn(
                              "flex gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                              !notification.is_read && "bg-primary/5",
                              selectionMode && selectedIds.has(notification.id) && "bg-primary/10"
                            )}
                            onClick={() => {
                              if (selectionMode) {
                                toggleSelection(notification.id);
                              } else if (!notification.is_read) {
                                markAsRead(notification.id);
                              }
                            }}
                          >
                            {selectionMode && (
                              <div className="flex items-center">
                                <Checkbox
                                  checked={selectedIds.has(notification.id)}
                                  onCheckedChange={() => toggleSelection(notification.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            )}
                            
                            <div className={cn("p-2 rounded-full h-fit", colorClass)}>
                              <Icon className="w-4 h-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={cn(
                                  "font-medium text-sm",
                                  !notification.is_read && "text-foreground",
                                  notification.is_read && "text-muted-foreground"
                                )}>
                                  {notification.title}
                                </p>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {!notification.is_read && (
                                    <Badge variant="secondary" className="text-xs">
                                      New
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {format(parseISO(notification.created_at), "h:mm a")}
                                  </span>
                                </div>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              
                              {notification.category && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  {notification.category}
                                </Badge>
                              )}
                            </div>
                            
                            {!selectionMode && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {!notification.is_read && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => handleDeleteSingle(notification.id, e)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            ))}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
