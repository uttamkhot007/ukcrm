import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronDown, ChevronRight, Users, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { TeamType } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEAMS: { value: TeamType | "all"; label: string; color: string }[] = [
  { value: "all", label: "All Teams", color: "bg-muted text-muted-foreground" },
  { value: "sales", label: "Sales", color: "bg-sales/20 text-sales" },
  { value: "presales", label: "Pre-Sales", color: "bg-primary/20 text-primary" },
  { value: "inside_sales", label: "Inside Sales", color: "bg-orange-500/20 text-orange-500" },
  { value: "technical", label: "Technical", color: "bg-tech/20 text-tech" },
  { value: "managed_services", label: "Managed Services", color: "bg-support/20 text-support" },
  { value: "management", label: "Management", color: "bg-management/20 text-management" },
  { value: "hr", label: "HR", color: "bg-hr/20 text-hr" },
  { value: "finance", label: "Finance", color: "bg-finance/20 text-finance" },
  { value: "marketing", label: "Marketing", color: "bg-marketing/20 text-marketing" },
  { value: "accounts", label: "Accounts", color: "bg-emerald-500/20 text-emerald-600" },
  { value: "admin", label: "Admin", color: "bg-slate-500/20 text-slate-600" },
  { value: "renewals", label: "Renewals", color: "bg-amber-500/20 text-amber-600" },
];

interface Employee {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  job_title: string | null;
  department: string | null;
  manager_id: string | null;
  teams: TeamType[];
}

interface OrgNode {
  employee: Employee;
  children: OrgNode[];
}

function OrgNodeCard({ node, level = 0, expandedNodes, toggleNode }: { 
  node: OrgNode; 
  level?: number;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(node.employee.user_id);
  const teamConfig = TEAMS.find(t => node.employee.teams.includes(t.value as TeamType));

  return (
    <div className="relative">
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer",
          level === 0 && "border-primary/30 bg-primary/5"
        )}
        onClick={() => hasChildren && toggleNode(node.employee.user_id)}
        style={{ marginLeft: `${level * 24}px` }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )
        ) : (
          <div className="w-4" />
        )}
        
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold shrink-0">
          {node.employee.full_name?.slice(0, 2).toUpperCase() || "U"}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{node.employee.full_name || "Unknown"}</p>
          <p className="text-sm text-muted-foreground truncate">{node.employee.job_title || "No title"}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {node.employee.department && (
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
              {node.employee.department}
            </span>
          )}
          {node.employee.teams.slice(0, 2).map(team => {
            const config = TEAMS.find(t => t.value === team);
            return (
              <span key={team} className={cn("text-xs px-2 py-1 rounded-full", config?.color)}>
                {config?.label || team}
              </span>
            );
          })}
          {hasChildren && (
            <span className="text-xs text-muted-foreground">
              ({node.children.length})
            </span>
          )}
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2 relative before:absolute before:left-[calc(12px+${level}*24px)] before:top-0 before:bottom-4 before:w-px before:bg-border">
          {node.children.map((child) => (
            <OrgNodeCard 
              key={child.employee.user_id} 
              node={child} 
              level={level + 1}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgStructureView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamType | "all">("all");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const fetchEmployees = async () => {
    setIsLoading(true);

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) {
      toast({
        title: "Error",
        description: "Failed to fetch employees",
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

    const employeesWithTeams: Employee[] = profiles.map((profile: any) => {
      const teams = userTeams
        .filter((t) => t.user_id === profile.user_id)
        .map((t) => t.team as TeamType);
      return {
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email,
        job_title: profile.job_title,
        department: profile.department,
        manager_id: profile.manager_id,
        teams,
      };
    });

    setEmployees(employeesWithTeams);
    // Auto-expand top level
    const topLevel = employeesWithTeams.filter(e => !e.manager_id);
    setExpandedNodes(new Set(topLevel.map(e => e.user_id)));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedNodes(new Set(employees.map(e => e.user_id)));
  };

  const collapseAll = () => {
    const topLevel = employees.filter(e => !e.manager_id);
    setExpandedNodes(new Set(topLevel.map(e => e.user_id)));
  };

  // Build org tree
  const orgTree = useMemo(() => {
    // Filter by team if selected
    let filteredEmployees = employees;
    if (selectedTeam !== "all") {
      filteredEmployees = employees.filter(e => e.teams.includes(selectedTeam));
    }

    const employeeMap = new Map<string, Employee>();
    filteredEmployees.forEach(e => employeeMap.set(e.user_id, e));

    const buildTree = (managerId: string | null): OrgNode[] => {
      return filteredEmployees
        .filter(e => e.manager_id === managerId)
        .map(e => ({
          employee: e,
          children: buildTree(e.user_id),
        }));
    };

    // Start from employees without manager or whose manager is not in filtered list
    const roots = filteredEmployees.filter(e => 
      !e.manager_id || !employeeMap.has(e.manager_id)
    );

    return roots.map(e => ({
      employee: e,
      children: buildTree(e.user_id),
    }));
  }, [employees, selectedTeam]);

  // Stats
  const stats = useMemo(() => {
    const teamCounts: Record<string, number> = {};
    employees.forEach(e => {
      e.teams.forEach(t => {
        teamCounts[t] = (teamCounts[t] || 0) + 1;
      });
    });
    return teamCounts;
  }, [employees]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Organization Structure</h2>
            <p className="text-muted-foreground text-sm">
              View the reporting hierarchy across all teams
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedTeam} onValueChange={(v) => setSelectedTeam(v as TeamType | "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              {TEAMS.map(team => (
                <SelectItem key={team.value} value={team.value}>
                  {team.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button 
            onClick={expandAll}
            className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Expand All
          </button>
          <button 
            onClick={collapseAll}
            className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Collapse
          </button>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {TEAMS.filter(t => t.value !== "all").map(team => (
          <div
            key={team.value}
            className={cn(
              "p-3 rounded-lg border cursor-pointer transition-all",
              selectedTeam === team.value 
                ? "border-primary bg-primary/10" 
                : "border-border hover:border-primary/50"
            )}
            onClick={() => setSelectedTeam(selectedTeam === team.value ? "all" : team.value)}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{team.label}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats[team.value] || 0}</p>
          </div>
        ))}
      </div>

      {/* Org Tree */}
      <div className="glass rounded-xl border border-border p-6">
        {orgTree.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No employees found in this team</p>
            <p className="text-sm mt-1">
              {selectedTeam !== "all" 
                ? "Try selecting 'All Teams' or assign users to this team"
                : "Add employees and set their managers to see the hierarchy"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orgTree.map((node) => (
              <OrgNodeCard 
                key={node.employee.user_id} 
                node={node}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="glass rounded-xl border border-border p-4">
        <h3 className="font-semibold mb-3">How to Use</h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>• <strong>Set Managers:</strong> Go to Users → Employees and edit each employee to assign their manager</p>
          <p>• <strong>Filter by Team:</strong> Use the dropdown or click team cards to filter the view</p>
          <p>• <strong>Expand/Collapse:</strong> Click on any employee card with children to expand or collapse their reports</p>
        </div>
      </div>
    </div>
  );
}
