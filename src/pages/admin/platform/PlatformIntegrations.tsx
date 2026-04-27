import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Loader2, Plug, CreditCard, Mail, Activity, ShieldCheck, Server, Store, Settings } from "lucide-react";
import { toast } from "sonner";

interface PlatformIntegration {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  is_enabled: boolean;
  available_to_tenants: boolean;
  auto_enable_tier: string | null;
  config: any;
  health_status: string;
  last_synced_at: string | null;
}

const CATEGORY_META: Record<string, { icon: any; label: string }> = {
  billing: { icon: CreditCard, label: "Billing" },
  email: { icon: Mail, label: "Email" },
  monitoring: { icon: Activity, label: "Monitoring" },
  sso: { icon: ShieldCheck, label: "SSO / Identity" },
  infrastructure: { icon: Server, label: "Infrastructure" },
  marketplace: { icon: Store, label: "Marketplace" },
};

export default function PlatformIntegrations() {
  const [items, setItems] = useState<PlatformIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PlatformIntegration | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform_integrations")
        .select("*")
        .order("category");
      if (error) throw error;
      setItems(data || []);
    } catch (e: any) {
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (item: PlatformIntegration, field: "is_enabled" | "available_to_tenants") => {
    try {
      const { error } = await supabase
        .from("platform_integrations")
        .update({ [field]: !item[field] } as any)
        .eq("id", item.id);
      if (error) throw error;
      load();
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    }
  };

  const platformOnly = items.filter((i) => i.category !== "marketplace");
  const marketplace = items.filter((i) => i.category === "marketplace");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Platform Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Configured once at the platform level — different from per-tenant integrations under <em>Admin Center → Integrations</em>.
        </p>
      </div>

      <Tabs defaultValue="platform">
        <TabsList>
          <TabsTrigger value="platform">Platform-Only ({platformOnly.length})</TabsTrigger>
          <TabsTrigger value="marketplace">Tenant Marketplace ({marketplace.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="platform" className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            These integrations power the platform itself (billing, email, monitoring, SSO, infra). Tenants never see them.
          </p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            platformOnly.map((i) => <IntegrationRow key={i.id} item={i} onEdit={setSelected} onToggle={toggle} showAvailability={false} />)
          )}
        </TabsContent>

        <TabsContent value="marketplace" className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Curate which third-party integrations tenants can connect from their own Admin Center.
          </p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            marketplace.map((i) => <IntegrationRow key={i.id} item={i} onEdit={setSelected} onToggle={toggle} showAvailability />)
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{selected?.name}</SheetTitle>
            <SheetDescription>{selected?.description}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-4">
              <div>
                <Label>Integration Key</Label>
                <Input value={selected.key} disabled className="mt-1" />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={CATEGORY_META[selected.category]?.label || selected.category} disabled className="mt-1" />
              </div>
              <div>
                <Label>Health</Label>
                <Badge variant="outline" className="mt-1 ml-1">{selected.health_status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/40">
                Credential storage uses the platform secret vault. Use the Secrets manager to set values for keys like
                {" "}<code className="text-foreground">{selected.key.toUpperCase()}_API_KEY</code>.
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function IntegrationRow({
  item,
  onEdit,
  onToggle,
  showAvailability,
}: {
  item: PlatformIntegration;
  onEdit: (i: PlatformIntegration) => void;
  onToggle: (i: PlatformIntegration, f: "is_enabled" | "available_to_tenants") => void;
  showAvailability: boolean;
}) {
  const meta = CATEGORY_META[item.category] || { icon: Plug, label: item.category };
  const Icon = meta.icon;
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{item.name}</span>
            <Badge variant="outline" className="text-xs">{meta.label}</Badge>
            <Badge variant="outline" className={`text-xs ${item.health_status === "healthy" ? "text-green-500" : "text-muted-foreground"}`}>
              {item.health_status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex flex-col items-center text-xs">
            <Switch checked={item.is_enabled} onCheckedChange={() => onToggle(item, "is_enabled")} />
            <span className="text-[10px] text-muted-foreground mt-1">Enabled</span>
          </div>
          {showAvailability && (
            <div className="flex flex-col items-center text-xs">
              <Switch checked={item.available_to_tenants} onCheckedChange={() => onToggle(item, "available_to_tenants")} />
              <span className="text-[10px] text-muted-foreground mt-1">Tenants</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
