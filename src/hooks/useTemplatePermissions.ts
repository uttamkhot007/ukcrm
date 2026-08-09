import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";

export type TemplateAction = "install" | "edit" | "approve";

export interface TemplatePermissionRule {
  id: string;
  tenant_id: string;
  subject_type: "role" | "team";
  subject_value: string;
  pack_role: string;
  solution: string;
  can_install: boolean;
  can_edit: boolean;
  can_approve: boolean;
  created_at: string;
}

const ACTION_COLUMN: Record<TemplateAction, keyof TemplatePermissionRule> = {
  install: "can_install",
  edit: "can_edit",
  approve: "can_approve",
};

/**
 * Granular, tenant-scoped template permissions.
 *
 * A rule grants an action to a role or a team, optionally narrowed to a
 * template role (sales, presales, …) and a solution. Workspace/platform admins
 * always have every permission.
 */
export function useTemplatePermissions() {
  const { currentTenant } = useTenant();
  const { role, teams, isAdmin, isPlatformAdmin } = useAuth();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["template-permissions", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from("template_permissions")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TemplatePermissionRule[];
    },
    enabled: !!currentTenant?.id,
    staleTime: 5 * 60 * 1000,
  });

  const isSuperUser = !!isAdmin || !!isPlatformAdmin;

  const myRules = useMemo(
    () =>
      rules.filter(
        (r) =>
          (r.subject_type === "role" && r.subject_value === role) ||
          (r.subject_type === "team" && (teams ?? []).includes(r.subject_value as any)),
      ),
    [rules, role, teams],
  );

  const can = useCallback(
    (action: TemplateAction, scope?: { packRole?: string | null; solution?: string | null }) => {
      if (isSuperUser) return true;
      const packRole = scope?.packRole ?? null;
      const solution = scope?.solution ?? null;
      return myRules.some((r) => {
        if (!r[ACTION_COLUMN[action]]) return false;
        if (r.pack_role !== "all" && packRole && r.pack_role !== packRole) return false;
        if (r.pack_role !== "all" && !packRole) return false;
        if (r.solution !== "all" && solution && r.solution !== solution) return false;
        if (r.solution !== "all" && !solution) return false;
        return true;
      });
    },
    [isSuperUser, myRules],
  );

  return {
    rules,
    myRules,
    isLoading,
    /** Only admins may edit the permission matrix itself. */
    canManagePermissions: isSuperUser,
    can,
    canInstall: (packRole?: string | null, solution?: string | null) =>
      can("install", { packRole, solution }),
    canEdit: (packRole?: string | null, solution?: string | null) =>
      can("edit", { packRole, solution }),
    canApprove: (packRole?: string | null, solution?: string | null) =>
      can("approve", { packRole, solution }),
  };
}
