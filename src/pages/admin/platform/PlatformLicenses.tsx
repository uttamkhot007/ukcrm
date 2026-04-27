import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, KeyRound, TrendingUp, Users, AlertCircle, Plus, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Plan {
  id: string;
  key: string;
  name: string;
  price_monthly: number;
  seat_cap: number | null;
  trial_days: number;
  is_active: boolean;
}

interface TenantLicense {
  tenant_id: string;
  plan_id: string | null;
  status: string;
  seats_licensed: number;
  trial_ends_at: string | null;
  renews_at: string | null;
  payment_status: string;
  notes: string | null;
}

interface TenantRow {
  id: string;
  name: string;
  tier: string;
  seatsUsed: number;
  license: TenantLicense | null;
}

export default function PlatformLicenses() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TenantRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: plansData }, { data: tenantsData }, { data: licData }, { data: members }] = await Promise.all([
        supabase.from("license_plans").select("*").order("sort_order"),
        supabase.from("tenants").select("id, name, tier"),
        supabase.from("tenant_licenses").select("*"),
        supabase.from("tenant_members").select("tenant_id, user_id").eq("status", "active"),
      ]);

      const seatCount = new Map<string, number>();
      (members || []).forEach((m: any) => seatCount.set(m.tenant_id, (seatCount.get(m.tenant_id) || 0) + 1));
      const licMap = new Map((licData || []).map((l: any) => [l.tenant_id, l]));

      setPlans(plansData || []);
      setTenants(
        (tenantsData || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          tier: t.tier,
          seatsUsed: seatCount.get(t.id) || 0,
          license: licMap.get(t.id) || null,
        })),
      );
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load license data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const mrr = tenants.reduce((sum, t) => {
      const plan = plans.find((p) => p.id === t.license?.plan_id);
      return sum + (plan?.price_monthly || 0);
    }, 0);
    const trial = tenants.filter((t) => t.license?.status === "trial").length;
    const overage = tenants.filter((t) => t.license && t.seatsUsed > t.license.seats_licensed).length;
    return { mrr, trial, overage, totalSeats: tenants.reduce((s, t) => s + t.seatsUsed, 0) };
  }, [tenants, plans]);

  const updateLicense = async (tenantId: string, patch: Partial<TenantLicense>) => {
    try {
      const existing = tenants.find((t) => t.id === tenantId)?.license;
      if (existing) {
        const { error } = await supabase.from("tenant_licenses").update(patch as any).eq("tenant_id", tenantId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenant_licenses").insert({ tenant_id: tenantId, ...patch } as any);
        if (error) throw error;
      }
      toast.success("License updated");
      load();
      if (selected?.id === tenantId) {
        const fresh = tenants.find((t) => t.id === tenantId);
        if (fresh) setSelected({ ...fresh, license: { ...(existing as any), ...patch, tenant_id: tenantId } });
      }
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">License Management</h2>
        <p className="text-sm text-muted-foreground">
          Plans, seats, renewals and entitlements for every tenant. Distinct from per-tenant module toggles.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Estimated MRR" value={`$${stats.mrr.toLocaleString()}`} />
        <StatCard icon={Users} label="Total Active Seats" value={stats.totalSeats.toString()} />
        <StatCard icon={CalendarClock} label="On Trial" value={stats.trial.toString()} accent="text-blue-500" />
        <StatCard icon={AlertCircle} label="Seat Overages" value={stats.overage.toString()} accent="text-amber-500" />
      </div>

      <Tabs defaultValue="tenants">
        <TabsList>
          <TabsTrigger value="tenants">Tenant Licenses</TabsTrigger>
          <TabsTrigger value="plans">Plan Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Renews</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((t) => {
                      const plan = plans.find((p) => p.id === t.license?.plan_id);
                      const overage = t.license && t.seatsUsed > t.license.seats_licensed;
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>{plan?.name || <span className="text-muted-foreground italic">unassigned</span>}</TableCell>
                          <TableCell>
                            <Badge variant={t.license?.status === "active" ? "default" : "outline"}>
                              {t.license?.status || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={overage ? "text-amber-500 font-medium" : ""}>
                              {t.seatsUsed} / {t.license?.seats_licensed ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {t.license?.renews_at ? format(new Date(t.license.renews_at), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{t.license?.payment_status || "na"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => setSelected(t)}>Manage</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="mt-4 space-y-3">
          {plans.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <span className="font-semibold">{p.name}</span>
                    <Badge variant="outline" className="text-xs">{p.key}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${p.price_monthly}/mo · {p.seat_cap ? `${p.seat_cap} seats` : "unlimited seats"} · {p.trial_days}-day trial
                  </p>
                </div>
                <Badge variant={p.is_active ? "default" : "outline"}>{p.is_active ? "Active" : "Inactive"}</Badge>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground">
            Plan catalog editing UI coming next iteration. Seeded plans are mapped to existing tenant tiers.
          </p>
        </TabsContent>
      </Tabs>

      {/* Tenant license detail */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{selected?.name}</SheetTitle>
            <SheetDescription>License & subscription</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-4">
              <div>
                <Label>Plan</Label>
                <Select
                  value={selected.license?.plan_id || ""}
                  onValueChange={(v) => updateLicense(selected.id, { plan_id: v })}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} (${p.price_monthly}/mo)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={selected.license?.status || "trial"}
                  onValueChange={(v) => updateLicense(selected.id, { status: v as any })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["trial", "active", "past_due", "suspended", "cancelled"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Seats Licensed</Label>
                <Input
                  type="number"
                  className="mt-1"
                  defaultValue={selected.license?.seats_licensed ?? 5}
                  onBlur={(e) => updateLicense(selected.id, { seats_licensed: parseInt(e.target.value, 10) || 0 })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {selected.seatsUsed} active member(s) currently using seats
                </p>
              </div>
              <div>
                <Label>Renews At</Label>
                <Input
                  type="date"
                  className="mt-1"
                  defaultValue={selected.license?.renews_at?.slice(0, 10) || ""}
                  onBlur={(e) => updateLicense(selected.id, { renews_at: e.target.value || null })}
                />
              </div>
              <div>
                <Label>Payment Status</Label>
                <Select
                  value={selected.license?.payment_status || "na"}
                  onValueChange={(v) => updateLicense(selected.id, { payment_status: v as any })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["paid", "pending", "failed", "na"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${accent || "text-primary"}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
