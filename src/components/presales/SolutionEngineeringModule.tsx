import { Lightbulb } from "lucide-react";
import { POCRequestsTab } from "./POCRequestsTab";
import { DemoSchedulesTab } from "./DemoSchedulesTab";
import { TechnicalAssessmentsTab } from "./TechnicalAssessmentsTab";
import { RFPResponsesTab } from "./RFPResponsesTab";
import { PresalesWorkflowsTab } from "./PresalesWorkflowsTab";

interface SolutionEngineeringModuleProps {
  initialTab?: string;
}

export function SolutionEngineeringModule({ initialTab = "poc" }: SolutionEngineeringModuleProps) {
  const renderContent = () => {
    switch (initialTab) {
      case "poc":
        return <POCRequestsTab />;
      case "demos":
        return <DemoSchedulesTab />;
      case "assessments":
        return <TechnicalAssessmentsTab />;
      case "rfp":
        return <RFPResponsesTab />;
      case "workflows":
        return <PresalesWorkflowsTab />;
      default:
        return <POCRequestsTab />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-presales/10 flex items-center justify-center">
          <Lightbulb className="w-6 h-6 text-presales" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Solution Engineering</h1>
          <p className="text-muted-foreground">Manage POCs, demos, assessments, and presales workflows</p>
        </div>
      </div>

      <div className="min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
