import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Headphones,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  User,
  Building2,
  Calendar,
  Loader2,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface CustomerDelivery {
  id: string;
  deal_id: string;
  contact_id: string | null;
  alliance_organization_id: string | null;
  delivery_type: string;
  status: string;
  support_portal_access: boolean;
  support_portal_user_created: boolean;
  support_contract_start: string | null;
  support_contract_end: string | null;
  notes: string | null;
  delivered_at: string | null;
  created_at: string;
  deals?: {
    title: string;
    value: number;
    organization_name: string | null;
    contacts?: {
      name: string;
      company: string | null;
      email: string | null;
      phone: string | null;
    };
  };
  alliance_organizations?: {
    name: string;
  };
}

export function TechnicalCustomersView() {
  const { currentTenant } = useTenant();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDelivery | null>(null);

  // Fetch customers with support delivery (from post-sale workflows)
  const { data: customers, isLoading } = useQuery({
    queryKey: ["technical-customers", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_deliveries")
        .select(`
          *,
          deals:deal_id (
            title,
            value,
            organization_name,
            contacts:contact_id (name, company, email, phone)
          ),
          alliance_organizations:alliance_organization_id (name)
        `)
        .eq("tenant_id", currentTenant?.id)
        .eq("delivery_type", "support_access")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CustomerDelivery[];
    },
    enabled: !!currentTenant?.id,
  });

  const getStatusBadge = (customer: CustomerDelivery) => {
    if (!customer.support_contract_end) {
      return <Badge variant="secondary">No Contract End Date</Badge>;
    }

    const daysRemaining = differenceInDays(new Date(customer.support_contract_end), new Date());

    if (daysRemaining < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (daysRemaining <= 30) {
      return <Badge className="bg-orange-500">Expiring Soon</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const filteredCustomers = customers?.filter((c) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      c.deals?.title?.toLowerCase().includes(searchLower) ||
      c.deals?.organization_name?.toLowerCase().includes(searchLower) ||
      c.deals?.contacts?.name?.toLowerCase().includes(searchLower) ||
      c.deals?.contacts?.company?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: customers?.length || 0,
    active: customers?.filter(c => {
      if (!c.support_contract_end) return true;
      return differenceInDays(new Date(c.support_contract_end), new Date()) >= 0;
    }).length || 0,
    portalAccess: customers?.filter(c => c.support_portal_access).length || 0,
    expiringSoon: customers?.filter(c => {
      if (!c.support_contract_end) return false;
      const days = differenceInDays(new Date(c.support_contract_end), new Date());
      return days >= 0 && days <= 30;
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
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
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
                <div className="text-2xl font-bold">{stats.active}</div>
                <p className="text-sm text-muted-foreground">Active Contracts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Headphones className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.portalAccess}</div>
                <p className="text-sm text-muted-foreground">Portal Access</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.expiringSoon}</div>
                <p className="text-sm text-muted-foreground">Expiring (30 days)</p>
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
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead>Contract Period</TableHead>
                <TableHead>Portal Access</TableHead>
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
                    <div>
                      <div className="font-medium">{customer.deals?.title}</div>
                      <div className="text-sm text-muted-foreground">
                        ₹{customer.deals?.value?.toLocaleString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.support_contract_start && customer.support_contract_end ? (
                      <div className="text-sm">
                        <div>{format(new Date(customer.support_contract_start), "MMM d, yyyy")}</div>
                        <div className="text-muted-foreground">
                          to {format(new Date(customer.support_contract_end), "MMM d, yyyy")}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.support_portal_access ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Not Created</Badge>
                    )}
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
                    No customers with support contracts found
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
                    <CardTitle className="text-sm">Contact Information</CardTitle>
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{selectedCustomer.deals?.contacts?.phone || "-"}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Support Contract</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start Date:</span>
                      <span className="font-medium">
                        {selectedCustomer.support_contract_start
                          ? format(new Date(selectedCustomer.support_contract_start), "MMM d, yyyy")
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End Date:</span>
                      <span className="font-medium">
                        {selectedCustomer.support_contract_end
                          ? format(new Date(selectedCustomer.support_contract_end), "MMM d, yyyy")
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Portal Access:</span>
                      {selectedCustomer.support_portal_access ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Created</Badge>
                      )}
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
