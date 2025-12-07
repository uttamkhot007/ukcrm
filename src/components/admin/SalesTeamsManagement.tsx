import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, UserPlus, Crown, X, Loader2 } from "lucide-react";

interface SalesTeam {
  id: string;
  team_code: string;
  name: string;
  description: string | null;
  leader_id: string | null;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  is_leader: boolean;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    job_title: string | null;
  };
}

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  job_title: string | null;
}

export function SalesTeamsManagement() {
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<SalesTeam | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isLeader, setIsLeader] = useState(false);

  // Fetch sales teams
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["sales-teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_teams")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as SalesTeam[];
    },
  });

  // Fetch team members for selected team
  const { data: teamMembers, isLoading: membersLoading } = useQuery({
    queryKey: ["sales-team-members", selectedTeam?.id],
    queryFn: async () => {
      if (!selectedTeam) return [];
      const { data, error } = await supabase
        .from("sales_team_members")
        .select("id, team_id, user_id, is_leader")
        .eq("team_id", selectedTeam.id);
      if (error) throw error;
      
      // Fetch profiles for members
      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url, job_title")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data.map(member => ({
        ...member,
        profile: profileMap.get(member.user_id),
      })) as TeamMember[];
    },
    enabled: !!selectedTeam,
  });

  // Fetch all profiles for adding members
  const { data: allProfiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url, job_title")
        .order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async ({ teamId, userId, isLeader }: { teamId: string; userId: string; isLeader: boolean }) => {
      const { error } = await supabase
        .from("sales_team_members")
        .insert({ team_id: teamId, user_id: userId, is_leader: isLeader });
      if (error) throw error;
      
      // If setting as leader, update the sales_teams table too
      if (isLeader) {
        await supabase
          .from("sales_teams")
          .update({ leader_id: userId })
          .eq("id", teamId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-team-members"] });
      queryClient.invalidateQueries({ queryKey: ["sales-teams"] });
      toast.success("Member added successfully");
      setAddMemberOpen(false);
      setSelectedUserId("");
      setIsLeader(false);
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("This user is already a member of this team");
      } else {
        toast.error("Failed to add member");
      }
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async ({ memberId, wasLeader, teamId }: { memberId: string; wasLeader: boolean; teamId: string }) => {
      const { error } = await supabase
        .from("sales_team_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
      
      // If removing leader, clear leader_id from team
      if (wasLeader) {
        await supabase
          .from("sales_teams")
          .update({ leader_id: null })
          .eq("id", teamId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-team-members"] });
      queryClient.invalidateQueries({ queryKey: ["sales-teams"] });
      toast.success("Member removed");
    },
    onError: () => {
      toast.error("Failed to remove member");
    },
  });

  // Toggle leader status
  const toggleLeaderMutation = useMutation({
    mutationFn: async ({ member, teamId }: { member: TeamMember; teamId: string }) => {
      const newIsLeader = !member.is_leader;
      
      // Update member
      const { error } = await supabase
        .from("sales_team_members")
        .update({ is_leader: newIsLeader })
        .eq("id", member.id);
      if (error) throw error;
      
      // Update team leader
      await supabase
        .from("sales_teams")
        .update({ leader_id: newIsLeader ? member.user_id : null })
        .eq("id", teamId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-team-members"] });
      queryClient.invalidateQueries({ queryKey: ["sales-teams"] });
      toast.success("Leader status updated");
    },
    onError: () => {
      toast.error("Failed to update leader status");
    },
  });

  // Get available profiles (not already in selected team)
  const availableProfiles = allProfiles?.filter(
    p => !teamMembers?.some(m => m.user_id === p.user_id)
  ) || [];

  if (teamsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sales Teams</h3>
          <p className="text-sm text-muted-foreground">
            Manage sales team structure and members
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams?.map(team => (
          <Card
            key={team.id}
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              selectedTeam?.id === team.id ? "border-primary ring-1 ring-primary" : ""
            }`}
            onClick={() => setSelectedTeam(team)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                {team.name}
                <Badge variant="outline">{team.team_code}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {team.description || "No description"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTeam && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {selectedTeam.name} Members
              </span>
              <Button size="sm" onClick={() => setAddMemberOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : teamMembers?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No members in this team yet
              </p>
            ) : (
              <div className="space-y-3">
                {teamMembers?.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.profile?.full_name?.slice(0, 2).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {member.profile?.full_name || member.profile?.email || "Unknown"}
                          </span>
                          {member.is_leader && (
                            <Badge variant="default" className="gap-1">
                              <Crown className="h-3 w-3" />
                              Leader
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.profile?.job_title || "Team Member"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLeaderMutation.mutate({ member, teamId: selectedTeam.id })}
                      >
                        <Crown className={`h-4 w-4 ${member.is_leader ? "text-yellow-500" : "text-muted-foreground"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMemberMutation.mutate({
                          memberId: member.id,
                          wasLeader: member.is_leader,
                          teamId: selectedTeam.id,
                        })}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {availableProfiles.map(profile => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.full_name || profile.email || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isLeader"
                checked={isLeader}
                onChange={(e) => setIsLeader(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="isLeader">Set as Team Leader</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTeam && selectedUserId) {
                  addMemberMutation.mutate({
                    teamId: selectedTeam.id,
                    userId: selectedUserId,
                    isLeader,
                  });
                }
              }}
              disabled={!selectedUserId || addMemberMutation.isPending}
            >
              {addMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}