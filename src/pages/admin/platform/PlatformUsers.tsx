import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Users, ShieldCheck, UserX, AlertTriangle, Crown } from "lucide-react";
import { toast } from "sonner";

type Filter = "all" | "super_admins" | "multi_tenant" | "orphaned";

interface PlatformUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_super_admin: boolean;
  memberships: { tenant_id: string; tenant_name: string; role: string }[];
}

export default function PlatformUsers() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: profiles }, { data: members }, { data: tenants }] = await Promise.all([
        supabase.from("profiles").select("user_id, email, full_name, is_super_admin"),
        supabase.from("tenant_members").select("user_id, tenant_id, role, status").eq("status", "active"),
        supabase.from("tenants").select("id, name"),
      ]);

      const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t.name]));
      const membershipMap = new Map<string, PlatformUser["memberships"]>();
      (members || []).forEach((m: any) => {
        const arr = membershipMap.get(m.user_id) || [];
        arr.push({
          tenant_id: m.tenant_id,
          tenant_name: tenantMap.get(m.tenant_id) || "Unknown",
          role: m.role,
        });
        membershipMap.set(m.user_id, arr);
      });

      const list: PlatformUser[] = (profiles || []).map((p: any) => ({
        user_id: p.user_id,
        email: p.email,
        full_name: p.full_name,
        is_super_admin: !!p.is_super_admin,
        memberships: membershipMap.get(p.user_id) || [],
      }));

      setUsers(list);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      if (q) {
        const hay = `${u.email || ""} ${u.full_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "super_admins" && !u.is_super_admin) return false;
      if (filter === "multi_tenant" && u.memberships.length < 2) return false;
      if (filter === "orphaned" && u.memberships.length > 0) return false;
      return true;
    });
  }, [users, search, filter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      superAdmins: users.filter((u) => u.is_super_admin).length,
      multiTenant: users.filter((u) => u.memberships.length >= 2).length,
      orphaned: users.filter((u) => u.memberships.length === 0).length,
    }),
    [users],
  );

  const toggleSuperAdmin = async (user: PlatformUser) => {
    const next = !user.is_super_admin;
    if (next && !confirm(`Promote ${user.email} to super admin? They will have access to all tenants and the Platform Console.`)) return;
    if (!next && !confirm(`Revoke super admin from ${user.email}?`)) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_super_admin: next })
        .eq("user_id", user.user_id);
      if (error) throw error;
      toast.success(next ? "Promoted to super admin" : "Super admin revoked");
      load();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Update failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Cross-Tenant User Management</h2>
        <p className="text-sm text-muted-foreground">
          Global directory of every user across every tenant. Promote super admins, find orphaned accounts, audit memberships.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Users" value={stats.total} />
        <StatCard icon={Crown} label="Super Admins" value={stats.superAdmins} accent="text-purple-500" />
        <StatCard icon={ShieldCheck} label="Multi-Tenant" value={stats.multiTenant} accent="text-blue-500" />
        <StatCard icon={AlertTriangle} label="Orphaned" value={stats.orphaned} accent="text-amber-500" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by email or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="super_admins">Super Admins</TabsTrigger>
            <TabsTrigger value="multi_tenant">Multi-Tenant</TabsTrigger>
            <TabsTrigger value="orphaned">Orphaned</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserX className="mx-auto w-10 h-10 mb-2" />
              No users match this filter
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Tenants</TableHead>
                  <TableHead className="w-[140px]">Super Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div className="font-medium">{u.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      {u.memberships.length === 0 ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-500/40">No tenant</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.memberships.map((m) => (
                            <Badge key={m.tenant_id} variant="secondary" className="text-xs">
                              {m.tenant_name} <span className="opacity-60 ml-1">· {m.role}</span>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={u.is_super_admin} onCheckedChange={() => toggleSuperAdmin(u)} />
                        {u.is_super_admin && <Crown className="w-4 h-4 text-purple-500" />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${accent || "text-primary"}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
