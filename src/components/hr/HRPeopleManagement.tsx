import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Users, TrendingUp, AlertCircle, FileText,
  Target, Search, Star, Award, ChevronRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useState } from "react";

export function HRPeopleManagement() {
  const { currentTenant } = useTenant();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-people", currentTenant?.id],
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

  const pipCount = employees.filter(e => e.employment_status === "pip").length;
  const probationCount = employees.filter(e => e.employment_status === "probation").length;
  const noticePeriod = employees.filter(e => e.employment_status === "notice_period").length;

  const filteredEmployees = employees.filter(e =>
    !searchQuery || e.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employees.length}</p>
              <p className="text-sm text-muted-foreground">Total Employees</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{probationCount}</p>
              <p className="text-sm text-muted-foreground">On Probation</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pipCount}</p>
              <p className="text-sm text-muted-foreground">On PIP</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{noticePeriod}</p>
              <p className="text-sm text-muted-foreground">Notice Period</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search employees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Performance Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredEmployees.slice(0, 5).map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{emp.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{emp.department || "No dept"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`w-3 h-3 ${i <= 3 ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                </div>
              ))}
              {employees.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No employees found</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              PIP Tracker
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pipCount === 0 ? (
              <div className="text-center py-6">
                <Award className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">No employees on PIP</p>
              </div>
            ) : (
              <div className="space-y-3">
                {employees.filter(e => e.employment_status === "pip").map(emp => (
                  <div key={emp.id} className="p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                    <p className="font-medium text-sm">{emp.full_name}</p>
                    <p className="text-xs text-muted-foreground">{emp.department}</p>
                    <Progress value={50} className="h-1 mt-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              Exit Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {noticePeriod === 0 ? (
              <div className="text-center py-6">
                <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No employees in exit process</p>
              </div>
            ) : (
              <div className="space-y-3">
                {employees.filter(e => e.employment_status === "notice_period").map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
                    <div>
                      <p className="font-medium text-sm">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground">{emp.department}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
