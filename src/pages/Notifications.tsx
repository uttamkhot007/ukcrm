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
  Briefcase,
  Ticket,
  ClipboardCheck,
  FileText,
  RefreshCw,
  Shield,
  ChevronDown,
  LayoutList,
  Layers,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

const categoryConfig: Record<string, { icon: typeof Info; label: string; color: string; bgColor: string }> = {
  deals: { icon: Briefcase, label: "Deals", color: "text-blue-600", bgColor: "bg-blue-500/10" },
  tickets: { icon: Ticket, label: "Tickets", color: "text-amber-600", bgColor: "bg-amber-500/10" },
  approvals: { icon: ClipboardCheck, label: "Approvals", color: "text-green-600", bgColor: "bg-green-500/10" },
  requests: { icon: FileText, label: "Requests", color: "text-purple-600", bgColor: "bg-purple-500/10" },
  renewals: { icon: RefreshCw, label: "Renewals", color: "text-orange-600", bgColor: "bg-orange-500/10" },
  compliance: { icon: Shield, label: "Compliance", color: "text-red-600", bgColor: "bg-red-500/10" },
};

type DateFilter = "all" | "today" | "yesterday" | "this_week" | "this_month";
type GroupMode = "date" | "category";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  category: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

interface NotificationItemProps {
  notification: Notification;
  selectionMode: boolean;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  markAsRead: (id: string) => void;
  handleDeleteSingle: (id: string, e: React.MouseEvent) => void;
  showCategory?: boolean;
}

function NotificationItem({
  notification,
  selectionMode,
  selectedIds,
  toggleSelection,
  markAsRead,
  handleDeleteSingle,
  showCategory = true,
}: NotificationItemProps) {
  const Icon = typeIcons[notification.type] || Info;
  const colorClass = typeColors[notification.type] || typeColors.info;

  return (
    <div
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
          <p
            className={cn(
              "font-medium text-sm",
              !notification.is_read && "text-foreground",
              notification.is_read && "text-muted-foreground"
            )}
          >
            {notification.title}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!notification.is_read && (
              <Badge variant="secondary" className="text-xs">
                New
              </Badge>
            )}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(parseISO(notification.created_at), "MMM d, h:mm a")}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {notification.message}
        </p>

        {showCategory && notification.category && (
          <Badge variant="outline" className="mt-2 text-xs capitalize">
            {notification.category.replace(/_/g, " ")}
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
}

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
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [activeView, setActiveView] = useState<"notifications" | "preferences">("notifications");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupMode, setGroupMode] = useState<GroupMode>("date");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(Object.keys(categoryConfig)));

  // Get unique categories from notifications
  const uniqueCategories = useMemo(() => {
    const categories = notifications
      .map((n) => n.category)
      .filter((c): c is string => c !== null);
    return [...new Set(categories)];
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Type filter
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      
      // Category filter
      if (categoryFilter !== "all") {
        if (categoryFilter === "uncategorized" && n.category !== null) return false;
        if (categoryFilter !== "uncategorized" && n.category !== categoryFilter) return false;
      }
      
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
  }, [notifications, typeFilter, categoryFilter, dateFilter, readFilter]);

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

  // Group notifications by category
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof filteredNotifications> = {};
    
    filteredNotifications.forEach((n) => {
      const key = n.category || "uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    
    // Sort categories by config order, then uncategorized last
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "uncategorized") return 1;
      if (b === "uncategorized") return -1;
      const aIndex = Object.keys(categoryConfig).indexOf(a);
      const bIndex = Object.keys(categoryConfig).indexOf(b);
      return aIndex - bIndex;
    });
    
    const sortedGroups: Record<string, typeof filteredNotifications> = {};
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });
    
    return sortedGroups;
  }, [filteredNotifications]);

  const toggleCategoryExpand = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAllCategories = () => {
    setExpandedCategories(new Set([...Object.keys(categoryConfig), "uncategorized"]));
  };

  const collapseAllCategories = () => {
    setExpandedCategories(new Set());
  };

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
            <Button variant="ghost" size="icon" aria-label="Back to dashboard">
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
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
              <Button variant="ghost" size="sm" onClick={clearSelection} aria-label="Clear selection">
                <X className="w-4 h-4" aria-hidden="true" />
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
            aria-label={activeView === "preferences" ? "Back to notifications" : "Open notification preferences"}
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>

        {activeView === "preferences" ? (
          <NotificationPreferences />
        ) : (
          <>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle asChild>
              <h2 className="text-sm font-medium flex items-center gap-2">
                <Filter className="w-4 h-4" aria-hidden="true" />
                Filters
              </h2>
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
                <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category} value={category} className="capitalize">
                        {category.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                    {notifications.some(n => n.category === null) && (
                      <SelectItem value="uncategorized">Uncategorized</SelectItem>
                    )}
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

        {/* Tabs and Group Mode Toggle */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <Tabs defaultValue="all" className="flex-1">
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
          
          <div className="flex items-center gap-2">
            <Button
              variant={groupMode === "date" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setGroupMode("date")}
              className="gap-1.5"
            >
              <LayoutList className="w-4 h-4" />
              By Date
            </Button>
            <Button
              variant={groupMode === "category" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setGroupMode("category")}
              className="gap-1.5"
            >
              <Layers className="w-4 h-4" />
              By Category
            </Button>
          </div>
        </div>

        {/* Category expand/collapse controls */}
        {groupMode === "category" && Object.keys(groupedByCategory).length > 0 && (
          <div className="flex items-center justify-end gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={expandAllCategories}>
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAllCategories}>
              Collapse All
            </Button>
          </div>
        )}

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
        ) : groupMode === "date" ? (
          // Date-grouped view
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
                  {date}
                </h3>
                <Card>
                  <ScrollArea className="max-h-[600px]">
                    <div className="divide-y divide-border">
                      {items.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          selectionMode={selectionMode}
                          selectedIds={selectedIds}
                          toggleSelection={toggleSelection}
                          markAsRead={markAsRead}
                          handleDeleteSingle={handleDeleteSingle}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          // Category-grouped view with collapsible sections
          <div className="space-y-4">
            {Object.entries(groupedByCategory).map(([category, items]) => {
              const config = categoryConfig[category];
              const CategoryIcon = config?.icon || Bell;
              const unreadInCategory = items.filter(n => !n.is_read).length;
              const isExpanded = expandedCategories.has(category);
              
              return (
                <Collapsible
                  key={category}
                  open={isExpanded}
                  onOpenChange={() => toggleCategoryExpand(category)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              config?.bgColor || "bg-muted"
                            )}>
                              <CategoryIcon className={cn("w-5 h-5", config?.color || "text-muted-foreground")} />
                            </div>
                            <div>
                              <CardTitle className="text-base capitalize">
                                {config?.label || category.replace(/_/g, " ")}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {items.length} notification{items.length !== 1 ? "s" : ""}
                                {unreadInCategory > 0 && (
                                  <span className="ml-2 text-primary font-medium">
                                    ({unreadInCategory} unread)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {unreadInCategory > 0 && (
                              <Badge variant="secondary" className="h-6">
                                {unreadInCategory}
                              </Badge>
                            )}
                            <ChevronDown className={cn(
                              "w-5 h-5 text-muted-foreground transition-transform",
                              isExpanded && "rotate-180"
                            )} />
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ScrollArea className="max-h-[400px]">
                        <div className="divide-y divide-border">
                          {items.map((notification) => (
                            <NotificationItem
                              key={notification.id}
                              notification={notification}
                              selectionMode={selectionMode}
                              selectedIds={selectedIds}
                              toggleSelection={toggleSelection}
                              markAsRead={markAsRead}
                              handleDeleteSingle={handleDeleteSingle}
                              showCategory={false}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
