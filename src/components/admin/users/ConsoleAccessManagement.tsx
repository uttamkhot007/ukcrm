import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Monitor, Loader2, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserWithRole {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
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
  { value: 'it', label: 'IT' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'legal', label: 'Legal' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'ticketing', label: 'Ticketing' },
];

export function ConsoleAccessManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [consoleAccess, setConsoleAccess] = useState<Record<string, UserConsoleAccess>>({});
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [editingAccess, setEditingAccess] = useState<{ portal_modes: string[]; additional_modules: string[] }>({
    portal_modes: ['workspace'],
    additional_modules: [],
  });
  const [isSaving, setIsSaving] = useState(false);

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

    const usersData: UserWithRole[] = profiles
      .filter((profile: any) => !profile.is_super_admin)
      .map((profile: any) => ({
        id: profile.id,
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
      }));

    setUsers(usersData);
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

  const openConfigDialog = (user: UserWithRole) => {
    const existingAccess = consoleAccess[user.user_id];
    setEditingAccess({
      portal_modes: existingAccess?.portal_modes || ['workspace'],
      additional_modules: existingAccess?.additional_modules || [],
    });
    setSelectedUser(user);
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("user_console_access")
        .upsert({
          user_id: selectedUser.user_id,
          portal_modes: editingAccess.portal_modes,
          additional_modules: editingAccess.additional_modules,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Console access updated for ${selectedUser.full_name || selectedUser.email}`,
      });

      fetchConsoleAccess();
      setSelectedUser(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update console access",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
    <div className="space-y-6">
      <div className="glass rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Console Access Configuration
          </h2>
          <span className="text-sm text-muted-foreground">
            Configure portal and module access
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
                      <div className="flex flex-wrap gap-1 mt-1">
                        {access?.portal_modes.map((mode) => (
                          <Badge key={mode} variant="outline" className="text-xs">
                            {PORTAL_MODES.find(p => p.value === mode)?.label || mode}
                          </Badge>
                        ))}
                        {access?.additional_modules?.map((module) => (
                          <Badge key={module} variant="secondary" className="text-xs">
                            {ADDITIONAL_MODULES.find(m => m.value === module)?.label || module}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openConfigDialog(user)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass rounded-xl border border-border p-4">
        <h3 className="font-semibold mb-3">Access Guidelines</h3>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
          <li>All employees get Employee Portal access by default</li>
          <li>Admin Portal access provides full system control</li>
          <li>Workspace Portal provides team-specific module access</li>
          <li>Additional modules can be granted individually</li>
        </ul>
      </div>

      {/* Configure Access Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Console Access</DialogTitle>
            <DialogDescription>
              Set portal and module access for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="font-semibold">Portal Access</Label>
              <div className="space-y-2">
                {PORTAL_MODES.map((mode) => (
                  <div key={mode.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`portal-${mode.value}`}
                      checked={editingAccess.portal_modes.includes(mode.value)}
                      onCheckedChange={() => togglePortalMode(mode.value)}
                    />
                    <Label htmlFor={`portal-${mode.value}`} className="text-sm font-normal">
                      {mode.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-semibold">Additional Module Access</Label>
              <div className="grid grid-cols-2 gap-2">
                {ADDITIONAL_MODULES.map((module) => (
                  <div key={module.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`module-${module.value}`}
                      checked={editingAccess.additional_modules.includes(module.value)}
                      onCheckedChange={() => toggleModule(module.value)}
                    />
                    <Label htmlFor={`module-${module.value}`} className="text-sm font-normal">
                      {module.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
