import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  RefreshCw,
  Plus,
  Search,
  Calendar,
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
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";

type RenewalType = "contract" | "license" | "subscription" | "certification" | "insurance" | "domain";
type RenewalStatus = "active" | "expiring_soon" | "expired" | "renewed";

interface Renewal {
  id: string;
  name: string;
  type: RenewalType;
  status: RenewalStatus;
  vendor: string;
  startDate: Date;
  expiryDate: Date;
  cost: number;
  autoRenew: boolean;
  reminderDays: number;
  notes?: string;
  assignedTo?: string;
}

// Mock data
const mockRenewals: Renewal[] = [
  {
    id: "1",
    name: "Microsoft 365 Enterprise",
    type: "license",
    status: "active",
    vendor: "Microsoft",
    startDate: new Date("2024-01-01"),
    expiryDate: new Date("2025-01-01"),
    cost: 15000,
    autoRenew: true,
    reminderDays: 30,
    assignedTo: "IT Team",
  },
  {
    id: "2",
    name: "Cloud Hosting - AWS",
    type: "subscription",
    status: "expiring_soon",
    vendor: "Amazon Web Services",
    startDate: new Date("2024-01-15"),
    expiryDate: addDays(new Date(), 15),
    cost: 50000,
    autoRenew: false,
    reminderDays: 45,
    assignedTo: "DevOps Team",
  },
  {
    id: "3",
    name: "Vendor Service Contract - TechCorp",
    type: "contract",
    status: "expiring_soon",
    vendor: "TechCorp Solutions",
    startDate: new Date("2023-06-01"),
    expiryDate: addDays(new Date(), 7),
    cost: 120000,
    autoRenew: false,
    reminderDays: 60,
    assignedTo: "Procurement",
  },
  {
    id: "4",
    name: "ISO 27001 Certification",
    type: "certification",
    status: "active",
    vendor: "BSI Group",
    startDate: new Date("2024-03-01"),
    expiryDate: new Date("2027-03-01"),
    cost: 25000,
    autoRenew: false,
    reminderDays: 90,
    assignedTo: "Compliance Team",
  },
  {
    id: "5",
    name: "Business Insurance Policy",
    type: "insurance",
    status: "active",
    vendor: "Allianz",
    startDate: new Date("2024-02-01"),
    expiryDate: new Date("2025-02-01"),
    cost: 45000,
    autoRenew: true,
    reminderDays: 30,
    assignedTo: "Finance Team",
  },
  {
    id: "6",
    name: "Domain - company.com",
    type: "domain",
    status: "expired",
    vendor: "GoDaddy",
    startDate: new Date("2022-01-01"),
    expiryDate: new Date("2024-01-01"),
    cost: 500,
    autoRenew: false,
    reminderDays: 30,
    assignedTo: "IT Team",
  },
];

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
  if (status === "expired") {
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Expired</Badge>;
  }
  if (status === "renewed") {
    return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />Renewed</Badge>;
  }
  if (daysUntilExpiry <= 7) {
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Critical</Badge>;
  }
  if (daysUntilExpiry <= 30) {
    return <Badge variant="outline" className="gap-1 border-orange-500 text-orange-500"><Clock className="w-3 h-3" />Expiring Soon</Badge>;
  }
  return <Badge variant="secondary" className="gap-1"><CheckCircle className="w-3 h-3" />Active</Badge>;
};

export function RenewalsModule() {
  const [renewals, setRenewals] = useState<Renewal[]>(mockRenewals);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const today = new Date();

  const getFilteredRenewals = () => {
    return renewals.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.vendor.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || r.type === typeFilter;
      const daysUntilExpiry = differenceInDays(r.expiryDate, today);

      let matchesTab = true;
      if (activeTab === "expiring") matchesTab = daysUntilExpiry > 0 && daysUntilExpiry <= 30;
      if (activeTab === "expired") matchesTab = daysUntilExpiry < 0;
      if (activeTab === "upcoming") matchesTab = daysUntilExpiry > 30;

      return matchesSearch && matchesType && matchesTab;
    });
  };

  const filteredRenewals = getFilteredRenewals();

  const stats = {
    total: renewals.length,
    expiringSoon: renewals.filter((r) => {
      const days = differenceInDays(r.expiryDate, today);
      return days > 0 && days <= 30;
    }).length,
    expired: renewals.filter((r) => differenceInDays(r.expiryDate, today) < 0).length,
    totalCost: renewals.reduce((sum, r) => sum + r.cost, 0),
  };

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
                <label className="text-sm font-medium">Name</label>
                <Input placeholder="e.g., Microsoft 365 License" />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select>
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
                <Input placeholder="Vendor name" />
              </div>
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" />
              </div>
              <div>
                <label className="text-sm font-medium">Expiry Date</label>
                <Input type="date" />
              </div>
              <div>
                <label className="text-sm font-medium">Cost (₹)</label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium">Reminder (Days Before)</label>
                <Input type="number" placeholder="30" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Assigned To</label>
                <Input placeholder="Team or person responsible" />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>Add Renewal</Button>
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
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
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
                <p className="text-2xl font-bold">₹{(stats.totalCost / 100000).toFixed(1)}L</p>
                <p className="text-sm text-muted-foreground">Total Annual Cost</p>
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

        <TabsContent value={activeTab} className="mt-4">
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
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRenewals.map((renewal) => {
                    const daysUntilExpiry = differenceInDays(renewal.expiryDate, today);
                    const TypeIcon = getTypeIcon(renewal.type);
                    return (
                      <TableRow key={renewal.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getTypeColor(renewal.type)}`}>
                              <TypeIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium">{renewal.name}</p>
                              {renewal.autoRenew && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3" /> Auto-renew enabled
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(renewal.type)}`}>
                            {renewal.type}
                          </span>
                        </TableCell>
                        <TableCell>{renewal.vendor}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-muted-foreground" />
                            <span>{format(renewal.expiryDate, "MMM d, yyyy")}</span>
                            {daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
                              <span className="text-xs text-orange-500">({daysUntilExpiry}d left)</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(renewal.status, daysUntilExpiry)}</TableCell>
                        <TableCell>₹{renewal.cost.toLocaleString()}</TableCell>
                        <TableCell>{renewal.assignedTo || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Bell className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
