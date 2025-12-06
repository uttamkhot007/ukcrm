import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  RefreshCw,
  Plus,
  Search,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Key,
  Building2,
  Bell,
  Filter,
  Edit,
  Trash2,
  CalendarDays,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RenewalType = "contract" | "license" | "subscription" | "certification" | "insurance" | "domain";
type RenewalStatus = "active" | "expiring_soon" | "expired" | "renewed" | "cancelled";

interface Renewal {
  id: string;
  name: string;
  type: RenewalType;
  status: RenewalStatus;
  vendor: string | null;
  start_date: string;
  expiry_date: string;
  cost: number;
  auto_renew: boolean;
  reminder_days: number;
  notes: string | null;
  assigned_to: string | null;
  created_by: string;
  deal_id: string | null;
  contact_id: string | null;
  notified_4_weeks: boolean;
  notified_3_weeks: boolean;
  notified_2_weeks: boolean;
  notified_1_week: boolean;
  created_at: string;
  assignee_name?: string;
}

const getTypeIcon = (type: RenewalType) => {
  const icons = {
    contract: FileText,
    license: Key,
    subscription: RefreshCw,
    certification: CheckCircle,
    insurance: Building2,
    domain: Building2,
  };
  return icons[type];
};

const getTypeColor = (type: RenewalType) => {
  const colors = {
    contract: "bg-blue-500/10 text-blue-500",
    license: "bg-purple-500/10 text-purple-500",
    subscription: "bg-green-500/10 text-green-500",
    certification: "bg-orange-500/10 text-orange-500",
    insurance: "bg-yellow-500/10 text-yellow-500",
    domain: "bg-pink-500/10 text-pink-500",
  };
  return colors[type];
};

const getStatusBadge = (status: RenewalStatus, daysUntilExpiry: number) => {
  if (status === "expired" || daysUntilExpiry < 0) {
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Expired</Badge>;
  }
  if (status === "renewed") {
    return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />Renewed</Badge>;
  }
  if (status === "cancelled") {
    return <Badge variant="secondary" className="gap-1">Cancelled</Badge>;
  }
  if (daysUntilExpiry <= 7) {
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Critical</Badge>;
  }
  if (daysUntilExpiry <= 14) {
    return <Badge className="gap-1 bg-orange-500"><Clock className="w-3 h-3" />2 Weeks</Badge>;
  }
  if (daysUntilExpiry <= 21) {
    return <Badge variant="outline" className="gap-1 border-orange-500 text-orange-500"><Clock className="w-3 h-3" />3 Weeks</Badge>;
  }
  if (daysUntilExpiry <= 28) {
    return <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-500"><Bell className="w-3 h-3" />4 Weeks</Badge>;
  }
  return <Badge variant="secondary" className="gap-1"><CheckCircle className="w-3 h-3" />Active</Badge>;
};

const getNotificationStatus = (renewal: Renewal, daysUntilExpiry: number) => {
  const notifications = [];
  if (daysUntilExpiry <= 28 && !renewal.notified_4_weeks) notifications.push("4 weeks");
  if (daysUntilExpiry <= 21 && !renewal.notified_3_weeks) notifications.push("3 weeks");
  if (daysUntilExpiry <= 14 && !renewal.notified_2_weeks) notifications.push("2 weeks");
  if (daysUntilExpiry <= 7 && !renewal.notified_1_week) notifications.push("1 week");
  return notifications;
};

export function RenewalsModule() {
  const { user } = useAuth();
  const { formatCurrency, settings } = useOrganizationSettings();
  const { convert, isLoading: isLoadingRates } = useExchangeRates();
  const orgCurrency = settings?.currency || "INR";
  const alternateCurrency = orgCurrency === "INR" ? "USD" : "INR";
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<RenewalType>("contract");
  const [newVendor, setNewVendor] = useState("");
  const [newStartDate, setNewStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newExpiryDate, setNewExpiryDate] = useState(format(addDays(new Date(), 365), "yyyy-MM-dd"));
  const [newCost, setNewCost] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const today = new Date();

  useEffect(() => {
    fetchRenewals();
  }, []);

  const fetchRenewals = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("renewals")
        .select("*")
        .order("expiry_date", { ascending: true });

      if (error) throw error;

      // Fetch assignee names
      const assigneeIds = [...new Set(data?.filter(r => r.assigned_to).map(r => r.assigned_to) || [])];
      let profileMap = new Map<string, string>();
      
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", assigneeIds);
        
        profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name || p.email || "Unknown"]));
      }

      const renewalsWithNames = data?.map(r => ({
        ...r,
        assignee_name: r.assigned_to ? profileMap.get(r.assigned_to) : undefined,
      })) || [];

      setRenewals(renewalsWithNames);
    } catch (error: any) {
      console.error("Error fetching renewals:", error);
      toast.error("Failed to load renewals");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRenewal = async () => {
    if (!user || !newName.trim() || !newExpiryDate) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase.from("renewals").insert({
        name: newName,
        type: newType,
        vendor: newVendor || null,
        start_date: newStartDate,
        expiry_date: newExpiryDate,
        cost: parseFloat(newCost) || 0,
        notes: newNotes || null,
        created_by: user.id,
        status: "active",
      });

      if (error) throw error;

      toast.success("Renewal created successfully");
      setIsAddDialogOpen(false);
      resetForm();
      fetchRenewals();
    } catch (error: any) {
      console.error("Error creating renewal:", error);
      toast.error("Failed to create renewal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewName("");
    setNewType("contract");
    setNewVendor("");
    setNewStartDate(format(new Date(), "yyyy-MM-dd"));
    setNewExpiryDate(format(addDays(new Date(), 365), "yyyy-MM-dd"));
    setNewCost("");
    setNewNotes("");
  };

  const handleMarkNotified = async (renewalId: string, weeks: number) => {
    const field = weeks === 4 ? "notified_4_weeks" : 
                  weeks === 3 ? "notified_3_weeks" : 
                  weeks === 2 ? "notified_2_weeks" : "notified_1_week";
    
    try {
      const { error } = await supabase
        .from("renewals")
        .update({ [field]: true })
        .eq("id", renewalId);

      if (error) throw error;
      toast.success(`Marked as notified (${weeks} weeks)`);
      fetchRenewals();
    } catch (error: any) {
      console.error("Error updating notification:", error);
      toast.error("Failed to update");
    }
  };

  const handleDeleteRenewal = async (renewalId: string) => {
    if (!confirm("Are you sure you want to delete this renewal?")) return;

    try {
      const { error } = await supabase
        .from("renewals")
        .delete()
        .eq("id", renewalId);

      if (error) throw error;
      toast.success("Renewal deleted");
      fetchRenewals();
    } catch (error: any) {
      console.error("Error deleting renewal:", error);
      toast.error("Failed to delete renewal");
    }
  };

  const handleMarkRenewed = async (renewalId: string) => {
    try {
      const { error } = await supabase
        .from("renewals")
        .update({ status: "renewed" })
        .eq("id", renewalId);

      if (error) throw error;
      toast.success("Marked as renewed");
      fetchRenewals();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Failed to update");
    }
  };

  const getFilteredRenewals = () => {
    return renewals.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesType = typeFilter === "all" || r.type === typeFilter;
      const daysUntilExpiry = differenceInDays(new Date(r.expiry_date), today);

      let matchesTab = true;
      if (activeTab === "expiring") matchesTab = daysUntilExpiry > 0 && daysUntilExpiry <= 28;
      if (activeTab === "expired") matchesTab = daysUntilExpiry < 0;
      if (activeTab === "upcoming") matchesTab = daysUntilExpiry > 28;
      if (activeTab === "calendar") matchesTab = true;

      return matchesSearch && matchesType && matchesTab;
    });
  };

  const filteredRenewals = getFilteredRenewals();

  const stats = {
    total: renewals.length,
    expiringSoon: renewals.filter((r) => {
      const days = differenceInDays(new Date(r.expiry_date), today);
      return days > 0 && days <= 28;
    }).length,
    expired: renewals.filter((r) => differenceInDays(new Date(r.expiry_date), today) < 0).length,
    totalCost: renewals.reduce((sum, r) => sum + (r.cost || 0), 0),
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const getRenewalsForDay = (day: Date) => {
    return renewals.filter(r => isSameDay(new Date(r.expiry_date), day));
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Renewals Management</h1>
          <p className="text-muted-foreground">Track contracts, licenses, subscriptions and more</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Renewal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Renewal</DialogTitle>
              <DialogDescription>Track a new contract, license, or subscription</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Name *</label>
                <Input 
                  placeholder="e.g., Microsoft 365 License" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={newType} onValueChange={(v) => setNewType(v as RenewalType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="license">License</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="domain">Domain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Vendor</label>
                <Input 
                  placeholder="Vendor name" 
                  value={newVendor}
                  onChange={(e) => setNewVendor(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input 
                  type="date" 
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Expiry Date *</label>
                <Input 
                  type="date" 
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Cost ({orgCurrency === "INR" ? "₹" : "$"})</label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea 
                  placeholder="Additional notes" 
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateRenewal} disabled={isSubmitting || !newName.trim() || !newExpiryDate}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Renewal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Renewals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expiringSoon}</p>
                <p className="text-sm text-muted-foreground">Expiring (4 weeks)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expired}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Building2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</p>
                <p className="text-sm text-muted-foreground">Total Annual Cost</p>
                {!isLoadingRates && convert(stats.totalCost, orgCurrency, alternateCurrency) !== null && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    {formatCurrency(convert(stats.totalCost, orgCurrency, alternateCurrency)!, alternateCurrency)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Renewals</TabsTrigger>
            <TabsTrigger value="expiring" className="gap-1">
              Expiring Soon
              {stats.expiringSoon > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {stats.expiringSoon}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1">
              <CalendarIcon className="w-4 h-4" />
              Calendar
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="contract">Contracts</SelectItem>
                <SelectItem value="license">Licenses</SelectItem>
                <SelectItem value="subscription">Subscriptions</SelectItem>
                <SelectItem value="certification">Certifications</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="domain">Domains</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calendar View */}
        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
                
                {/* Empty cells for days before month starts */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-24 bg-muted/20 rounded-lg" />
                ))}
                
                {daysInMonth.map(day => {
                  const dayRenewals = getRenewalsForDay(day);
                  return (
                    <div 
                      key={day.toISOString()} 
                      className={cn(
                        "min-h-24 p-2 rounded-lg border transition-colors",
                        isToday(day) && "border-primary bg-primary/5",
                        !isSameMonth(day, currentMonth) && "opacity-50",
                        dayRenewals.length > 0 && "border-orange-500/50 bg-orange-500/5"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-medium",
                        isToday(day) && "text-primary"
                      )}>
                        {format(day, "d")}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayRenewals.slice(0, 2).map(r => (
                          <div 
                            key={r.id} 
                            className={cn(
                              "text-xs p-1 rounded truncate",
                              getTypeColor(r.type)
                            )}
                            title={r.name}
                          >
                            {r.name}
                          </div>
                        ))}
                        {dayRenewals.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayRenewals.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Table Views */}
        {["all", "expiring", "expired", "upcoming"].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Notifications</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRenewals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No renewals found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRenewals.map((renewal) => {
                        const daysUntilExpiry = differenceInDays(new Date(renewal.expiry_date), today);
                        const TypeIcon = getTypeIcon(renewal.type);
                        const pendingNotifications = getNotificationStatus(renewal, daysUntilExpiry);
                        
                        return (
                          <TableRow key={renewal.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${getTypeColor(renewal.type)}`}>
                                  <TypeIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium">{renewal.name}</p>
                                  {renewal.auto_renew && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <RefreshCw className="w-3 h-3" /> Auto-renew
                                    </p>
                                  )}
                                  {renewal.deal_id && (
                                    <p className="text-xs text-primary">From closed deal</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(renewal.type)}`}>
                                {renewal.type}
                              </span>
                            </TableCell>
                            <TableCell>{renewal.vendor || "-"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                                <span>{format(new Date(renewal.expiry_date), "MMM d, yyyy")}</span>
                                {daysUntilExpiry > 0 && daysUntilExpiry <= 28 && (
                                  <span className="text-xs text-orange-500">({daysUntilExpiry}d)</span>
                                )}
                                {daysUntilExpiry < 0 && (
                                  <span className="text-xs text-red-500">({Math.abs(daysUntilExpiry)}d ago)</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(renewal.status, daysUntilExpiry)}</TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <div>{formatCurrency(renewal.cost || 0)}</div>
                                {!isLoadingRates && renewal.cost > 0 && convert(renewal.cost, orgCurrency, alternateCurrency) !== null && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3" />
                                    {formatCurrency(convert(renewal.cost, orgCurrency, alternateCurrency)!, alternateCurrency)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {pendingNotifications.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {pendingNotifications.map(n => (
                                    <Button 
                                      key={n}
                                      variant="outline" 
                                      size="sm"
                                      className="h-6 text-xs"
                                      onClick={() => handleMarkNotified(renewal.id, parseInt(n))}
                                    >
                                      <Bell className="w-3 h-3 mr-1" />
                                      {n}
                                    </Button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">All sent</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {renewal.status !== "renewed" && daysUntilExpiry <= 28 && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-green-500 hover:text-green-600"
                                    onClick={() => handleMarkRenewed(renewal.id)}
                                    title="Mark as renewed"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteRenewal(renewal.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
