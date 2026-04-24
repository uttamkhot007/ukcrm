import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, CheckCircle, AlertTriangle, Clock } from "lucide-react";

interface FrameworksListProps {
  statusFilter: string | null;
  onFrameworkSelect: (id: string) => void;
}

const frameworkIcons: Record<string, string> = {
  soc2: "🔐",
  iso27001: "📋",
  hipaa: "🏥",
  pci_dss: "💳",
  gdpr: "🇪🇺",
  nist: "🏛️",
  other: "📄",
};

export function FrameworksList({ statusFilter, onFrameworkSelect }: FrameworksListProps) {
  const { data: frameworks, isLoading } = useQuery({
    queryKey: ["compliance-frameworks", statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_frameworks")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;

      // Fetch control stats for each framework
      const frameworksWithStats = await Promise.all(
        data.map(async (framework) => {
          const { data: controls } = await supabase
            .from("compliance_controls")
            .select("status")
            .eq("framework_id", framework.id);

          const total = controls?.length || 0;
          const compliant = controls?.filter(c => c.status === "compliant").length || 0;
          const nonCompliant = controls?.filter(c => c.status === "non_compliant").length || 0;
          const inProgress = controls?.filter(c => c.status === "in_progress").length || 0;
          const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;

          let overallStatus = "not_started";
          if (total > 0) {
            if (nonCompliant > 0) overallStatus = "non_compliant";
            else if (compliant === total) overallStatus = "compliant";
            else if (inProgress > 0 || compliant > 0) overallStatus = "in_progress";
          }

          return {
            ...framework,
            total,
            compliant,
            nonCompliant,
            inProgress,
            complianceRate,
            overallStatus,
          };
        })
      );

      if (statusFilter) {
        return frameworksWithStats.filter(f => f.overallStatus === statusFilter);
      }
      return frameworksWithStats;
    },
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading frameworks...</div>;
  }

  if (!frameworks?.length) {
    return <div className="py-8 text-center text-muted-foreground">No frameworks found</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {frameworks.map((framework) => (
        <Card 
          key={framework.id} 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onFrameworkSelect(framework.id)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">{frameworkIcons[framework.type] || "📄"}</span>
                {framework.name}
              </CardTitle>
              {framework.overallStatus === "compliant" && (
                <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Compliant</Badge>
              )}
              {framework.overallStatus === "non_compliant" && (
                <Badge className="bg-red-500"><AlertTriangle className="w-3 h-3 mr-1" />Issues</Badge>
              )}
              {framework.overallStatus === "in_progress" && (
                <Badge className="bg-amber-500"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>
              )}
            </div>
            {framework.version && (
              <p className="text-sm text-muted-foreground">Version {framework.version}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Compliance Rate</span>
                <span className="font-medium">{framework.complianceRate}%</span>
              </div>
              <Progress value={framework.complianceRate} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {framework.compliant} Compliant
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  {framework.nonCompliant} Issues
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" />
                  {framework.inProgress} WIP
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
