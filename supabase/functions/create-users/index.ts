import { json, preflight } from "../_shared/ai.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

/** Only platform/tenant admins may bulk-create users. */
async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return { error: "Missing authorization" };
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await asUser.auth.getUser();
  const user = userData?.user;
  if (!user) return { error: "Not authenticated" };

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
  const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "super_admin");
  if (!isAdmin) return { error: "Admin role required" };

  const { data: profile } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return { admin, user, tenantId: profile?.tenant_id ?? null };
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  try {
    const ctx = await requireAdmin(req);
    if ("error" in ctx && ctx.error) return json({ success: false, errors: [ctx.error] }, 403);
    const { admin, tenantId } = ctx as { admin: ReturnType<typeof createClient>; tenantId: string | null };

    const { users = [] } = await req.json().catch(() => ({ users: [] }));
    if (!Array.isArray(users) || users.length === 0) {
      return json({ success: false, recordCount: 0, errors: ["No users supplied"] }, 400);
    }
    if (users.length > 200) {
      return json({ success: false, recordCount: 0, errors: ["Maximum 200 users per import"] }, 400);
    }

    const errors: string[] = [];
    let created = 0;

    for (const u of users) {
      const email = String(u.email ?? "").trim().toLowerCase();
      if (!email) {
        errors.push("Row skipped: missing email");
        continue;
      }
      const password = u.password || crypto.randomUUID() + "Aa1!";
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name ?? u.name ?? email },
      });
      if (error) {
        errors.push(`${email}: ${error.message}`);
        continue;
      }
      created += 1;

      const newId = data.user?.id;
      if (newId) {
        await admin
          .from("profiles")
          .update({
            full_name: u.full_name ?? u.name ?? null,
            department: u.department ?? null,
            job_title: u.job_title ?? null,
            tenant_id: u.tenant_id ?? tenantId,
          })
          .eq("user_id", newId);
        await admin.from("user_roles").insert({ user_id: newId, role: u.role ?? "user" });
      }
    }

    return json({ success: errors.length === 0, recordCount: created, errors });
  } catch (e) {
    return json({ success: false, recordCount: 0, errors: [(e as Error).message] }, 500);
  }
});
