import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MapPin, Building2, Mail, Users, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmployeeProfilePage } from "@/components/hr/EmployeeProfilePage";

const DEPARTMENTS = [
  "All Departments",
  "Sales",
  "Pre-Sales",
  "Technical",
  "Managed Services",
  "Marketing",
  "HR",
  "Admin",
  "Finance",
  "Management",
  "Inside Sales",
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-700 dark:text-green-400",
  new_hire: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  probation: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  pip: "bg-red-500/20 text-red-700 dark:text-red-400",
  notice_period: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  inactive: "bg-muted text-muted-foreground",
  terminated: "bg-destructive/20 text-destructive",
};

export default function EmployeeDirectory() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeModule, setActiveModule] = useState("hr-directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employee-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_category", "employee")
        .order("full_name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Get unique locations
  const locations = useMemo(() => {
    const uniqueLocations = [...new Set(employees.map((e) => e.location).filter(Boolean))];
    return ["All Locations", ...uniqueLocations.sort()];
  }, [employees]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        !searchQuery ||
        employee.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.employee_code?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDepartment =
        departmentFilter === "All Departments" || employee.department === departmentFilter;

      const matchesLocation =
        locationFilter === "All Locations" || employee.location === locationFilter;

      return matchesSearch && matchesDepartment && matchesLocation;
    });
  }, [employees, searchQuery, departmentFilter, locationFilter]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatStatus = (status: string | null) => {
    if (!status) return "Active";
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Show profile page if employee is selected
  if (selectedEmployee) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
        <div className="ml-64 transition-all duration-300">
          <main className="h-screen">
            <EmployeeProfilePage 
              employee={selectedEmployee}
              onBack={() => setSelectedEmployee(null)}
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      <div className="ml-64 transition-all duration-300">
        <main className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Employee Directory</h1>
                <p className="text-muted-foreground">
                  Browse and find employees across the organization
                </p>
              </div>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, title, or employee code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-[180px]">
                        <Building2 className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger className="w-[180px]">
                        <MapPin className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc: any) => (
                          <SelectItem key={String(loc)} value={String(loc)}>
                            {String(loc)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results count */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span>
                Showing {filteredEmployees.length} of {employees.length} employees
              </span>
            </div>

            {/* Employee Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-full bg-muted"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No employees found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filter criteria
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map((employee) => (
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
                              <h3 className="font-semibold truncate">
                                {employee.full_name || "Unknown"}
                              </h3>
                              <p className="text-sm text-muted-foreground truncate">
                                {employee.job_title || "No title"}
                              </p>
                            </div>
                            {employee.employment_status && (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs shrink-0",
                                  STATUS_COLORS[employee.employment_status] || STATUS_COLORS.active
                                )}
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
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
