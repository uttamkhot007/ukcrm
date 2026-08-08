import { useState, useEffect } from "react";
import { supabase } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Check,
  Loader2,
  Plus,
  Search,
  Edit2,
  Save,
  X,
  Cake,
  CalendarHeart,
  MapPin,
  Briefcase,
  Building2,
  UserCheck,
  Eye,
  Landmark,
  Shield,
  Wallet,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamType } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeProfilePage } from "@/components/hr/EmployeeProfilePage";

const TEAMS: { value: TeamType; label: string; color: string; departments?: string[] }[] = [
  { value: "sales", label: "Sales", color: "bg-sales/20 text-sales border-sales/30", departments: ["Sales"] },
  { value: "presales", label: "Pre-Sales", color: "bg-primary/20 text-primary border-primary/30", departments: ["Pre-Sales", "Sales"] },
  { value: "inside_sales", label: "Inside Sales", color: "bg-orange-500/20 text-orange-500 border-orange-500/30", departments: ["Inside Sales", "Sales"] },
  { value: "technical", label: "Technical", color: "bg-tech/20 text-tech border-tech/30", departments: ["Technical"] },
  { value: "managed_services", label: "Managed Services", color: "bg-support/20 text-support border-support/30", departments: ["Managed Services", "Technical"] },
  { value: "management", label: "Management", color: "bg-management/20 text-management border-management/30", departments: ["Management"] },
  { value: "hr", label: "HR", color: "bg-hr/20 text-hr border-hr/30", departments: ["HR"] },
  { value: "finance", label: "Finance", color: "bg-finance/20 text-finance border-finance/30", departments: ["Finance"] },
  { value: "marketing", label: "Marketing", color: "bg-marketing/20 text-marketing border-marketing/30", departments: ["Marketing"] },
  { value: "accounts", label: "Accounts", color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30", departments: ["Accounts", "Finance"] },
  { value: "admin", label: "Admin", color: "bg-muted text-muted-foreground border-border", departments: ["Admin", "HR"] },
  { value: "renewals", label: "Renewals", color: "bg-amber-500/20 text-amber-600 border-amber-500/30" },
];

// Get teams relevant to an employee's department
const getRelevantTeams = (department: string | null) => {
  if (!department) return TEAMS;
  
  // Always show the matching department team first, then renewals, then others
  const matchingTeams = TEAMS.filter(
    (team) => team.departments?.some((d) => d.toLowerCase() === department.toLowerCase())
  );
  const renewalsTeam = TEAMS.find((team) => team.value === "renewals");
  const otherTeams = TEAMS.filter(
    (team) => 
      !team.departments?.some((d) => d.toLowerCase() === department.toLowerCase()) && 
      team.value !== "renewals"
  );
  
  return [...matchingTeams, ...(renewalsTeam ? [renewalsTeam] : []), ...otherTeams];
};

const SALES_SUB_TEAMS = [
  { value: "commercial", label: "Commercial" },
  { value: "enterprise_govt", label: "Enterprise & Govt" },
  { value: "bfsi", label: "BFSI" },
  { value: "international", label: "International" },
  { value: "alliance_india", label: "Alliance-India" },
];

const EMPLOYMENT_STATUS = [
  { value: "active", label: "Active", color: "bg-green-500/20 text-green-600 border-green-500/30" },
  { value: "new_hire", label: "New Hire", color: "bg-blue-500/20 text-blue-600 border-blue-500/30" },
  { value: "probation", label: "Probation", color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" },
  { value: "pip", label: "PIP", color: "bg-red-500/20 text-red-600 border-red-500/30" },
  { value: "notice_period", label: "Notice Period", color: "bg-orange-500/20 text-orange-600 border-orange-500/30" },
  { value: "inactive", label: "Inactive", color: "bg-muted text-muted-foreground border-border" },
  { value: "terminated", label: "Terminated", color: "bg-destructive/20 text-destructive border-destructive/30" },
];

interface Employee {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  birth_date: string | null;
  hire_date: string | null;
  job_title: string | null;
  department: string | null;
  employee_code: string | null;
  location: string | null;
  anniversary_date: string | null;
  manager_id: string | null;
  employment_status: string | null;
  sales_sub_team: string | null;
  teams: TeamType[];
  // Bank details
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
  bank_branch: string | null;
  // ESI details
  esi_number: string | null;
  esi_dispensary: string | null;
  // PF details
  pf_number: string | null;
  uan_number: string | null;
  // Gratuity details
  gratuity_nomination_name: string | null;
  gratuity_nomination_relation: string | null;
  gratuity_nomination_percentage: number | null;
}

interface SalesTeam {
  id: string;
  team_code: string;
  name: string;
  leader_id: string | null;
}

export function EmployeesManagement() {
  const { currentTenant, isSuperAdmin } = useTenant();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salesTeams, setSalesTeams] = useState<SalesTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  const fetchEmployees = async () => {
    if (!currentTenant) {
      setEmployees([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Get tenant members first to know which users belong to this tenant
    const tenantMembersResult = await supabase
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", currentTenant.id)
      .eq("status", "active");

    if (tenantMembersResult.error) {
      toast({
        title: "Error",
        description: "Failed to fetch tenant members",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const tenantUserIds = tenantMembersResult.data.map(m => m.user_id);

    // Filter employees strictly by tenant_id for proper data isolation
    const [profilesResult, userTeamsResult, salesTeamsResult] = await Promise.all([
      supabase.from("profiles_safe").select("*").eq("tenant_id", currentTenant.id),
      supabase.from("user_teams").select("*"),
      supabase.from("sales_teams").select("*"),
    ]);

    if (profilesResult.error) {
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (userTeamsResult.error) {
      toast({
        title: "Error",
        description: "Failed to fetch teams",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (salesTeamsResult.data) {
      setSalesTeams(salesTeamsResult.data);
    }

    // Filter out super admin users - they won't be visible to regular admins
    // (is_super_admin will always be false for non-super-admins due to the view)
    const employeesWithTeams: Employee[] = profilesResult.data
      .filter((profile: any) => !profile.is_super_admin)
      .map((profile: any) => {
        const teams = userTeamsResult.data
          .filter((t) => t.user_id === profile.user_id)
          .map((t) => t.team as TeamType);
        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          birth_date: profile.birth_date,
          hire_date: profile.hire_date,
          job_title: profile.job_title,
          department: profile.department,
          employee_code: profile.employee_code,
          location: profile.location,
          anniversary_date: profile.anniversary_date,
          manager_id: profile.manager_id,
          employment_status: profile.employment_status || "active",
          sales_sub_team: profile.sales_sub_team,
          teams,
          // Bank details
          bank_name: profile.bank_name,
          bank_account_number: profile.bank_account_number,
          bank_ifsc_code: profile.bank_ifsc_code,
          bank_branch: profile.bank_branch,
          // ESI details
          esi_number: profile.esi_number,
          esi_dispensary: profile.esi_dispensary,
          // PF details
          pf_number: profile.pf_number,
          uan_number: profile.uan_number,
          // Gratuity details
          gratuity_nomination_name: profile.gratuity_nomination_name,
          gratuity_nomination_relation: profile.gratuity_nomination_relation,
          gratuity_nomination_percentage: profile.gratuity_nomination_percentage,
        };
      });

    setEmployees(employeesWithTeams);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, [currentTenant]);

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
        fetchEmployees();
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
        fetchEmployees();
      }
    }

    setUpdatingUser(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = EMPLOYMENT_STATUS.find((s) => s.value === status);
    return statusConfig?.color || "bg-muted text-muted-foreground";
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditForm({
      full_name: employee.full_name || "",
      job_title: employee.job_title || "",
      department: employee.department || "",
      location: employee.location || "",
      employee_code: employee.employee_code || "",
      birth_date: employee.birth_date || "",
      hire_date: employee.hire_date || "",
      anniversary_date: employee.anniversary_date || "",
      employment_status: employee.employment_status || "active",
      sales_sub_team: employee.sales_sub_team || "",
      manager_id: employee.manager_id || "",
      // Bank details
      bank_name: employee.bank_name || "",
      bank_account_number: employee.bank_account_number || "",
      bank_ifsc_code: employee.bank_ifsc_code || "",
      bank_branch: employee.bank_branch || "",
      // ESI details
      esi_number: employee.esi_number || "",
      esi_dispensary: employee.esi_dispensary || "",
      // PF details
      pf_number: employee.pf_number || "",
      uan_number: employee.uan_number || "",
      // Gratuity details
      gratuity_nomination_name: employee.gratuity_nomination_name || "",
      gratuity_nomination_relation: employee.gratuity_nomination_relation || "",
      gratuity_nomination_percentage: employee.gratuity_nomination_percentage || 100,
    });
  };

  const saveEmployee = async () => {
    if (!editingEmployee) return;
    setSavingEmployee(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editForm.full_name || null,
        job_title: editForm.job_title || null,
        department: editForm.department || null,
        location: editForm.location || null,
        employee_code: editForm.employee_code || null,
        birth_date: editForm.birth_date || null,
        hire_date: editForm.hire_date || null,
        anniversary_date: editForm.anniversary_date || null,
        employment_status: (editForm.employment_status || "active") as any,
        sales_sub_team: (editForm.sales_sub_team || null) as any,
        manager_id: editForm.manager_id || null,
        // Bank details
        bank_name: editForm.bank_name || null,
        bank_account_number: editForm.bank_account_number || null,
        bank_ifsc_code: editForm.bank_ifsc_code || null,
        bank_branch: editForm.bank_branch || null,
        // ESI details
        esi_number: editForm.esi_number || null,
        esi_dispensary: editForm.esi_dispensary || null,
        // PF details
        pf_number: editForm.pf_number || null,
        uan_number: editForm.uan_number || null,
        // Gratuity details
        gratuity_nomination_name: editForm.gratuity_nomination_name || null,
        gratuity_nomination_relation: editForm.gratuity_nomination_relation || null,
        gratuity_nomination_percentage: editForm.gratuity_nomination_percentage || null,
      })
      .eq("user_id", editingEmployee.user_id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      fetchEmployees();
      setEditingEmployee(null);
    }

    setSavingEmployee(false);
  };

  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase();
    return (
      emp.full_name?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.employee_code?.toLowerCase().includes(query) ||
      emp.department?.toLowerCase().includes(query)
    );
  });

  // Allow any employee to be selected as manager for flexibility
  const managers = employees;

  // Get sales team leader info for auto-population
  const getSalesTeamForManager = (managerId: string): string | null => {
    const salesTeam = salesTeams.find(t => t.leader_id === managerId);
    return salesTeam?.team_code || null;
  };

  const getManagerForSalesTeam = (teamCode: string): string | null => {
    const salesTeam = salesTeams.find(t => t.team_code === teamCode);
    return salesTeam?.leader_id || null;
  };

  // Handle manager change with auto-population
  const handleManagerChange = (managerId: string) => {
    const newManagerId = managerId === "none" ? "" : managerId;
    const updates: Partial<Employee> = { manager_id: newManagerId };
    
    // If manager is a sales team leader, auto-set the sales sub-team
    if (newManagerId) {
      const salesTeamCode = getSalesTeamForManager(newManagerId);
      if (salesTeamCode) {
        updates.sales_sub_team = salesTeamCode;
        // Also set department to Sales if not already
        if (editForm.department !== "Sales") {
          updates.department = "Sales";
        }
      }
    }
    
    setEditForm(prev => ({ ...prev, ...updates }));
  };

  // Handle sales sub-team change with auto-population
  const handleSalesSubTeamChange = (teamCode: string) => {
    const updates: Partial<Employee> = { sales_sub_team: teamCode };
    
    // Auto-set the manager to the team leader
    const leaderId = getManagerForSalesTeam(teamCode);
    if (leaderId) {
      updates.manager_id = leaderId;
    }
    
    setEditForm(prev => ({ ...prev, ...updates }));
  };

  // Show profile page if viewing employee
  if (viewingEmployee) {
    return (
      <EmployeeProfilePage 
        employee={viewingEmployee as any}
        onBack={() => setViewingEmployee(null)}
        onEdit={(emp) => {
          setViewingEmployee(null);
          openEditDialog(viewingEmployee);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Employees</h2>
            <p className="text-sm text-muted-foreground">{employees.length} total employees</p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {EMPLOYMENT_STATUS.map((status) => (
          <Badge key={status.value} variant="outline" className={cn("text-xs cursor-pointer hover:opacity-80", status.color)}>
            {status.label}
          </Badge>
        ))}
      </div>

      {/* Employee Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse border rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-muted"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="border rounded-xl p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No employees found</h3>
          <p className="text-muted-foreground">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              className="border rounded-xl p-5 hover:shadow-md transition-all hover:border-primary/50 bg-card"
            >
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold text-lg shrink-0">
                  {employee.full_name?.slice(0, 2).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{employee.full_name || "Unknown"}</h3>
                      <p className="text-sm text-muted-foreground truncate">{employee.job_title || "No title"}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingEmployee(employee)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(employee)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {employee.employee_code && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {employee.employee_code}
                      </Badge>
                    )}
                    <Badge variant="outline" className={cn("text-xs", getStatusBadge(employee.employment_status || "active"))}>
                      {EMPLOYMENT_STATUS.find((s) => s.value === employee.employment_status)?.label || "Active"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="mt-4 space-y-2 text-sm">
                {employee.department && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{employee.department}</span>
                  </div>
                )}
                {employee.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{employee.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Cake className="w-4 h-4 text-pink-500" />
                    <span>{employee.birth_date ? format(parseISO(employee.birth_date), "MMM d") : "—"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarHeart className="w-4 h-4 text-purple-500" />
                    <span>{employee.hire_date ? format(parseISO(employee.hire_date), "MMM yyyy") : "—"}</span>
                  </div>
                </div>
                {employee.manager_id && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserCheck className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate">
                      Reports to: {employees.find((e) => e.user_id === employee.manager_id)?.full_name || "Unknown"}
                    </span>
                  </div>
                )}
              </div>

              {/* Teams */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Team Assignments</p>
                <div className="flex flex-wrap gap-1.5">
                  {getRelevantTeams(employee.department).slice(0, 6).map((team) => {
                    const hasTeam = employee.teams.includes(team.value);
                    const isRelevant = team.departments?.some(
                      (d) => d.toLowerCase() === employee.department?.toLowerCase()
                    ) || team.value === "renewals";
                    return (
                      <Button
                        key={team.value}
                        variant="outline"
                        size="sm"
                        disabled={updatingUser === employee.user_id}
                        onClick={() => toggleTeam(employee.user_id, team.value, employee.teams)}
                        className={cn(
                          "text-xs h-7 px-2 transition-all",
                          hasTeam && team.color,
                          hasTeam && "border",
                          !hasTeam && !isRelevant && "opacity-40"
                        )}
                      >
                        {updatingUser === employee.user_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
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
                {employee.teams.includes("sales") && employee.sales_sub_team && (
                  <Badge variant="secondary" className="text-xs mt-2">
                    {SALES_SUB_TEAMS.find((t) => t.value === employee.sales_sub_team)?.label}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Employee Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee: {editingEmployee?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editForm.full_name || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Employee Code</Label>
              <Input
                value={editForm.employee_code || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, employee_code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={editForm.job_title || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, job_title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={editForm.department || ""}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, department: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard User">Standard User</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Pre-Sales">Pre-Sales</SelectItem>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="Managed Services">Managed Services</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
                  <SelectItem value="Inside Sales">Inside Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={editForm.location || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Employment Status</Label>
              <Select
                value={editForm.employment_status || "active"}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, employment_status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Birth Date</Label>
              <Input
                type="date"
                value={editForm.birth_date || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, birth_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Joining Date</Label>
              <Input
                type="date"
                value={editForm.hire_date || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, hire_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Anniversary Date</Label>
              <Input
                type="date"
                value={editForm.anniversary_date || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, anniversary_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Manager</Label>
              <Select
                value={editForm.manager_id || "none"}
                onValueChange={handleManagerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {managers
                    .filter(m => m.user_id !== editingEmployee?.user_id)
                    .map((manager) => {
                      const isTeamLeader = salesTeams.some(t => t.leader_id === manager.user_id);
                      const teamName = salesTeams.find(t => t.leader_id === manager.user_id)?.name;
                      return (
                        <SelectItem key={manager.user_id} value={manager.user_id}>
                          {manager.full_name}
                          {isTeamLeader && ` (${teamName} Leader)`}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecting a sales team leader will auto-set the sub-team
              </p>
            </div>
            {editForm.department === "Sales" && (
              <div className="space-y-2 col-span-2">
                <Label>Sales Sub-Team</Label>
                <Select
                  value={editForm.sales_sub_team || ""}
                  onValueChange={handleSalesSubTeamChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sales team" />
                  </SelectTrigger>
                  <SelectContent>
                    {SALES_SUB_TEAMS.map((team) => {
                      const salesTeam = salesTeams.find(t => t.team_code === team.value);
                      const leader = salesTeam?.leader_id 
                        ? employees.find(e => e.user_id === salesTeam.leader_id)?.full_name
                        : null;
                      return (
                        <SelectItem key={team.value} value={team.value}>
                          {team.label}
                          {leader && ` (Leader: ${leader})`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecting a team will auto-set the manager to the team leader
                </p>
              </div>
            )}

            {/* Bank Details Section */}
            <div className="col-span-2 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Landmark className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold">Bank Details</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={editForm.bank_name || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                    placeholder="e.g., HDFC Bank"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input
                    value={editForm.bank_branch || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, bank_branch: e.target.value }))}
                    placeholder="Branch name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={editForm.bank_account_number || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, bank_account_number: e.target.value }))}
                    placeholder="Account number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input
                    value={editForm.bank_ifsc_code || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, bank_ifsc_code: e.target.value.toUpperCase() }))}
                    placeholder="e.g., HDFC0001234"
                  />
                </div>
              </div>
            </div>

            {/* ESI & PF Section */}
            <div className="col-span-2 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold">ESI & PF Details</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ESI Number</Label>
                  <Input
                    value={editForm.esi_number || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, esi_number: e.target.value }))}
                    placeholder="ESI Insurance Number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ESI Dispensary</Label>
                  <Input
                    value={editForm.esi_dispensary || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, esi_dispensary: e.target.value }))}
                    placeholder="Dispensary name/location"
                  />
                </div>
                <div className="space-y-2">
                  <Label>PF Number</Label>
                  <Input
                    value={editForm.pf_number || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, pf_number: e.target.value }))}
                    placeholder="PF Account Number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UAN Number</Label>
                  <Input
                    value={editForm.uan_number || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, uan_number: e.target.value }))}
                    placeholder="Universal Account Number"
                  />
                </div>
              </div>
            </div>

            {/* Gratuity Section */}
            <div className="col-span-2 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold">Gratuity Nomination</Label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nominee Name</Label>
                  <Input
                    value={editForm.gratuity_nomination_name || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, gratuity_nomination_name: e.target.value }))}
                    placeholder="Full name of nominee"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Input
                    value={editForm.gratuity_nomination_relation || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, gratuity_nomination_relation: e.target.value }))}
                    placeholder="e.g., Spouse, Son"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Percentage (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.gratuity_nomination_percentage || 100}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, gratuity_nomination_percentage: Number(e.target.value) }))}
                    placeholder="100"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2 mt-4">
              <Button onClick={saveEmployee} disabled={savingEmployee} className="w-full">
                {savingEmployee ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
