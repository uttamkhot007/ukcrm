import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Building2,
  Loader2,
  Mail,
  Phone,
  UserCircle,
  ExternalLink,
} from "lucide-react";

export function CustomerContactsView() {
  const { currentTenant } = useTenant();
  const [searchQuery, setSearchQuery] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");

  // Fetch customer organizations
  const { data: organizations = [] } = useQuery({
    queryKey: ["customer-organizations", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alliance_organizations")
        .select("id, name")
        .eq("tenant_id", currentTenant!.id)
        .eq("organization_type", "customer")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all customer contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["customer-alliance-users", currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alliance_users")
        .select(`
          *,
          organization:alliance_organizations(id, name, organization_type)
        `)
        .eq("tenant_id", currentTenant!.id)
        .order("name");
      if (error) throw error;
      // Filter to only include contacts from customer organizations
      return data.filter((c) => c.organization?.organization_type === "customer");
    },
  });

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.organization?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOrg = orgFilter === "all" || contact.organization_id === orgFilter;
    return matchesSearch && matchesOrg;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
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
                <p className="text-2xl font-bold">{organizations.length}</p>
                <p className="text-sm text-muted-foreground">Customer Orgs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Mail className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {contacts.filter((c) => c.email).length}
                </p>
                <p className="text-sm text-muted-foreground">With Email</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={orgFilter} onValueChange={setOrgFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No contacts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          {contact.linkedin_url && (
                            <a
                              href={contact.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                            >
                              LinkedIn <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {contact.organization?.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{contact.designation || contact.role || "N/A"}</Badge>
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 text-sm hover:text-primary"
                        >
                          <Mail className="w-3 h-3" />
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.phone ? (
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1 text-sm hover:text-primary"
                        >
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{contact.location || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
