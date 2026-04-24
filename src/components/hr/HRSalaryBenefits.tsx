import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign, Briefcase, FileText, Users,
  TrendingUp, Calculator, IndianRupee
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";

export function HRSalaryBenefits() {
  const { currentTenant } = useTenant();

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-salary", currentTenant?.id],
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

  const activeEmployees = employees.filter(e => e.employment_status === "active" || !e.employment_status);
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeEmployees.length}</p>
              <p className="text-sm text-muted-foreground">Active Payroll</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{departments.length}</p>
              <p className="text-sm text-muted-foreground">Departments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">EPF</p>
              <p className="text-sm text-muted-foreground">Compliance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">—</p>
              <p className="text-sm text-muted-foreground">Avg CTC</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll & Benefits Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              Payroll Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Current Month</p>
                <p className="text-xs text-muted-foreground">{activeEmployees.length} employees</p>
              </div>
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600">Pending</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Basic + DA</span><span>—</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">HRA</span><span>—</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Special Allowance</span><span>—</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">PF Deduction</span><span>—</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">ESI</span><span>—</span></div>
              <div className="flex justify-between text-sm font-medium border-t pt-2"><span>Net Payroll</span><span>—</span></div>
            </div>
            <Button className="w-full" variant="outline" size="sm">Process Payroll</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-500" />
              Benefits Administration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex justify-between items-center">
                <p className="font-medium text-sm">Group Health Insurance</p>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{activeEmployees.length} covered</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex justify-between items-center">
                <p className="font-medium text-sm">Provident Fund (EPF)</p>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">12% employer + 12% employee</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex justify-between items-center">
                <p className="font-medium text-sm">Gratuity</p>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">As per Payment of Gratuity Act</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              Salary Slips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-4">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Generate salary slips for employees</p>
            </div>
            <div className="space-y-2">
              {departments.slice(0, 4).map((dept: any) => (
                <div key={String(dept)} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                  <span>{String(dept)}</span>
                  <span className="text-muted-foreground">{employees.filter((e: any) => e.department === dept).length} emp</span>
                </div>
              ))}
            </div>
            <Button className="w-full" variant="outline" size="sm">Generate Slips</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
