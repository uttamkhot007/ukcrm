import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";

interface ProjectRACIProps {
  projectId: string;
  stakeholders: any[];
}

export function ProjectRACI({ projectId, stakeholders }: ProjectRACIProps) {
  const { data: raciData } = useQuery({
    queryKey: ["project-raci", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_raci")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
  });

  const getStakeholderName = (id: string) => {
    const stakeholder = stakeholders.find(s => s.id === id);
    return stakeholder?.name || "-";
  };

  const getRACIBadge = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      R: { label: "R", className: "bg-blue-500/10 text-blue-600" },
      A: { label: "A", className: "bg-red-500/10 text-red-600" },
      C: { label: "C", className: "bg-yellow-500/10 text-yellow-600" },
      I: { label: "I", className: "bg-green-500/10 text-green-600" },
    };
    const c = config[type];
    return c ? <Badge className={c.className}>{c.label}</Badge> : null;
  };

  if (!raciData || raciData.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
        <Users className="h-8 w-8 mx-auto mb-2" />
        <p>No RACI matrix defined yet</p>
        <p className="text-sm">RACI assignments will appear here once configured</p>
      </div>
    );
  }

  // Build the matrix view
  const activities = raciData.map(r => r.activity_name);
  const internalStakeholders = stakeholders.filter(s => s.stakeholder_type === "internal");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          RACI Matrix
        </CardTitle>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            {getRACIBadge("R")} <span className="text-muted-foreground">Responsible</span>
          </div>
          <div className="flex items-center gap-1">
            {getRACIBadge("A")} <span className="text-muted-foreground">Accountable</span>
          </div>
          <div className="flex items-center gap-1">
            {getRACIBadge("C")} <span className="text-muted-foreground">Consulted</span>
          </div>
          <div className="flex items-center gap-1">
            {getRACIBadge("I")} <span className="text-muted-foreground">Informed</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Activity</TableHead>
                {internalStakeholders.map((s) => (
                  <TableHead key={s.id} className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.role}</span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {raciData.map((raci) => (
                <TableRow key={raci.id}>
                  <TableCell className="font-medium">{raci.activity_name}</TableCell>
                  {internalStakeholders.map((s) => {
                    let badge = null;
                    if (raci.responsible_id === s.id) badge = getRACIBadge("R");
                    else if (raci.accountable_id === s.id) badge = getRACIBadge("A");
                    else if ((raci.consulted_ids || []).includes(s.id)) badge = getRACIBadge("C");
                    else if ((raci.informed_ids || []).includes(s.id)) badge = getRACIBadge("I");
                    
                    return (
                      <TableCell key={s.id} className="text-center">
                        {badge || "-"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
