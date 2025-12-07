import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Shield, UserCog, Check, Loader2, Users2, Key, Eye, EyeOff, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamManagement } from "./TeamManagement";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type AppRole = "admin" | "manager" | "employee";

interface UserWithRole {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
}

interface UserConsoleAccess {
  user_id: string;
  portal_modes: string[];
  additional_modules: string[];
}

const PORTAL_MODES = [
  { value: 'admin', label: 'Admin Portal' },
  { value: 'workspace', label: 'Workspace Portal' },
  { value: 'customer', label: 'Customer Portal' },
];

const ADDITIONAL_MODULES = [
  { value: 'sales', label: 'Sales' },
  { value: 'presales', label: 'Solution Engineering' },
  { value: 'inside_sales', label: 'Inside Sales' },
  { value: 'accounts', label: 'Accounts' },
  { value: 'billing', label: 'Billing' },
  { value: 'renewals', label: 'Renewals' },
  { value: 'hr', label: 'HR' },
  { value: 'management', label: 'Management' },
  { value: 'finance', label: 'Finance' },
  { value: 'technical', label: 'Technical' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'legal', label: 'Legal' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'ticketing', label: 'Ticketing' },
];

export function AdminPanel() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [consoleAccess, setConsoleAccess] = useState<Record<string, UserConsoleAccess>>({});
  const [selectedConsoleUser, setSelectedConsoleUser] = useState<UserWithRole | null>(null);
  const [editingAccess, setEditingAccess] = useState<{ portal_modes: string[]; additional_modules: string[] }>({
    portal_modes: ['workspace'],
    additional_modules: [],
  });
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
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

    const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
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

  const fetchConsoleAccess = async () => {
    const { data, error } = await supabase
      .from("user_console_access")
      .select("*");

    if (!error && data) {
      const accessMap: Record<string, UserConsoleAccess> = {};
      data.forEach((item: any) => {
        accessMap[item.user_id] = {
          user_id: item.user_id,
          portal_modes: item.portal_modes || ['workspace'],
          additional_modules: item.additional_modules || [],
        };
      });
      setConsoleAccess(accessMap);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchConsoleAccess();
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

  const handleSetPassword = async () => {
    if (!selectedUser) return;

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsSettingPassword(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("set-user-password", {
        body: {
          user_id: selectedUser.user_id,
          password,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Success",
        description: `Password set for ${selectedUser.full_name || selectedUser.email}`,
      });

      setSelectedUser(null);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set password",
        variant: "destructive",
      });
    } finally {
      setIsSettingPassword(false);
    }
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

  const openConsoleAccessDialog = (user: UserWithRole) => {
    const existingAccess = consoleAccess[user.user_id];
    setEditingAccess({
      portal_modes: existingAccess?.portal_modes || ['workspace'],
      additional_modules: existingAccess?.additional_modules || [],
    });
    setSelectedConsoleUser(user);
  };

  const handleSaveConsoleAccess = async () => {
    if (!selectedConsoleUser) return;

    setIsSavingAccess(true);

    try {
      const { error } = await supabase
        .from("user_console_access")
        .upsert({
          user_id: selectedConsoleUser.user_id,
          portal_modes: editingAccess.portal_modes,
          additional_modules: editingAccess.additional_modules,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Console access updated for ${selectedConsoleUser.full_name || selectedConsoleUser.email}`,
      });

      fetchConsoleAccess();
      setSelectedConsoleUser(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update console access",
        variant: "destructive",
      });
    } finally {
      setIsSavingAccess(false);
    }
  };

  const togglePortalMode = (mode: string) => {
    setEditingAccess((prev) => ({
      ...prev,
      portal_modes: prev.portal_modes.includes(mode)
        ? prev.portal_modes.filter((m) => m !== mode)
        : [...prev.portal_modes, mode],
    }));
  };

  const toggleModule = (module: string) => {
    setEditingAccess((prev) => ({
      ...prev,
      additional_modules: prev.additional_modules.includes(module)
        ? prev.additional_modules.filter((m) => m !== module)
        : [...prev.additional_modules, module],
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage user roles, teams, and credentials</p>
        </div>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <UserCog className="w-4 h-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="console" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Console Access
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users2 className="w-4 h-4" />
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-6">
          <div className="glass rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                User Management
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
        </TabsContent>

        <TabsContent value="credentials" className="space-y-6">
          <div className="glass rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Key className="w-5 h-5" />
                User Credentials
              </h2>
              <span className="text-sm text-muted-foreground">
                Set login passwords for users
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

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUser(user)}
                      className="flex items-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      Set Password
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass rounded-xl border border-border p-4">
            <h3 className="font-semibold mb-3">Password Guidelines</h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>Minimum 6 characters required</li>
              <li>Use a mix of letters, numbers, and special characters for stronger security</li>
              <li>Passwords are securely stored and encrypted</li>
              <li>Users can login with their email and the password you set</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="console" className="space-y-6">
          <div className="glass rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Console Access Configuration
              </h2>
              <span className="text-sm text-muted-foreground">
                Configure portal modes & module access per user
              </span>
            </div>

            {isLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((user) => {
                  const access = consoleAccess[user.user_id];
                  return (
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

                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">
                            Portals: {access?.portal_modes?.length || 1} | Modules: {access?.additional_modules?.length || 0}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openConsoleAccessDialog(user)}
                          className="flex items-center gap-2"
                        >
                          <Monitor className="w-4 h-4" />
                          Configure
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass rounded-xl border border-border p-4">
            <h3 className="font-semibold mb-3">Console Access Guidelines</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Portal Modes:</strong> Define which portals (Admin, Workspace, Customer) a user can access.</p>
              <p><strong>Additional Modules:</strong> Grant access to specific modules beyond the Employee Portal in Workspace mode.</p>
              <p>By default, all users have access to the Workspace portal with Employee Portal modules.</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="teams">
          <TeamManagement />
        </TabsContent>
      </Tabs>

      {/* Set Password Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Password</DialogTitle>
            <DialogDescription>
              Set a login password for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSetPassword} disabled={isSettingPassword}>
              {isSettingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting...
                </>
              ) : (
                "Set Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Console Access Dialog */}
      <Dialog open={!!selectedConsoleUser} onOpenChange={(open) => !open && setSelectedConsoleUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Console Access</DialogTitle>
            <DialogDescription>
              Set portal modes and module access for {selectedConsoleUser?.full_name || selectedConsoleUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Portal Modes</Label>
              <p className="text-sm text-muted-foreground">Select which portals this user can access</p>
              <div className="grid grid-cols-1 gap-3">
                {PORTAL_MODES.map((mode) => (
                  <div key={mode.value} className="flex items-center space-x-3">
                    <Checkbox
                      id={`portal-${mode.value}`}
                      checked={editingAccess.portal_modes.includes(mode.value)}
                      onCheckedChange={() => togglePortalMode(mode.value)}
                    />
                    <Label htmlFor={`portal-${mode.value}`} className="font-normal cursor-pointer">
                      {mode.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Additional Workspace Modules</Label>
              <p className="text-sm text-muted-foreground">Select additional modules beyond Employee Portal</p>
              <div className="grid grid-cols-2 gap-3">
                {ADDITIONAL_MODULES.map((module) => (
                  <div key={module.value} className="flex items-center space-x-3">
                    <Checkbox
                      id={`module-${module.value}`}
                      checked={editingAccess.additional_modules.includes(module.value)}
                      onCheckedChange={() => toggleModule(module.value)}
                    />
                    <Label htmlFor={`module-${module.value}`} className="font-normal cursor-pointer">
                      {module.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedConsoleUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConsoleAccess} disabled={isSavingAccess}>
              {isSavingAccess ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Access"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
