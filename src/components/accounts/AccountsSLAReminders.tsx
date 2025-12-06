import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format, differenceInDays, addDays, isBefore, isToday } from "date-fns";
import {
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  FileText,
  CreditCard,
  Package,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Search,
  Send,
  Mail,
  Timer,
} from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ReminderType = "odf" | "order_processing" | "payment" | "license" | "invoice";
type ReminderStatus = "pending" | "sent" | "acknowledged" | "overdue" | "completed";

interface SLAConfig {
  type: ReminderType;
  name: string;
  icon: React.ElementType;
  defaultSLAHours: number;
  reminderIntervals: number[]; // days before/after due
  description: string;
}

const SLA_CONFIGS: SLAConfig[] = [
  {
    type: "odf",
    name: "ODF Processing",
    icon: FileText,
    defaultSLAHours: 48,
    reminderIntervals: [-2, -1, 0, 1, 2],
    description: "Order Delivery Form must be processed within 48 hours",
  },
  {
    type: "order_processing",
    name: "Order Processing",
    icon: Package,
    defaultSLAHours: 72,
    reminderIntervals: [-3, -1, 0, 1, 3],
    description: "Orders must be processed and shipped within 72 hours",
  },
  {
    type: "payment",
    name: "Payment Collection",
    icon: CreditCard,
    defaultSLAHours: 720, // 30 days
    reminderIntervals: [-7, -3, -1, 0, 7, 14, 21],
    description: "Payment collection reminders based on invoice due date",
  },
  {
    type: "license",
    name: "License Activation",
    icon: Clock,
    defaultSLAHours: 24,
    reminderIntervals: [-1, 0, 1],
    description: "License keys must be delivered within 24 hours",
  },
  {
    type: "invoice",
    name: "Invoice Generation",
    icon: FileText,
    defaultSLAHours: 24,
    reminderIntervals: [-1, 0, 1],
    description: "Invoices must be generated within 24 hours of deal closure",
  },
];

interface Reminder {
  id: string;
  type: ReminderType;
  entity_id: string;
  entity_type: string;
  due_date: string;
  status: ReminderStatus;
  title: string;
  description: string;
  contact_name?: string;
  company_name?: string;
  amount?: number;
  sla_hours: number;
  created_at: string;
  last_reminder_sent?: string;
  reminder_count: number;
}

export function AccountsSLAReminders() {
  const [activeTab, setActiveTab] = useState<ReminderType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ReminderType>("odf");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDescription, setReminderDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const { user } = useAuth();
  const { formatCurrency } = useOrganizationSettings();
  const queryClient = useQueryClient();

  // Fetch deals for creating reminders
  const { data: deals = [] } = useQuery({
    queryKey: ["deals-for-reminders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          id,
          title,
          value,
          stage,
          closed_won_substage,
          contact_id,
          contacts:contact_id (name, company)
        `)
        .eq("stage", "closed_won")
        .order("actual_close_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch invoices for payment reminders
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-for-reminders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          total,
          amount_paid,
          due_date,
          status,
          contact_id,
          contacts:contact_id (name, company)
        `)
        .in("status", ["sent", "overdue", "partially_paid"])
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Generate reminders from deals and invoices
  const generateReminders = (): Reminder[] => {
    const reminders: Reminder[] = [];

    // ODF reminders from deals
    deals
      .filter((deal: any) => 
        !deal.closed_won_substage || 
        deal.closed_won_substage === "request_odf"
      )
      .forEach((deal: any) => {
        reminders.push({
          id: `odf-${deal.id}`,
          type: "odf",
          entity_id: deal.id,
          entity_type: "deal",
          due_date: addDays(new Date(), 2).toISOString(),
          status: "pending",
          title: `ODF Required: ${deal.title}`,
          description: "Order Delivery Form needs to be created",
          contact_name: deal.contacts?.name,
          company_name: deal.contacts?.company,
          amount: deal.value,
          sla_hours: 48,
          created_at: new Date().toISOString(),
          reminder_count: 0,
        });
      });

    // Order processing reminders
    deals
      .filter((deal: any) => deal.closed_won_substage === "process_order")
      .forEach((deal: any) => {
        reminders.push({
          id: `order-${deal.id}`,
          type: "order_processing",
          entity_id: deal.id,
          entity_type: "deal",
          due_date: addDays(new Date(), 3).toISOString(),
          status: "pending",
          title: `Process Order: ${deal.title}`,
          description: "Order needs to be processed and shipped",
          contact_name: deal.contacts?.name,
          company_name: deal.contacts?.company,
          amount: deal.value,
          sla_hours: 72,
          created_at: new Date().toISOString(),
          reminder_count: 0,
        });
      });

    // Payment reminders from invoices
    invoices.forEach((invoice: any) => {
      const dueDate = new Date(invoice.due_date);
      const daysOverdue = differenceInDays(new Date(), dueDate);
      const outstanding = invoice.total - (invoice.amount_paid || 0);

      let status: ReminderStatus = "pending";
      if (daysOverdue > 0) status = "overdue";
      if (daysOverdue > 30) status = "overdue";

      reminders.push({
        id: `payment-${invoice.id}`,
        type: "payment",
        entity_id: invoice.id,
        entity_type: "invoice",
        due_date: invoice.due_date,
        status,
        title: `Payment Due: ${invoice.invoice_number}`,
        description: daysOverdue > 0 
          ? `Payment overdue by ${daysOverdue} days` 
          : `Payment due in ${Math.abs(daysOverdue)} days`,
        contact_name: invoice.contacts?.name,
        company_name: invoice.contacts?.company,
        amount: outstanding,
        sla_hours: 720,
        created_at: invoice.issue_date || new Date().toISOString(),
        reminder_count: 0,
      });
    });

    // License activation reminders
    deals
      .filter((deal: any) => deal.closed_won_substage === "get_license")
      .forEach((deal: any) => {
        reminders.push({
          id: `license-${deal.id}`,
          type: "license",
          entity_id: deal.id,
          entity_type: "deal",
          due_date: addDays(new Date(), 1).toISOString(),
          status: "pending",
          title: `License Activation: ${deal.title}`,
          description: "License key needs to be obtained and delivered",
          contact_name: deal.contacts?.name,
          company_name: deal.contacts?.company,
          amount: deal.value,
          sla_hours: 24,
          created_at: new Date().toISOString(),
          reminder_count: 0,
        });
      });

    // Invoice generation reminders
    deals
      .filter((deal: any) => deal.closed_won_substage === "raise_invoice")
      .forEach((deal: any) => {
        reminders.push({
          id: `invoice-${deal.id}`,
          type: "invoice",
          entity_id: deal.id,
          entity_type: "deal",
          due_date: addDays(new Date(), 1).toISOString(),
          status: "pending",
          title: `Generate Invoice: ${deal.title}`,
          description: "Invoice needs to be generated and sent",
          contact_name: deal.contacts?.name,
          company_name: deal.contacts?.company,
          amount: deal.value,
          sla_hours: 24,
          created_at: new Date().toISOString(),
          reminder_count: 0,
        });
      });

    return reminders;
  };

  const reminders = generateReminders();

  const getStatusColor = (status: ReminderStatus) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "acknowledged":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    }
  };

  const getPriorityLevel = (reminder: Reminder): "critical" | "high" | "medium" | "low" => {
    const daysTodue = differenceInDays(new Date(reminder.due_date), new Date());
    if (daysTodue < 0) return "critical";
    if (daysTodue === 0) return "high";
    if (daysTodue <= 2) return "medium";
    return "low";
  };

  const filteredReminders = reminders.filter((reminder) => {
    if (activeTab !== "all" && reminder.type !== activeTab) return false;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        reminder.title.toLowerCase().includes(searchLower) ||
        reminder.contact_name?.toLowerCase().includes(searchLower) ||
        reminder.company_name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const reminderStats = SLA_CONFIGS.reduce((acc, config) => {
    const typeReminders = reminders.filter((r) => r.type === config.type);
    acc[config.type] = {
      total: typeReminders.length,
      overdue: typeReminders.filter((r) => r.status === "overdue").length,
      pending: typeReminders.filter((r) => r.status === "pending").length,
    };
    return acc;
  }, {} as Record<string, { total: number; overdue: number; pending: number }>);

  const totalOverdue = reminders.filter((r) => r.status === "overdue").length;
  const dueToday = reminders.filter((r) => isToday(new Date(r.due_date))).length;

  const sendReminder = async (reminder: Reminder) => {
    toast.success(`Reminder sent for: ${reminder.title}`);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reminders</p>
                <p className="text-2xl font-bold">{reminders.length}</p>
              </div>
              <Bell className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{totalOverdue}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Due Today</p>
                <p className="text-2xl font-bold text-yellow-600">{dueToday}</p>
              </div>
              <Timer className="w-8 h-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {reminders.filter((r) => r.status === "completed").length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Config Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {SLA_CONFIGS.map((config) => (
          <Card
            key={config.type}
            className={`cursor-pointer transition-all hover:shadow-md ${
              activeTab === config.type ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setActiveTab(config.type)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <config.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium">{config.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-lg font-bold">{reminderStats[config.type]?.total || 0}</span>
                {(reminderStats[config.type]?.overdue || 0) > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {reminderStats[config.type].overdue} overdue
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                SLA: {config.defaultSLAHours}h
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search reminders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => setActiveTab("all")}>
          Show All
        </Button>
      </div>

      {/* Reminders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Reminders & SLA Tracking</CardTitle>
          <CardDescription>
            Monitor all pending tasks and their SLA status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReminders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No active reminders</p>
              <p className="text-sm">All tasks are up to date</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Company / Contact</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReminders.map((reminder) => {
                  const config = SLA_CONFIGS.find((c) => c.type === reminder.type);
                  const Icon = config?.icon || Bell;
                  const priority = getPriorityLevel(reminder);
                  const daysTodue = differenceInDays(new Date(reminder.due_date), new Date());

                  return (
                    <TableRow key={reminder.id} className={priority === "critical" ? "bg-red-50 dark:bg-red-900/10" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary" />
                          <span className="text-sm">{config?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{reminder.title}</p>
                          <p className="text-xs text-muted-foreground">{reminder.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{reminder.company_name || "-"}</p>
                          <p className="text-xs text-muted-foreground">{reminder.contact_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p>{format(new Date(reminder.due_date), "MMM d, yyyy")}</p>
                            <p className={`text-xs ${daysTodue < 0 ? "text-red-600" : daysTodue === 0 ? "text-yellow-600" : "text-muted-foreground"}`}>
                              {daysTodue < 0 
                                ? `${Math.abs(daysTodue)} days overdue` 
                                : daysTodue === 0 
                                ? "Due today" 
                                : `${daysTodue} days left`}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{reminder.sla_hours}h</Badge>
                      </TableCell>
                      <TableCell>
                        {reminder.amount ? formatCurrency(reminder.amount) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(reminder.status)}>
                          {reminder.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => sendReminder(reminder)}
                            title="Send Reminder"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toast.success("Marked as complete")}
                            title="Mark Complete"
                          >
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
