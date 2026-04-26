import { useEffect, useState } from "react";
import { restRequest } from "@/integrations/api/rest-client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ShieldCheck } from "lucide-react";

interface AuthorizedDomain {
  id: string;
  domain: string;
  tenant_id: string | null;
  tenant_name?: string | null;
  tenant_slug?: string | null;
  default_role: "user" | "admin";
  enabled: boolean;
  notes?: string | null;
  created_at: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export default function AdminAuthorizedDomains() {
  const { isSuperAdmin } = useTenant();
  const { toast } = useToast();
  const [rows, setRows] = useState<AuthorizedDomain[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [domain, setDomain] = useState("");
  const [tenantId, setTenantId] = useState<string>("__none__");
  const [defaultRole, setDefaultRole] = useState<"user" | "admin">("user");
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [d, t] = await Promise.all([
        restRequest<AuthorizedDomain[]>("/api/admin/authorized-domains"),
        isSuperAdmin
          ? restRequest<Tenant[]>("/api/tenants?select=id,name,slug&limit=500")
          : Promise.resolve([] as Tenant[]),
      ]);
      setRows(Array.isArray(d) ? d : []);
      setTenants(Array.isArray(t) ? t : []);
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isSuperAdmin]);

  // Same regex as backend zod schema (exact OR leftmost wildcard).
  const DOMAIN_RE = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

  function normalizeDomain(input: string): string {
    return input.trim().toLowerCase().replace(/^@/, "");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = normalizeDomain(domain);
    if (!cleaned) return;
    if (!DOMAIN_RE.test(cleaned)) {
      toast({
        title: "Invalid domain",
        description: 'Use "acme.com" or wildcard "*.acme.com".',
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      await restRequest("/api/admin/authorized-domains", {
        method: "POST",
        body: {
          domain: cleaned,
          tenant_id: tenantId === "__none__" ? null : tenantId,
          default_role: defaultRole,
          notes: notes || undefined,
          enabled: true,
        },
      });
      toast({ title: "Domain authorized" });
      setDomain(""); setNotes(""); setDefaultRole("user"); setTenantId("__none__");
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleEnabled(row: AuthorizedDomain) {
    try {
      await restRequest(`/api/admin/authorized-domains/${row.id}`, {
        method: "PATCH",
        body: { enabled: !row.enabled },
      });
      setRows((r) => r.map((x) => (x.id === row.id ? { ...x, enabled: !row.enabled } : x)));
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  async function changeRole(row: AuthorizedDomain, role: "user" | "admin") {
    try {
      await restRequest(`/api/admin/authorized-domains/${row.id}`, {
        method: "PATCH",
        body: { default_role: role },
      });
      setRows((r) => r.map((x) => (x.id === row.id ? { ...x, default_role: role } : x)));
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  async function remove(row: AuthorizedDomain) {
    if (!confirm(`Remove "${row.domain}"? Users with this domain will no longer be able to sign up.`)) return;
    try {
      await restRequest(`/api/admin/authorized-domains/${row.id}`, { method: "DELETE" });
      setRows((r) => r.filter((x) => x.id !== row.id));
      toast({ title: "Removed" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Authorized Email Domains</h1>
          <p className="text-sm text-muted-foreground">
            Strict allowlist — only emails matching an enabled domain below can self-register.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Domain</CardTitle>
          <CardDescription>
            {isSuperAdmin
              ? "As super admin you can scope a domain to a specific tenant or leave it global."
              : "New domains will be scoped to your tenant only."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-4">
              <Label htmlFor="domain">Email domain</Label>
              <Input
                id="domain"
                placeholder="acme.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
              />
            </div>

            {isSuperAdmin && (
              <div className="md:col-span-3">
                <Label>Tenant</Label>
                <Select value={tenantId} onValueChange={setTenantId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Global (any tenant)</SelectItem>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.slug})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="md:col-span-2">
              <Label>Default role</Label>
              <Select value={defaultRole} onValueChange={(v) => setDefaultRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Tenant Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={isSuperAdmin ? "md:col-span-3" : "md:col-span-6"}>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="e.g. Acme Corp HQ"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="md:col-span-12 flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Authorize
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authorized Domains</CardTitle>
          <CardDescription>{rows.length} entr{rows.length === 1 ? "y" : "ies"}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No authorized domains yet. Until you add one, signup is blocked for everyone.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Default role</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono">@{row.domain}</TableCell>
                    <TableCell>
                      {row.tenant_name ? (
                        <Badge variant="secondary">{row.tenant_name}</Badge>
                      ) : (
                        <Badge>Global</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select value={row.default_role} onValueChange={(v) => changeRole(row, v as any)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Tenant Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch checked={row.enabled} onCheckedChange={() => toggleEnabled(row)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{row.notes}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => remove(row)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• When someone signs up, the backend rejects their request unless their email's domain matches an enabled entry above.</p>
          <p>• If the matched entry is scoped to a tenant, the new user is automatically added to that tenant.</p>
          <p>• <strong>Default role = "Tenant Admin"</strong> means anyone signing up with that domain becomes an admin of the scoped tenant. Use sparingly.</p>
          <p>• Disabling an entry stops new signups but does not remove existing users.</p>
        </CardContent>
      </Card>
    </div>
  );
}
