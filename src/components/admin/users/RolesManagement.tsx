import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Shield, Check, Loader2, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";

type AppRole = "admin" | "manager" | "employee";

interface UserWithRole {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
}

export function RolesManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles_safe")
      .select("*");

    if (profilesError) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("*");

    if (rolesError) {
      toast({
        title: "Error",
        description: "Failed to fetch roles",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const usersWithRoles: UserWithRole[] = profiles
      .filter((profile: any) => !profile.is_super_admin)
      .map((profile: any) => {
        const userRole = roles.find((r) => r.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          role: (userRole?.role as AppRole) || "employee",
        };
      });

    setUsers(usersWithRoles);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    setUpdatingUser(userId);

    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      fetchUsers();
    }

    setUpdatingUser(null);
  };

  const getRoleColor = (role: AppRole) => {
    switch (role) {
      case "admin":
        return "bg-destructive/20 text-destructive border-destructive/30";
      case "manager":
        return "bg-management/20 text-management border-management/30";
      default:
        return "bg-employee/20 text-employee border-employee/30";
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Role Management
          </h2>
          <span className="text-sm text-muted-foreground">
            {users.length} users
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((user) => (
              <div
                key={user.id}
                className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold">
                    {user.full_name?.slice(0, 2).toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="font-medium">{user.full_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(["admin", "manager", "employee"] as AppRole[]).map((role) => (
                    <Button
                      key={role}
                      variant="outline"
                      size="sm"
                      disabled={updatingUser === user.user_id}
                      onClick={() => updateUserRole(user.user_id, role)}
                      className={cn(
                        "capitalize transition-all",
                        user.role === role && getRoleColor(role),
                        user.role === role && "border"
                      )}
                    >
                      {updatingUser === user.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : user.role === role ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : null}
                      {role}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass rounded-xl border border-border p-4">
        <h3 className="font-semibold mb-3">Role Permissions</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className={cn("px-2 py-1 rounded-full border", getRoleColor("admin"))}>
              Admin
            </span>
            <p className="text-muted-foreground">
              Full access to all modules including Management, Admin Panel, and user role management.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className={cn("px-2 py-1 rounded-full border", getRoleColor("manager"))}>
              Manager
            </span>
            <p className="text-muted-foreground">
              Access to Sales, Finance, HR, Technical, Support, Marketing modules. Cannot access Management or Admin.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className={cn("px-2 py-1 rounded-full border", getRoleColor("employee"))}>
              Employee
            </span>
            <p className="text-muted-foreground">
              Access to Dashboard and Employee Portal only. Basic user access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
