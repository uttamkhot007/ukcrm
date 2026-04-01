import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  UserPlus,
  Briefcase,
  Calendar,
  Search,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  AlertCircle,
  DollarSign,
  MapPin,
  Mail,
  Scale,
} from "lucide-react";
import { HRWorkflowsTab } from "./workflows/HRWorkflowsTab";
import { MoodAnalyticsDashboard } from "./MoodAnalyticsDashboard";
import { EmployeeDocumentsView } from "./EmployeeDocumentsView";
import { EmployeeProfilePage } from "./EmployeeProfilePage";
import { HRComplianceModule } from "./compliance/HRComplianceModule";
import { cn } from "@/lib/utils";
import { useTenant } from "@/contexts/TenantContext";

interface HRModuleProps {
  initialTab?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-700 dark:text-green-400",
  probation: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  pip: "bg-red-500/20 text-red-700 dark:text-red-400",
  notice_period: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  inactive: "bg-muted text-muted-foreground",
  terminated: "bg-destructive/20 text-destructive",
};

export function HRModule({ initialTab = "directory" }: HRModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const { currentTenant } = useTenant();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["hr-employees", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter(
      (e) =>
        e.full_name?.toLowerCase().includes(query) ||
        e.email?.toLowerCase().includes(query) ||
        e.department?.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.employment_status === "active").length;
    const probation = employees.filter((e) => e.employment_status === "probation").length;
    const onboarding = employees.filter((e) => !e.hire_date || new Date(e.hire_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
    return { total: employees.length, active, probation, onboarding };
  }, [employees]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatStatus = (status: string | null) => {
    if (!status) return "Active";
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const renderContent = () => {
    if (initialTab.startsWith("workflows-")) {
      const workflowType = initialTab.replace("workflows-", "");
      return <HRWorkflowsTab filterType={workflowType} />;
    }

    switch (initialTab) {
      case "directory":
        return (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredEmployees.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="p-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No employees found</h3>
                    <p className="text-muted-foreground">Try adjusting your search criteria</p>
                  </CardContent>
                </Card>
              ) : (
                filteredEmployees.map((employee) => (
                  <Card 
                    key={employee.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50"
                    onClick={() => setSelectedEmployee(employee)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-14 h-14">
                          <AvatarImage src={employee.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(employee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold truncate">{employee.full_name || "Unknown"}</h3>
                              <p className="text-sm text-muted-foreground truncate">{employee.job_title || "No title"}</p>
                            </div>
                            {employee.employment_status && (
                              <Badge 
                                variant="secondary"
                                className={cn("text-xs shrink-0", STATUS_COLORS[employee.employment_status] || STATUS_COLORS.active)}
                              >
                                {formatStatus(employee.employment_status)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

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
                        {employee.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4 shrink-0" />
                            <span className="truncate">{employee.email}</span>
                          </div>
                        )}
                        {employee.employee_code && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                              {employee.employee_code}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      case "documents":
        return <EmployeeDocumentsView />;
      case "mood-analytics":
        return <MoodAnalyticsDashboard />;
      case "people":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                People Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="w-8 h-8 mx-auto text-primary mb-2" />
                    <h4 className="font-medium">Performance Reviews</h4>
                    <p className="text-sm text-muted-foreground mt-1">Track and manage employee performance</p>
                    <Button variant="outline" size="sm" className="mt-4">Configure</Button>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <AlertCircle className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                    <h4 className="font-medium">PIP Management</h4>
                    <p className="text-sm text-muted-foreground mt-1">Performance improvement plans</p>
                    <Button variant="outline" size="sm" className="mt-4">Configure</Button>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <FileText className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                    <h4 className="font-medium">Exit Management</h4>
                    <p className="text-sm text-muted-foreground mt-1">Offboarding and exit interviews</p>
                    <Button variant="outline" size="sm" className="mt-4">Configure</Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        );
      case "salary":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Salary & Benefits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <DollarSign className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <h4 className="font-medium">Payroll Processing</h4>
                    <p className="text-sm text-muted-foreground mt-1">Monthly salary processing</p>
                    <Button variant="outline" size="sm" className="mt-4">Configure</Button>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <Briefcase className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                    <h4 className="font-medium">Benefits Administration</h4>
                    <p className="text-sm text-muted-foreground mt-1">Insurance, PF, gratuity</p>
                    <Button variant="outline" size="sm" className="mt-4">Configure</Button>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <FileText className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                    <h4 className="font-medium">Salary Slips</h4>
                    <p className="text-sm text-muted-foreground mt-1">Generate and distribute</p>
                    <Button variant="outline" size="sm" className="mt-4">Configure</Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        );
      case "compliance":
        return <HRComplianceModule />;
      case "onboarding":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Onboarding Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <UserPlus className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                    <h4 className="font-medium">New Hire Checklist</h4>
                    <p className="text-sm text-muted-foreground mt-1">Onboarding task templates</p>
                    <Button variant="outline" size="sm" className="mt-4">Configure</Button>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <FileText className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <h4 className="font-medium">Document Collection</h4>
                    <p className="text-sm text-muted-foreground mt-1">Required documents tracking</p>
                    <Button variant="outline" size="sm" className="mt-4">Configure</Button>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <Calendar className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                    <h4 className="font-medium">Training Schedule</h4>
                    <p className="text-sm text-muted-foreground mt-1">Induction programs</p>
                    <Button variant="outline" size="sm" className="mt-4">Configure</Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  // Show profile page if employee is selected
  if (selectedEmployee) {
    return (
      <EmployeeProfilePage 
        employee={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-hr/10 flex items-center justify-center">
          <Users className="w-6 h-6 text-hr" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Human Resources</h1>
          <p className="text-muted-foreground">Manage employees, payroll, and onboarding</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Employees</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.probation}</p>
              <p className="text-sm text-muted-foreground">On Probation</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.onboarding}</p>
              <p className="text-sm text-muted-foreground">New Joiners (30d)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <div className="min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
