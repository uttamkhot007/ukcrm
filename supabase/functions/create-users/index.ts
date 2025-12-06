import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserToCreate {
  email: string;
  full_name: string;
  employee_code?: string;
  department?: string;
  job_title?: string;
  location?: string;
  birth_date?: string;
  hire_date?: string;
}

interface CreateUsersRequest {
  users: UserToCreate[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (!userRole || userRole.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { users }: CreateUsersRequest = await req.json();
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: "No users provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const defaultPassword = "P@$$2025";
    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const userData of users) {
      try {
        // Check if user already exists
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("email", userData.email.toLowerCase())
          .maybeSingle();

        if (existingProfile) {
          // Update existing profile
          const updateData: Record<string, any> = {
            full_name: userData.full_name,
          };
          
          if (userData.employee_code) updateData.employee_code = userData.employee_code;
          if (userData.department) updateData.department = userData.department;
          if (userData.job_title) updateData.job_title = userData.job_title;
          if (userData.location) updateData.location = userData.location;
          if (userData.birth_date) updateData.birth_date = userData.birth_date;
          if (userData.hire_date) updateData.hire_date = userData.hire_date;

          await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("user_id", existingProfile.user_id);

          results.push({ email: userData.email, success: true });
          continue;
        }

        // Create new user with admin API
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: defaultPassword,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: userData.full_name,
          },
        });

        if (createError) {
          results.push({ 
            email: userData.email, 
            success: false, 
            error: createError.message 
          });
          continue;
        }

        if (newUser?.user) {
          // Update the profile with additional data
          const profileUpdate: Record<string, any> = {};
          if (userData.employee_code) profileUpdate.employee_code = userData.employee_code;
          if (userData.department) profileUpdate.department = userData.department;
          if (userData.job_title) profileUpdate.job_title = userData.job_title;
          if (userData.location) profileUpdate.location = userData.location;
          if (userData.birth_date) profileUpdate.birth_date = userData.birth_date;
          if (userData.hire_date) profileUpdate.hire_date = userData.hire_date;

          if (Object.keys(profileUpdate).length > 0) {
            await supabaseAdmin
              .from("profiles")
              .update(profileUpdate)
              .eq("user_id", newUser.user.id);
          }

          results.push({ email: userData.email, success: true });
        }
      } catch (error) {
        results.push({ 
          email: userData.email, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errors = results.filter(r => !r.success).map(r => `${r.email}: ${r.error}`);

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        recordCount: successCount,
        totalCount: users.length,
        errors,
        results,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
