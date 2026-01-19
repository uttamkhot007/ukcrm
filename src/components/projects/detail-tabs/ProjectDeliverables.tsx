import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, CheckCircle2 } from "lucide-react";

interface ProjectDeliverablesProps {
  project: any;
  phases: any[];
}

export function ProjectDeliverables({ project, phases }: ProjectDeliverablesProps) {
  const deliverables = project.deliverables || [];
  
  // Group deliverables by phase
  const deliverablesByPhase = deliverables.reduce((acc: Record<number, any[]>, d: any) => {
    const phase = d.phase || 1;
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(d);
    return acc;
  }, {});

  const getPhaseInfo = (phaseNumber: number) => {
    return phases.find(p => p.phase_number === phaseNumber);
  };

  if (deliverables.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
        <FileText className="h-8 w-8 mx-auto mb-2" />
        <p>No deliverables defined yet</p>
        <p className="text-sm">Deliverables will appear here once added to the project</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(deliverablesByPhase).map(([phaseNum, items]) => {
        const phase = getPhaseInfo(parseInt(phaseNum));
        return (
          <Card key={phaseNum}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {phaseNum}
                </div>
                <CardTitle className="text-lg">
                  {phase?.name || `Phase ${phaseNum}`}
                </CardTitle>
                <Badge variant="outline" className="ml-auto">
                  {(items as any[]).length} deliverables
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {(items as any[]).map((deliverable: any, index: number) => (
                  <div 
                    key={index} 
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{deliverable.name}</h4>
                      {deliverable.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {deliverable.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
