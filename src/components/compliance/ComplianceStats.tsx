import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, CheckCircle, AlertTriangle, Clock, FileText } from "lucide-react";

export function ComplianceStats() {
  const { data: stats } = useQuery({
    queryKey: ["compliance-stats"],
    queryFn: async () => {
      const { data: controls, error } = await supabase.from("compliance_controls").select("status");
      if (error) throw error;

      const { data: frameworks, error: fwError } = await supabase.from("compliance_frameworks").select("id");
      if (fwError) throw fwError;

      const total = controls?.length || 0;
      const compliant = controls?.filter(c => c.status === "compliant").length || 0;
      const nonCompliant = controls?.filter(c => c.status === "non_compliant").length || 0;
      const inProgress = controls?.filter(c => c.status === "in_progress").length || 0;
      const notStarted = controls?.filter(c => c.status === "not_started").length || 0;
      const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;

      return { 
        frameworks: frameworks?.length || 0, 
        total, 
        compliant, 
        nonCompliant, 
        inProgress, 
        notStarted,
        complianceRate 
      };
    },
  });

  const statCards = [
    { title: "Frameworks", value: stats?.frameworks || 0, icon: Shield, color: "text-blue-500" },
    { title: "Compliance Rate", value: `${stats?.complianceRate || 0}%`, icon: CheckCircle, color: "text-green-500" },
    { title: "Compliant", value: stats?.compliant || 0, icon: CheckCircle, color: "text-green-500" },
    { title: "Non-Compliant", value: stats?.nonCompliant || 0, icon: AlertTriangle, color: "text-red-500" },
    { title: "In Progress", value: stats?.inProgress || 0, icon: Clock, color: "text-amber-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
