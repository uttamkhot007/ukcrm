import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Users2, Check, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamType } from "@/hooks/useAuth";

const TEAMS: { value: TeamType; label: string; color: string }[] = [
  { value: "sales", label: "Sales", color: "bg-sales/20 text-sales border-sales/30" },
  { value: "presales", label: "Presales", color: "bg-primary/20 text-primary border-primary/30" },
  { value: "inside_sales", label: "Inside Sales", color: "bg-orange-500/20 text-orange-500 border-orange-500/30" },
  { value: "technical", label: "Technical", color: "bg-tech/20 text-tech border-tech/30" },
  { value: "managed_services", label: "Managed Services", color: "bg-support/20 text-support border-support/30" },
  { value: "management", label: "Management", color: "bg-management/20 text-management border-management/30" },
  { value: "hr", label: "HR", color: "bg-hr/20 text-hr border-hr/30" },
  { value: "finance", label: "Finance", color: "bg-finance/20 text-finance border-finance/30" },
  { value: "marketing", label: "Marketing", color: "bg-marketing/20 text-marketing border-marketing/30" },
];

interface UserWithTeams {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  teams: TeamType[];
}

export function TeamManagement() {
  const [users, setUsers] = useState<UserWithTeams[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

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

    const { data: userTeams, error: teamsError } = await supabase
      .from("user_teams")
      .select("*");

    if (teamsError) {
      toast({
        title: "Error",
        description: "Failed to fetch teams",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const usersWithTeams: UserWithTeams[] = profiles.map((profile) => {
      const teams = userTeams
        .filter((t) => t.user_id === profile.user_id)
        .map((t) => t.team as TeamType);
      return {
        id: profile.id,
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        teams,
      };
    });

    setUsers(usersWithTeams);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleTeam = async (userId: string, team: TeamType, currentTeams: TeamType[]) => {
    setUpdatingUser(userId);

    const hasTeam = currentTeams.includes(team);

    if (hasTeam) {
      const { error } = await supabase
        .from("user_teams")
        .delete()
        .eq("user_id", userId)
        .eq("team", team);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to remove team",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Removed from ${team.replace("_", " ")} team`,
        });
        fetchUsers();
      }
    } else {
      const { error } = await supabase
        .from("user_teams")
        .insert({ user_id: userId, team });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add team",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Added to ${team.replace("_", " ")} team`,
        });
        fetchUsers();
      }
    }

    setUpdatingUser(null);
  };

  const getTeamBadge = (team: TeamType) => {
    const teamConfig = TEAMS.find((t) => t.value === team);
    return teamConfig?.color || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Team Management</h2>
          <p className="text-muted-foreground text-sm">
            Assign users to teams for portal access control
          </p>
        </div>
      </div>

      <div className="glass rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex flex-wrap gap-2">
            {TEAMS.map((team) => (
              <span
                key={team.value}
                className={cn("px-2 py-1 rounded-full border text-xs font-medium", team.color)}
              >
                {team.label}
              </span>
            ))}
          </div>
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
                className="p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold">
                      {user.full_name?.slice(0, 2).toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-medium">{user.full_name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {TEAMS.map((team) => {
                    const hasTeam = user.teams.includes(team.value);
                    return (
                      <Button
                        key={team.value}
                        variant="outline"
                        size="sm"
                        disabled={updatingUser === user.user_id}
                        onClick={() => toggleTeam(user.user_id, team.value, user.teams)}
                        className={cn(
                          "text-xs transition-all",
                          hasTeam && team.color,
                          hasTeam && "border"
                        )}
                      >
                        {updatingUser === user.user_id ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : hasTeam ? (
                          <Check className="w-3 h-3 mr-1" />
                        ) : (
                          <Plus className="w-3 h-3 mr-1" />
                        )}
                        {team.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass rounded-xl border border-border p-4">
        <h3 className="font-semibold mb-3">Team Access Overview</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-3">
            <span className="px-2 py-1 rounded-full border bg-management/20 text-management border-management/30 whitespace-nowrap">
              Management
            </span>
            <p className="text-muted-foreground">
              Full access to all modules and dashboards across both portals.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-2 py-1 rounded-full border bg-sales/20 text-sales border-sales/30 whitespace-nowrap">
              Sales Teams
            </span>
            <p className="text-muted-foreground">
              Sales, Presales & Inside Sales have access to the Sales Portal (Deals, Leads, Contacts, Quotations).
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-2 py-1 rounded-full border bg-muted text-muted-foreground whitespace-nowrap">
              Other Teams
            </span>
            <p className="text-muted-foreground">
              Technical, Managed Services, HR, Finance & Marketing have access to Employee Portal only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
