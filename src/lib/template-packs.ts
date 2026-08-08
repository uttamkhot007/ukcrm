/**
 * Template pack versioning.
 *
 * Installed packs are tracked in `template_pack_installations` with the pack
 * version, a full snapshot of the templates as they were before the change and
 * the ids of templates created by that install. Every write to a template also
 * appends an immutable snapshot to `document_template_versions`, so a pack can
 * be updated safely and rolled back without breaking documents that were built
 * from an earlier revision.
 */
import { supabase } from "@/integrations/api/client";
import {
  TEMPLATE_LIBRARY,
  applyTenantBranding,
  type LibraryTemplate,
  type TemplateRole,
  type TenantBrandingInput,
} from "@/lib/template-library";

/** Bump when the library content for a role changes. */
export const TEMPLATE_PACK_VERSIONS: Record<TemplateRole, string> = {
  sales: "1.1.0",
  presales: "1.1.0",
  technical: "1.1.0",
  hr: "1.1.0",
  finance: "1.1.0",
};

export interface InstalledTemplateRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  template_type: string;
  content: Record<string, any>;
  header_content: Record<string, any>;
  footer_content: Record<string, any>;
  branding: Record<string, any>;
  version?: string | null;
  library_key?: string | null;
  library_version?: string | null;
  pack_role?: string | null;
}

export interface PackInstallation {
  id: string;
  tenant_id: string;
  pack_role: string;
  pack_version: string;
  previous_version: string | null;
  action: string;
  template_count: number;
  created_template_ids: string[] | null;
  snapshot: any;
  is_rolled_back: boolean;
  installed_by: string | null;
  created_at: string;
}

export interface TemplateVersionRow {
  id: string;
  template_id: string;
  version: string;
  library_version: string | null;
  name: string;
  description: string | null;
  template_type: string;
  content: Record<string, any>;
  header_content: Record<string, any>;
  footer_content: Record<string, any>;
  branding: Record<string, any>;
  change_note: string | null;
  created_at: string;
}

export interface PackContext {
  tenantId: string;
  userId?: string | null;
  branding: TenantBrandingInput;
}

/** Semantic-ish version bump helper (1.2.3 -> 1.2.4). */
export function bumpVersion(version?: string | null): string {
  const parts = (version || "1.0").split(".").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join(".");
}

export function packTemplates(role: TemplateRole): LibraryTemplate[] {
  return TEMPLATE_LIBRARY.filter((t) => t.role === role);
}

/** Match an installed row to a library template (library_key first, name fallback). */
export function matchInstalled(
  installed: InstalledTemplateRow[],
  lib: LibraryTemplate,
): InstalledTemplateRow | undefined {
  return (
    installed.find((row) => row.library_key === lib.key) ||
    installed.find((row) => !row.library_key && row.name === lib.name)
  );
}

export function buildRow(lib: LibraryTemplate, ctx: PackContext, version: string) {
  return {
    tenant_id: ctx.tenantId,
    name: lib.name,
    description: lib.description,
    template_type: lib.template_type,
    content: { ...lib.content, role: lib.role, solution: lib.solution ?? null },
    header_content: lib.header_content,
    footer_content: lib.footer_content,
    branding: applyTenantBranding(lib, ctx.branding),
    library_key: lib.key,
    library_version: version,
    pack_role: lib.role,
    is_default: false,
    created_by: ctx.userId ?? null,
  };
}

function snapshotRow(row: InstalledTemplateRow, ctx: PackContext, note: string) {
  return {
    tenant_id: ctx.tenantId,
    template_id: row.id,
    version: row.version || "1.0",
    library_key: row.library_key ?? null,
    library_version: row.library_version ?? null,
    name: row.name,
    description: row.description,
    template_type: row.template_type,
    content: row.content ?? {},
    header_content: row.header_content ?? {},
    footer_content: row.footer_content ?? {},
    branding: row.branding ?? {},
    change_note: note,
    created_by: ctx.userId ?? null,
  };
}

/** Installed pack version for a role (latest non-rolled-back install). */
export function currentPackVersion(
  installations: PackInstallation[],
  role: TemplateRole,
): string | null {
  const latest = installations
    .filter((i) => i.pack_role === role && !i.is_rolled_back)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return latest?.pack_version ?? null;
}

/**
 * Installs missing templates of a pack and updates the ones that are behind the
 * current library version. Previous content is snapshotted first, so nothing
 * that already references a template is lost.
 */
export async function installOrUpdatePack(
  role: TemplateRole,
  installed: InstalledTemplateRow[],
  ctx: PackContext,
  installations: PackInstallation[],
): Promise<{ created: number; updated: number }> {
  const targetVersion = TEMPLATE_PACK_VERSIONS[role];
  const previousVersion = currentPackVersion(installations, role);
  const libs = packTemplates(role);

  const toCreate: LibraryTemplate[] = [];
  const toUpdate: { lib: LibraryTemplate; row: InstalledTemplateRow }[] = [];

  for (const lib of libs) {
    const row = matchInstalled(installed, lib);
    if (!row) toCreate.push(lib);
    else if ((row.library_version || "") !== targetVersion) toUpdate.push({ lib, row });
  }

  if (toCreate.length === 0 && toUpdate.length === 0) return { created: 0, updated: 0 };

  const snapshot = toUpdate.map(({ row }) => row);
  const note = `Pack ${role} ${previousVersion ?? "unversioned"} → ${targetVersion}`;

  // 1. Snapshot every template we are about to change.
  if (snapshot.length > 0) {
    const { error } = await supabase
      .from("document_template_versions")
      .insert(snapshot.map((row) => snapshotRow(row, ctx, note)));
    if (error) throw error;
  }

  // 2. Apply updates in place so existing references keep working.
  for (const { lib, row } of toUpdate) {
    const next = buildRow(lib, ctx, targetVersion);
    const { error } = await supabase
      .from("document_templates")
      .update({
        name: next.name,
        description: next.description,
        template_type: next.template_type,
        content: next.content,
        header_content: next.header_content,
        footer_content: next.footer_content,
        branding: next.branding,
        library_key: next.library_key,
        library_version: targetVersion,
        pack_role: role,
        version: bumpVersion(row.version),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) throw error;
  }

  // 3. Insert brand-new templates.
  let createdIds: string[] = [];
  if (toCreate.length > 0) {
    const { data, error } = await supabase
      .from("document_templates")
      .insert(toCreate.map((lib) => buildRow(lib, ctx, targetVersion)))
      .select("id");
    if (error) throw error;
    createdIds = (data ?? []).map((r: any) => r.id);
  }

  // 4. Record the installation for rollback.
  const { error: logError } = await supabase.from("template_pack_installations").insert({
    tenant_id: ctx.tenantId,
    pack_role: role,
    pack_version: targetVersion,
    previous_version: previousVersion,
    action: previousVersion ? "update" : "install",
    template_count: toCreate.length + toUpdate.length,
    created_template_ids: createdIds,
    snapshot: snapshot as any,
    installed_by: ctx.userId ?? null,
  });
  if (logError) throw logError;

  return { created: toCreate.length, updated: toUpdate.length };
}

/**
 * Reverts a pack installation: restores every snapshotted template to its
 * pre-update content and removes templates that install created.
 */
export async function rollbackPackInstallation(
  installation: PackInstallation,
  ctx: PackContext,
): Promise<{ restored: number; removed: number }> {
  const snapshot: InstalledTemplateRow[] = Array.isArray(installation.snapshot)
    ? installation.snapshot
    : [];

  for (const row of snapshot) {
    const { error } = await supabase
      .from("document_templates")
      .update({
        name: row.name,
        description: row.description,
        template_type: row.template_type,
        content: row.content ?? {},
        header_content: row.header_content ?? {},
        footer_content: row.footer_content ?? {},
        branding: row.branding ?? {},
        library_key: row.library_key ?? null,
        library_version: row.library_version ?? null,
        version: row.version || "1.0",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("tenant_id", ctx.tenantId);
    if (error) throw error;
  }

  const createdIds = installation.created_template_ids ?? [];
  if (createdIds.length > 0) {
    const { error } = await supabase
      .from("document_templates")
      .delete()
      .in("id", createdIds)
      .eq("tenant_id", ctx.tenantId);
    if (error) throw error;
  }

  const { error: markError } = await supabase
    .from("template_pack_installations")
    .update({ is_rolled_back: true })
    .eq("id", installation.id);
  if (markError) throw markError;

  return { restored: snapshot.length, removed: createdIds.length };
}

/** Restores a single template to one of its historical versions. */
export async function restoreTemplateVersion(
  current: InstalledTemplateRow,
  version: TemplateVersionRow,
  ctx: PackContext,
): Promise<void> {
  const { error: snapErr } = await supabase
    .from("document_template_versions")
    .insert(snapshotRow(current, ctx, `Restored to ${version.version}`));
  if (snapErr) throw snapErr;

  const { error } = await supabase
    .from("document_templates")
    .update({
      name: version.name,
      description: version.description,
      template_type: version.template_type,
      content: version.content ?? {},
      header_content: version.header_content ?? {},
      footer_content: version.footer_content ?? {},
      branding: version.branding ?? {},
      library_version: version.library_version ?? null,
      version: bumpVersion(current.version),
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .eq("tenant_id", ctx.tenantId);
  if (error) throw error;
}
