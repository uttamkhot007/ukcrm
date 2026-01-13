import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Building2,
  Calendar,
  Loader2,
  DollarSign,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface RenewalCustomer {
  id: string;
  deal_id: string;
  delivery_type: string;
  status: string;
  renewal_date: string | null;
  support_contract_start: string | null;
  support_contract_end: string | null;
  notes: string | null;
  created_at: string;
  deals?: {
    title: string;
    value: number;
    organization_name: string | null;
    contacts?: {
      name: string;
      company: string | null;
      email: string | null;
    };
  };
}

export function RenewalCustomersView() {
  const { currentTenant } = useTenant();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<RenewalCustomer | null>(null);

  // Fetch customers from customer_deliveries that have renewal dates
  const { data: customers, isLoading } = useQuery({
    queryKey: ["renewal-customers", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_deliveries")
        .select(`
          *,
          deals:deal_id (
            title,
            value,
            organization_name,
            contacts:contact_id (name, company, email)
          )
        `)
        .eq("tenant_id", currentTenant?.id)
        .not("renewal_date", "is", null)
        .order("renewal_date", { ascending: true });

      if (error) throw error;
      return data as RenewalCustomer[];
    },
    enabled: !!currentTenant?.id,
  });

  const getStatusBadge = (customer: RenewalCustomer) => {
    if (!customer.renewal_date) {
      return <Badge variant="secondary">No Renewal Date</Badge>;
    }

    const daysRemaining = differenceInDays(new Date(customer.renewal_date), new Date());

    if (daysRemaining < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (daysRemaining <= 30) {
      return <Badge className="bg-orange-500">Due Soon</Badge>;
    }
    if (daysRemaining <= 60) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Upcoming</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const filteredCustomers = customers?.filter((c) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      c.deals?.title?.toLowerCase().includes(searchLower) ||
      c.deals?.organization_name?.toLowerCase().includes(searchLower) ||
      c.deals?.contacts?.name?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: customers?.length || 0,
    dueSoon: customers?.filter(c => {
      if (!c.renewal_date) return false;
      const days = differenceInDays(new Date(c.renewal_date), new Date());
      return days >= 0 && days <= 30;
    }).length || 0,
    overdue: customers?.filter(c => {
      if (!c.renewal_date) return false;
      return differenceInDays(new Date(c.renewal_date), new Date()) < 0;
    }).length || 0,
    upcoming: customers?.filter(c => {
      if (!c.renewal_date) return false;
      const days = differenceInDays(new Date(c.renewal_date), new Date());
      return days > 30 && days <= 60;
    }).length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
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
                <div className="text-2xl font-bold">{stats.dueSoon}</div>
                <p className="text-sm text-muted-foreground">Due in 30 Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.overdue}</div>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Calendar className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.upcoming}</div>
                <p className="text-sm text-muted-foreground">31-60 Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Renewal Customers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead>Renewal Date</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers?.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {customer.deals?.organization_name || customer.deals?.contacts?.company}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {customer.deals?.contacts?.name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{customer.deals?.title}</div>
                  </TableCell>
                  <TableCell>
                    {customer.renewal_date ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(customer.renewal_date), "MMM d, yyyy")}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      ₹{customer.deals?.value?.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(customer)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredCustomers || filteredCustomers.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No renewal customers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Details Sheet */}
      <Sheet open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <SheetContent className="w-[500px]">
          {selectedCustomer && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selectedCustomer.deals?.organization_name || selectedCustomer.deals?.contacts?.company}
                </SheetTitle>
                <SheetDescription>{selectedCustomer.deals?.title}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Renewal Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Renewal Date:</span>
                      <span className="font-medium">
                        {selectedCustomer.renewal_date
                          ? format(new Date(selectedCustomer.renewal_date), "MMM d, yyyy")
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deal Value:</span>
                      <span className="font-medium">
                        ₹{selectedCustomer.deals?.value?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(selectedCustomer)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{selectedCustomer.deals?.contacts?.name || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{selectedCustomer.deals?.contacts?.email || "-"}</span>
                    </div>
                  </CardContent>
                </Card>

                {selectedCustomer.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedCustomer.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
