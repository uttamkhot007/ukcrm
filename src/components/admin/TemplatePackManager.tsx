import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { History, Loader2, PackagePlus, RotateCcw, ShieldCheck } from "lucide-react";
import { TEMPLATE_ROLES, type TemplateRole, type TenantBrandingInput } from "@/lib/template-library";
import {
  TEMPLATE_PACK_VERSIONS,
  currentPackVersion,
  installOrUpdatePack,
  matchInstalled,
  packTemplates,
  restoreTemplateVersion,
  rollbackPackInstallation,
  type InstalledTemplateRow,
  type PackInstallation,
  type TemplateVersionRow,
} from "@/lib/template-packs";

interface Props {
  templates: InstalledTemplateRow[];
  branding: TenantBrandingInput;
}

export function TemplatePackManager({ templates, branding }: Props) {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busyRole, setBusyRole] = useState<string | null>(null);
  const [busyRollback, setBusyRollback] = useState<string | null>(null);
  const [historyTemplate, setHistoryTemplate] = useState<InstalledTemplateRow | null>(null);

  const { data: installations = [] } = useQuery({
    queryKey: ["template-pack-installations", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from("template_pack_installations")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PackInstallation[];
    },
    enabled: !!currentTenant?.id,
  });

  const { data: versionHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["document-template-versions", historyTemplate?.id],
    queryFn: async () => {
      if (!historyTemplate?.id) return [];
      const { data, error } = await supabase
        .from("document_template_versions")
        .select("*")
        .eq("template_id", historyTemplate.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TemplateVersionRow[];
    },
    enabled: !!historyTemplate?.id,
  });

  const ctx = {
    tenantId: currentTenant?.id ?? "",
    userId: user?.id ?? null,
    branding,
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["document-templates"] });
    queryClient.invalidateQueries({ queryKey: ["template-pack-installations"] });
    queryClient.invalidateQueries({ queryKey: ["document-template-versions"] });
  };

  const runInstall = async (role: TemplateRole) => {
    if (!currentTenant?.id) return;
    setBusyRole(role);
    try {
      const result = await installOrUpdatePack(role, templates, ctx, installations);
      if (result.created === 0 && result.updated === 0) {
        toast.info("Pack is already up to date");
      } else {
        toast.success(`${result.created} added, ${result.updated} updated — previous versions saved`);
      }
      refresh();
    } catch (error: any) {
      toast.error("Pack operation failed: " + error.message);
    } finally {
      setBusyRole(null);
    }
  };

  const runRollback = async (installation: PackInstallation) => {
    setBusyRollback(installation.id);
    try {
      const result = await rollbackPackInstallation(installation, ctx);
      toast.success(`Rolled back — ${result.restored} restored, ${result.removed} removed`);
      refresh();
    } catch (error: any) {
      toast.error("Rollback failed: " + error.message);
    } finally {
      setBusyRollback(null);
    }
  };

  const runRestore = async (version: TemplateVersionRow) => {
    if (!historyTemplate) return;
    try {
      await restoreTemplateVersion(historyTemplate, version, ctx);
      toast.success(`Restored "${version.name}" to version ${version.version}`);
      setHistoryTemplate(null);
      refresh();
    } catch (error: any) {
      toast.error("Restore failed: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {TEMPLATE_ROLES.map((role) => {
          const libs = packTemplates(role.value);
          const target = TEMPLATE_PACK_VERSIONS[role.value];
          const installedRows = libs
            .map((lib) => matchInstalled(templates, lib))
            .filter(Boolean) as InstalledTemplateRow[];
          const upToDate = installedRows.filter((r) => r.library_version === target).length;
          const active = currentPackVersion(installations, role.value);
          const needsUpdate = installedRows.length > 0 && (upToDate < libs.length);
          const lastInstall = installations.find((i) => i.pack_role === role.value && !i.is_rolled_back);

          return (
            <Card key={role.value}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <role.icon className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">{role.label} pack</CardTitle>
                  </div>
                  <Badge variant={needsUpdate ? "secondary" : "outline"}>
                    {active ? `v${active}` : "not installed"}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Library v{target} · {upToDate}/{libs.length} templates current
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2 text-xs text-muted-foreground">
                {needsUpdate ? (
                  <span>Update available — current documents stay intact, old versions are archived.</span>
                ) : installedRows.length === 0 ? (
                  <span>Install to add {libs.length} branded templates.</span>
                ) : (
                  <span className="flex items-center gap-1 text-foreground">
                    <ShieldCheck className="h-3 w-3 text-primary" /> Up to date
                  </span>
                )}
              </CardContent>
              <CardFooter className="flex gap-2 pt-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1"
                  disabled={busyRole === role.value || (!needsUpdate && installedRows.length === libs.length)}
                  onClick={() => runInstall(role.value)}
                >
                  {busyRole === role.value ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <PackagePlus className="h-3 w-3" />
                  )}
                  {installedRows.length === 0 ? "Install pack" : needsUpdate ? "Update pack" : "Up to date"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                  disabled={!lastInstall || busyRollback === lastInstall?.id}
                  onClick={() => lastInstall && runRollback(lastInstall)}
                >
                  {busyRollback === lastInstall?.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Rollback
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Installed templates &amp; version history</CardTitle>
          <CardDescription className="text-xs">
            Every pack update archives the previous revision — restore any template individually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates installed yet.</p>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    v{t.version || "1.0"}
                    {t.library_version ? ` · pack v${t.library_version}` : " · custom"}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setHistoryTemplate(t)}>
                  <History className="h-3 w-3" />
                  History
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={!!historyTemplate} onOpenChange={(open) => !open && setHistoryTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            <DialogDescription>{historyTemplate?.name}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80 pr-3">
            {historyLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
              </div>
            ) : versionHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No earlier versions archived for this template yet.
              </p>
            ) : (
              <div className="space-y-2">
                {versionHistory.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-3 rounded-md border p-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">v{v.version}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()}
                        {v.change_note ? ` · ${v.change_note}` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => runRestore(v)}>
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TemplatePackManager;
