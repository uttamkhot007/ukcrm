import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { TEMPLATE_LIBRARY, TEMPLATE_ROLES, type TemplateRole } from "@/lib/template-library";
import { useTemplatePermissions, type TemplatePermissionRule } from "@/hooks/useTemplatePermissions";

const APP_ROLES = ["admin", "manager", "employee"];
const TEAMS = [
  "sales", "presales", "technical", "managed_services", "management", "hr",
  "finance", "inside_sales", "marketing", "renewals", "accounts", "admin",
];

function solutionsFor(packRole: string): string[] {
  const list = TEMPLATE_LIBRARY.filter((t) => packRole === "all" || t.role === (packRole as TemplateRole))
    .map((t) => t.solution)
    .filter(Boolean) as string[];
  return Array.from(new Set(list)).sort();
}

export function TemplatePermissionsPanel() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { rules, isLoading, canManagePermissions } = useTemplatePermissions();

  const [subjectType, setSubjectType] = useState<"role" | "team">("team");
  const [subjectValue, setSubjectValue] = useState<string>("sales");
  const [packRole, setPackRole] = useState<string>("sales");
  const [solution, setSolution] = useState<string>("all");
  const [flags, setFlags] = useState({ can_install: false, can_edit: true, can_approve: false });

  const solutions = useMemo(() => solutionsFor(packRole), [packRole]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["template-permissions", currentTenant?.id] });

  const addRule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("template_permissions").upsert(
        {
          tenant_id: currentTenant?.id,
          subject_type: subjectType,
          subject_value: subjectValue,
          pack_role: packRole,
          solution,
          ...flags,
          created_by: user?.id ?? null,
        } as any,
        { onConflict: "tenant_id,subject_type,subject_value,pack_role,solution" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Permission rule saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save rule"),
  });

  const toggleFlag = useMutation({
    mutationFn: async ({ rule, key, value }: { rule: TemplatePermissionRule; key: string; value: boolean }) => {
      const { error } = await supabase
        .from("template_permissions")
        .update({ [key]: value } as any)
        .eq("id", rule.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message ?? "Could not update rule"),
  });

  const removeRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("template_permissions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Rule removed");
    },
  });

  if (!canManagePermissions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Template permissions
          </CardTitle>
          <CardDescription>
            Only workspace administrators can change who may install, edit or approve templates.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Grant template access
          </CardTitle>
          <CardDescription>
            Give a role or team the ability to install packs, edit templates or approve finalised
            documents — scoped to a template role and, optionally, a single solution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Applies to</Label>
              <Select
                value={subjectType}
                onValueChange={(v) => {
                  setSubjectType(v as "role" | "team");
                  setSubjectValue(v === "role" ? "manager" : "sales");
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="role">User role</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{subjectType === "role" ? "Role" : "Team"}</Label>
              <Select value={subjectValue} onValueChange={setSubjectValue}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(subjectType === "role" ? APP_ROLES : TEAMS).map((v) => (
                    <SelectItem key={v} value={v}>{v.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Template role</Label>
              <Select
                value={packRole}
                onValueChange={(v) => { setPackRole(v); setSolution("all"); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {TEMPLATE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Solution</Label>
              <Select value={solution} onValueChange={setSolution}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All solutions</SelectItem>
                  {solutions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            {([
              ["can_install", "Install packs"],
              ["can_edit", "Edit templates"],
              ["can_approve", "Approve documents"],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <Switch
                  id={`new-${key}`}
                  checked={flags[key]}
                  onCheckedChange={(v) => setFlags((f) => ({ ...f, [key]: v }))}
                />
                <Label htmlFor={`new-${key}`} className="text-sm">{label}</Label>
              </div>
            ))}
            <Button
              className="ml-auto gap-1"
              onClick={() => addRule.mutate()}
              disabled={addRule.isPending}
            >
              {addRule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save rule
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permission rules</CardTitle>
          <CardDescription>
            Administrators always retain full access. {rules.length} rule{rules.length === 1 ? "" : "s"} configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading rules…
            </div>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rules yet — only administrators can install, edit or approve templates.
            </p>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-[200px]">
                  <div className="text-sm font-medium capitalize">
                    {rule.subject_value.replace(/_/g, " ")}
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {rule.subject_type === "role" ? "role" : "team"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {rule.pack_role === "all" ? "All template roles" : rule.pack_role} ·{" "}
                    {rule.solution === "all" ? "All solutions" : rule.solution}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {([
                    ["can_install", "Install"],
                    ["can_edit", "Edit"],
                    ["can_approve", "Approve"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={rule[key]}
                        onCheckedChange={(v) => toggleFlag.mutate({ rule, key, value: v })}
                      />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto text-destructive"
                  onClick={() => removeRule.mutate(rule.id)}
                  aria-label="Remove rule"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
