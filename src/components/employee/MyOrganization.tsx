import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/api/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ChevronDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrgMember {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  job_title: string | null;
  department: string | null;
  avatar_url: string | null;
  manager_id: string | null;
}

interface OrgNode extends OrgMember {
  level: number;
  isCurrentUser: boolean;
}

export function MyOrganization() {
  const { user, profile } = useAuth();

  // Fetch all profiles to build org hierarchy
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["org-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, job_title, department, avatar_url, manager_id")
        .order("full_name");
      
      if (error) throw error;
      return data as OrgMember[];
    },
    enabled: !!user,
  });

  // Build the org chain from CEO down to the current user
  const buildOrgChain = (): OrgNode[] => {
    if (!profiles || !user) return [];

    const chain: OrgNode[] = [];
    const profileMap = new Map(profiles.map(p => [p.user_id, p]));
    
    // Find current user's profile
    const currentProfile = profileMap.get(user.id);
    if (!currentProfile) return [];

    // Build chain upwards from current user to top
    const upwardChain: OrgMember[] = [];
    let current: OrgMember | undefined = currentProfile;
    const visited = new Set<string>();
    
    while (current && !visited.has(current.user_id)) {
      visited.add(current.user_id);
      upwardChain.unshift(current);
      
      if (current.manager_id) {
        current = profileMap.get(current.manager_id);
      } else {
        break;
      }
    }

    // Convert to OrgNode with levels
    return upwardChain.map((member, index) => ({
      ...member,
      level: index,
      isCurrentUser: member.user_id === user.id,
    }));
  };

  // Get direct reports of current user
  const { data: directReports } = useQuery({
    queryKey: ["direct-reports", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, job_title, department, avatar_url, manager_id")
        .eq("manager_id", user.id)
        .order("full_name");
      
      if (error) throw error;
      return data as OrgMember[];
    },
    enabled: !!user,
  });

  // Fetch sales team info for current user
  const { data: salesTeamInfo } = useQuery({
    queryKey: ["user-sales-team", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("sales_team_members")
        .select(`
          id,
          is_leader,
          team:sales_teams(id, name, team_code, description)
        `)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const orgChain = buildOrgChain();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">My Organization</h2>
      </div>

      {/* Sales Team Info */}
      {salesTeamInfo?.team && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sales Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-sm px-3 py-1">
                {(salesTeamInfo.team as any).name}
              </Badge>
              {salesTeamInfo.is_leader && (
                <Badge variant="secondary">Team Leader</Badge>
              )}
            </div>
            {(salesTeamInfo.team as any).description && (
              <p className="text-sm text-muted-foreground mt-2">
                {(salesTeamInfo.team as any).description}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reporting Chain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reporting Structure</CardTitle>
        </CardHeader>
        <CardContent>
          {orgChain.length === 0 ? (
            <p className="text-muted-foreground">No reporting structure found.</p>
          ) : (
            <div className="space-y-1">
              {orgChain.map((member, index) => (
                <div key={member.user_id} className="relative">
                  {/* Connector line */}
                  {index > 0 && (
                    <div 
                      className="absolute left-6 -top-1 w-0.5 h-4 bg-border"
                      style={{ marginLeft: (member.level - 1) * 24 }}
                    />
                  )}
                  
                  <div 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      member.isCurrentUser 
                        ? "bg-primary/10 border border-primary/30" 
                        : "hover:bg-muted/50"
                    )}
                    style={{ marginLeft: member.level * 24 }}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {member.full_name?.slice(0, 2).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium truncate",
                          member.isCurrentUser && "text-primary"
                        )}>
                          {member.full_name || member.email || "Unknown"}
                        </span>
                        {member.isCurrentUser && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.job_title || "Team Member"}
                        {member.department && ` • ${member.department}`}
                      </p>
                    </div>

                    {index < orgChain.length - 1 && (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Direct Reports */}
      {directReports && directReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Direct Reports ({directReports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {directReports.map((report) => (
                <div 
                  key={report.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={report.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {report.full_name?.slice(0, 2).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {report.full_name || report.email || "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {report.job_title || "Team Member"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}