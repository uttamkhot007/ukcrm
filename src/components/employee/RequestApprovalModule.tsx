import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  Building2,
  DollarSign,
  Monitor,
  Briefcase,
} from "lucide-react";
import { RequestApprovalList } from "./RequestApprovalList";
import { RequestApprovalSheet } from "./RequestApprovalSheet";

const TEAMS = [
  { id: "all", label: "All Teams", icon: Users },
  { id: "HR", label: "HR", icon: Briefcase },
  { id: "Finance", label: "Finance", icon: DollarSign },
  { id: "IT", label: "IT", icon: Monitor },
  { id: "Admin", label: "Admin", icon: Building2 },
];

export function RequestApprovalModule() {
  const { isAdmin, isManager } = useAuth();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [teamFilter, setTeamFilter] = useState("all");

  // Fetch request stats with team breakdown
  const { data: stats } = useQuery({
    queryKey: ["request-approval-stats", teamFilter],
    queryFn: async () => {
      let query = supabase
        .from("employee_requests")
        .select("status, assigned_team");
      
      if (teamFilter !== "all") {
        query = query.eq("assigned_team", teamFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const counts = {
        total: data.length,
        pending: data.filter(r => r.status === "pending").length,
        under_review: data.filter(r => r.status === "under_review").length,
        approved: data.filter(r => r.status === "approved").length,
        rejected: data.filter(r => r.status === "rejected").length,
      };

      return counts;
    },
    enabled: isAdmin || isManager,
  });

  // Fetch team counts for badges
  const { data: teamCounts } = useQuery({
    queryKey: ["request-team-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_requests")
        .select("assigned_team, status")
        .in("status", ["pending", "under_review"]);
      
      if (error) throw error;

      const counts: Record<string, number> = { all: data.length };
      data.forEach(r => {
        if (r.assigned_team) {
          counts[r.assigned_team] = (counts[r.assigned_team] || 0) + 1;
        }
      });

      return counts;
    },
    enabled: isAdmin || isManager,
  });

  if (!isAdmin && !isManager) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Request Approvals
          </h1>
          <p className="text-muted-foreground">
            Review and process employee requests
          </p>
        </div>
      </div>

      {/* Team Filter */}
      <div className="flex flex-wrap gap-2">
        {TEAMS.map((team) => {
          const Icon = team.icon;
          const count = teamCounts?.[team.id] || 0;
          const isActive = teamFilter === team.id;
          
          return (
            <Button
              key={team.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setTeamFilter(team.id)}
              className="gap-2"
            >
              <Icon className="w-4 h-4" />
              {team.label}
              {count > 0 && (
                <Badge 
                  variant={isActive ? "secondary" : "outline"} 
                  className="ml-1 text-xs px-1.5"
                >
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-muted">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab("pending")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab("under_review")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.under_review || 0}</p>
                <p className="text-xs text-muted-foreground">Under Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab("approved")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.approved || 0}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab("rejected")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.rejected || 0}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for filtering */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>
              {teamFilter === "all" ? "All Requests" : `${teamFilter} Requests`}
            </span>
            {stats?.pending ? (
              <Badge variant="destructive" className="animate-pulse">
                {stats.pending} pending approval
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="relative">
                Pending
                {stats?.pending ? (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
                    {stats.pending}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="under_review">Under Review</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            <TabsContent value="pending">
              <RequestApprovalList 
                statusFilter="pending" 
                teamFilter={teamFilter === "all" ? null : teamFilter}
                onSelectRequest={setSelectedRequestId}
              />
            </TabsContent>
            <TabsContent value="under_review">
              <RequestApprovalList 
                statusFilter="under_review" 
                teamFilter={teamFilter === "all" ? null : teamFilter}
                onSelectRequest={setSelectedRequestId}
              />
            </TabsContent>
            <TabsContent value="approved">
              <RequestApprovalList 
                statusFilter="approved" 
                teamFilter={teamFilter === "all" ? null : teamFilter}
                onSelectRequest={setSelectedRequestId}
              />
            </TabsContent>
            <TabsContent value="rejected">
              <RequestApprovalList 
                statusFilter="rejected" 
                teamFilter={teamFilter === "all" ? null : teamFilter}
                onSelectRequest={setSelectedRequestId}
              />
            </TabsContent>
            <TabsContent value="all">
              <RequestApprovalList 
                statusFilter={null} 
                teamFilter={teamFilter === "all" ? null : teamFilter}
                onSelectRequest={setSelectedRequestId}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Request Approval Sheet */}
      <RequestApprovalSheet
        requestId={selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
      />
    </div>
  );
}
