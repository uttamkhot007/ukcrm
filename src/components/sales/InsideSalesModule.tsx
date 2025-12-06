import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Phone,
  Mail,
  Building2,
  Search,
  Filter,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  DollarSign,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { toast } from "sonner";

interface Prospect {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  original_deal_title: string;
  original_deal_value: number;
  loss_reason: string | null;
  status: string;
  priority: string;
  notes: string | null;
  follow_up_date: string | null;
  last_contacted_at: string | null;
  deal_id: string | null;
  assigned_to: string | null;
  created_at: string;
  assignee_name?: string;
}

const getStatusBadge = (status: string) => {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
    new: { label: "New", variant: "default", icon: AlertCircle },
    contacted: { label: "Contacted", variant: "outline", icon: Phone },
    interested: { label: "Interested", variant: "default", icon: CheckCircle },
    not_interested: { label: "Not Interested", variant: "secondary", icon: XCircle },
    converted: { label: "Converted", variant: "default", icon: CheckCircle },
    archived: { label: "Archived", variant: "secondary", icon: Clock },
  };
  const { label, variant, icon: Icon } = config[status] || config.new;
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

const getPriorityBadge = (priority: string) => {
  const colors: Record<string, string> = {
    high: "bg-red-500/10 text-red-500",
    medium: "bg-yellow-500/10 text-yellow-500",
    low: "bg-green-500/10 text-green-500",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${colors[priority] || colors.medium}`}>
      {priority}
    </span>
  );
};

export function InsideSalesModule() {
  const { user } = useAuth();
  const { formatCurrency, settings } = useOrganizationSettings();
  const { convert, isLoading: isLoadingRates } = useExchangeRates();
  const orgCurrency = settings?.currency || "INR";
  const alternateCurrency = orgCurrency === "INR" ? "USD" : "INR";
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const today = new Date();

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("inside_sales_prospects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch assignee names
      const assigneeIds = [...new Set(data?.filter(p => p.assigned_to).map(p => p.assigned_to) || [])];
      let profileMap = new Map<string, string>();

      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", assigneeIds);
        
        profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name || p.email || "Unknown"]));
      }

      const prospectsWithNames = data?.map(p => ({
        ...p,
        assignee_name: p.assigned_to ? profileMap.get(p.assigned_to) : undefined,
      })) || [];

      setProspects(prospectsWithNames);
    } catch (error: any) {
      console.error("Error fetching prospects:", error);
      toast.error("Failed to load prospects");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (prospectId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("inside_sales_prospects")
        .update({ 
          status: newStatus,
          last_contacted_at: newStatus === "contacted" ? new Date().toISOString() : undefined
        })
        .eq("id", prospectId);

      if (error) throw error;
      toast.success(`Status updated to ${newStatus}`);
      fetchProspects();
      if (selectedProspect?.id === prospectId) {
        setSelectedProspect({ ...selectedProspect, status: newStatus });
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleUpdatePriority = async (prospectId: string, newPriority: string) => {
    try {
      const { error } = await supabase
        .from("inside_sales_prospects")
        .update({ priority: newPriority })
        .eq("id", prospectId);

      if (error) throw error;
      toast.success("Priority updated");
      fetchProspects();
    } catch (error: any) {
      console.error("Error updating priority:", error);
      toast.error("Failed to update priority");
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedProspect) return;
    
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from("inside_sales_prospects")
        .update({ notes: editNotes })
        .eq("id", selectedProspect.id);

      if (error) throw error;
      toast.success("Notes saved");
      setSelectedProspect({ ...selectedProspect, notes: editNotes });
      fetchProspects();
    } catch (error: any) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkContacted = async (prospectId: string) => {
    try {
      const { error } = await supabase
        .from("inside_sales_prospects")
        .update({ 
          status: "contacted",
          last_contacted_at: new Date().toISOString()
        })
        .eq("id", prospectId);

      if (error) throw error;
      toast.success("Marked as contacted");
      fetchProspects();
    } catch (error: any) {
      console.error("Error updating:", error);
      toast.error("Failed to update");
    }
  };

  const openProspectDetails = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setEditNotes(prospect.notes || "");
    setIsDetailSheetOpen(true);
  };

  const filteredProspects = prospects.filter((p) => {
    const matchesSearch = 
      p.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.original_deal_title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || p.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: prospects.length,
    new: prospects.filter((p) => p.status === "new").length,
    contacted: prospects.filter((p) => p.status === "contacted").length,
    interested: prospects.filter((p) => p.status === "interested").length,
    totalValue: prospects.reduce((sum, p) => sum + (p.original_deal_value || 0), 0),
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
      <div>
        <h1 className="text-3xl font-bold">Inside Sales Prospects</h1>
        <p className="text-muted-foreground">Closed lost opportunities for future follow-up</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Prospects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <AlertCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.new}</p>
                <p className="text-sm text-muted-foreground">New</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Phone className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.contacted}</p>
                <p className="text-sm text-muted-foreground">Contacted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.interested}</p>
                <p className="text-sm text-muted-foreground">Interested</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
                {!isLoadingRates && convert(stats.totalValue, orgCurrency, alternateCurrency) !== null && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    {formatCurrency(convert(stats.totalValue, orgCurrency, alternateCurrency)!, alternateCurrency)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">Lost Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by company, contact, or deal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="not_interested">Not Interested</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Prospects Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company / Contact</TableHead>
                <TableHead>Original Deal</TableHead>
                <TableHead>Loss Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProspects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No prospects found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProspects.map((prospect) => {
                  const followUpDays = prospect.follow_up_date 
                    ? differenceInDays(new Date(prospect.follow_up_date), today)
                    : null;
                  
                  return (
                    <TableRow key={prospect.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openProspectDetails(prospect)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium">{prospect.company_name || "Unknown Company"}</p>
                            <p className="text-sm text-muted-foreground">{prospect.contact_name || "No contact"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{prospect.original_deal_title}</p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(prospect.original_deal_value || 0)}</p>
                          {!isLoadingRates && prospect.original_deal_value > 0 && convert(prospect.original_deal_value, orgCurrency, alternateCurrency) !== null && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" />
                              {formatCurrency(convert(prospect.original_deal_value, orgCurrency, alternateCurrency)!, alternateCurrency)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm line-clamp-2">{prospect.loss_reason || "-"}</p>
                      </TableCell>
                      <TableCell>{getStatusBadge(prospect.status)}</TableCell>
                      <TableCell>
                        <Select 
                          value={prospect.priority} 
                          onValueChange={(v) => {
                            event?.stopPropagation();
                            handleUpdatePriority(prospect.id, v);
                          }}
                        >
                          <SelectTrigger className="w-24 h-8" onClick={(e) => e.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {prospect.follow_up_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className={followUpDays !== null && followUpDays < 0 ? "text-red-500" : ""}>
                              {format(new Date(prospect.follow_up_date), "MMM d")}
                            </span>
                            {followUpDays !== null && followUpDays <= 0 && (
                              <Badge variant="destructive" className="text-xs">Overdue</Badge>
                            )}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {prospect.status === "new" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleMarkContacted(prospect.id)}
                            >
                              <Phone className="w-4 h-4 mr-1" />
                              Contact
                            </Button>
                          )}
                          {prospect.status === "contacted" && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-green-500"
                                onClick={() => handleUpdateStatus(prospect.id, "interested")}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-red-500"
                                onClick={() => handleUpdateStatus(prospect.id, "not_interested")}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
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

      {/* Prospect Detail Sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          {selectedProspect && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedProspect.company_name || "Unknown Company"}</SheetTitle>
                <SheetDescription>
                  {getStatusBadge(selectedProspect.status)}
                  <span className="ml-2">{getPriorityBadge(selectedProspect.priority)}</span>
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Contact Information</h4>
                  <div className="space-y-2">
                    {selectedProspect.contact_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {selectedProspect.contact_name}
                      </div>
                    )}
                    {selectedProspect.contact_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <a href={`mailto:${selectedProspect.contact_email}`} className="text-primary hover:underline">
                          {selectedProspect.contact_email}
                        </a>
                      </div>
                    )}
                    {selectedProspect.contact_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <a href={`tel:${selectedProspect.contact_phone}`} className="text-primary hover:underline">
                          {selectedProspect.contact_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Original Deal */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Original Deal</h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-medium">{selectedProspect.original_deal_title}</p>
                    <p className="text-sm text-muted-foreground">
                      Value: ₹{(selectedProspect.original_deal_value || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Loss Reason */}
                {selectedProspect.loss_reason && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Loss Reason</h4>
                    <p className="text-sm text-muted-foreground">{selectedProspect.loss_reason}</p>
                  </div>
                )}

                {/* Status Actions */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Update Status</h4>
                  <Select 
                    value={selectedProspect.status} 
                    onValueChange={(v) => handleUpdateStatus(selectedProspect.id, v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Notes
                  </h4>
                  <Textarea 
                    placeholder="Add notes about this prospect..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={4}
                  />
                  <Button 
                    size="sm" 
                    onClick={handleSaveNotes}
                    disabled={isUpdating || editNotes === selectedProspect.notes}
                  >
                    {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Notes
                  </Button>
                </div>

                {/* Timestamps */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Created: {format(new Date(selectedProspect.created_at), "MMM d, yyyy")}</p>
                  {selectedProspect.last_contacted_at && (
                    <p>Last Contacted: {format(new Date(selectedProspect.last_contacted_at), "MMM d, yyyy h:mm a")}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
