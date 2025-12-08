import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AllianceOrgProfilePage } from "@/components/admin/AllianceOrgProfilePage";
import { OrgAccountMetrics } from "@/components/admin/OrgAccountMetrics";
import {
  Building2,
  Search,
  Users,
  Loader2,
  ExternalLink,
  TrendingUp,
  Award,
  ChevronRight,
  Globe,
  Phone,
  Mail,
} from "lucide-react";
import { format } from "date-fns";

interface AllianceOrganization {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  status: string | null;
  organization_type: string | null;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  created_at: string;
  account_manager_id: string | null;
  technical_account_manager_id: string | null;
  tenant_id: string | null;
  solutions: string[] | null;
  services: string[] | null;
  security_controls: string[] | null;
  solution_configs: any;
  infrastructure_config: any;
  team_config: any;
  created_by: string;
  updated_at: string;
}

export function MyAccountsView() {
  const [search, setSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<AllianceOrganization | null>(null);
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  // Fetch organizations where user is account manager or technical account manager
  const { data: myOrganizations, isLoading } = useQuery({
    queryKey: ["my-accounts", user?.id, currentTenant?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("alliance_organizations")
        .select("*")
        .or(`account_manager_id.eq.${user.id},technical_account_manager_id.eq.${user.id}`)
        .order("name");
      if (error) throw error;
      return data as AllianceOrganization[];
    },
    enabled: !!user?.id,
  });

  // Fetch contacts count for each organization
  const { data: contactCounts } = useQuery({
    queryKey: ["my-accounts-contacts", myOrganizations?.map(o => o.id)],
    queryFn: async () => {
      if (!myOrganizations?.length) return {};
      const counts: Record<string, number> = {};
      for (const org of myOrganizations) {
        const { count } = await supabase
          .from("alliance_users")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id);
        counts[org.id] = count || 0;
      }
      return counts;
    },
    enabled: !!myOrganizations?.length,
  });

  // Fetch deals count for each organization
  const { data: dealCounts } = useQuery({
    queryKey: ["my-accounts-deals", myOrganizations?.map(o => o.id)],
    queryFn: async () => {
      if (!myOrganizations?.length) return {};
      const counts: Record<string, { total: number; won: number; value: number }> = {};
      
      for (const org of myOrganizations) {
        // Get contacts linked to this org
        const { data: contacts } = await supabase
          .from("contacts")
          .select("id")
          .eq("alliance_organization_id", org.id);
        
        if (contacts?.length) {
          const contactIds = contacts.map(c => c.id);
          const { data: deals } = await supabase
            .from("deals")
            .select("id, stage, value")
            .in("contact_id", contactIds);
          
          const wonDeals = deals?.filter(d => d.stage === "closed_won") || [];
          counts[org.id] = {
            total: deals?.length || 0,
            won: wonDeals.length,
            value: wonDeals.reduce((sum, d) => sum + (d.value || 0), 0),
          };
        } else {
          counts[org.id] = { total: 0, won: 0, value: 0 };
        }
      }
      return counts;
    },
    enabled: !!myOrganizations?.length,
  });

  const filteredOrganizations = myOrganizations?.filter(
    (org) =>
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.industry?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "active": return "default";
      case "inactive": return "secondary";
      case "prospect": return "outline";
      default: return "outline";
    }
  };

  const getOrgTypeBadgeVariant = (type: string | null) => {
    switch (type) {
      case "customer": return "default";
      case "partner": return "secondary";
      case "vendor": return "outline";
      case "distributor": return "outline";
      default: return "outline";
    }
  };

  const getTierBadge = (value: number) => {
    if (value >= 25000000) return { label: "Platinum", color: "bg-gradient-to-r from-slate-300 to-slate-500 text-slate-900" };
    if (value >= 10000000) return { label: "Diamond", color: "bg-gradient-to-r from-cyan-300 to-cyan-500 text-cyan-900" };
    if (value >= 5000000) return { label: "Gold", color: "bg-gradient-to-r from-amber-300 to-amber-500 text-amber-900" };
    if (value >= 2500000) return { label: "Silver", color: "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800" };
    return { label: "Bronze", color: "bg-gradient-to-r from-orange-300 to-orange-500 text-orange-900" };
  };

  if (selectedOrg) {
    return (
      <AllianceOrgProfilePage
        organization={selectedOrg}
        onBack={() => setSelectedOrg(null)}
      />
    );
  }

  const totalAccounts = myOrganizations?.length || 0;
  const activeAccounts = myOrganizations?.filter(o => o.status === "active").length || 0;
  const totalWonValue = Object.values(dealCounts || {}).reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">My Accounts</h2>
        <p className="text-muted-foreground">
          Organizations assigned to you as Account Manager or Technical Account Manager
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Accounts</p>
              <p className="text-2xl font-bold">{totalAccounts}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Accounts</p>
              <p className="text-2xl font-bold">{activeAccounts}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Contacts</p>
              <p className="text-2xl font-bold">
                {Object.values(contactCounts || {}).reduce((sum, c) => sum + c, 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Award className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Won Value</p>
              <p className="text-2xl font-bold">
                ₹{(totalWonValue / 100000).toFixed(1)}L
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Accounts List */}
      <Card className="glass border-border">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredOrganizations?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No accounts assigned</p>
            <p className="text-sm">You are not assigned as Account Manager to any organizations yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Deals</TableHead>
                <TableHead>Won Value</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations?.map((org) => {
                const deals = dealCounts?.[org.id] || { total: 0, won: 0, value: 0 };
                const tier = getTierBadge(deals.value);
                const isCustomerOrPartner = org.organization_type === "customer" || org.organization_type === "partner";
                
                return (
                  <TableRow
                    key={org.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedOrg(org)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {org.logo_url ? (
                          <img
                            src={org.logo_url}
                            alt={org.name}
                            className="w-8 h-8 rounded-lg object-contain bg-white"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{org.name}</p>
                          {org.website && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {org.website.replace(/^https?:\/\//, "").split("/")[0]}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getOrgTypeBadgeVariant(org.organization_type)}>
                        {org.organization_type || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>{org.industry || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Users className="w-3 h-3" />
                        {contactCounts?.[org.id] || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {deals.total} ({deals.won} won)
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        ₹{(deals.value / 100000).toFixed(1)}L
                      </span>
                    </TableCell>
                    <TableCell>
                      {isCustomerOrPartner && (
                        <Badge className={`${tier.color} border-0`}>
                          {tier.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(org.status)}>
                        {org.status || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}