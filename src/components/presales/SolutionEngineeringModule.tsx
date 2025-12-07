import { useState } from "react";
import { ModuleVerticalNav, ModuleNavItem } from "@/components/ui/module-vertical-nav";
import { Lightbulb, Presentation, ClipboardCheck, FileText, GitBranch } from "lucide-react";
import { POCRequestsTab } from "./POCRequestsTab";
import { DemoSchedulesTab } from "./DemoSchedulesTab";
import { TechnicalAssessmentsTab } from "./TechnicalAssessmentsTab";
import { RFPResponsesTab } from "./RFPResponsesTab";
import { PresalesWorkflowsTab } from "./PresalesWorkflowsTab";

const navItems: ModuleNavItem[] = [
  { value: "poc", label: "POC Requests", icon: Lightbulb },
  { value: "demos", label: "Demos", icon: Presentation },
  { value: "assessments", label: "Assessments", icon: ClipboardCheck },
  { value: "rfp", label: "RFP/RFI", icon: FileText },
  { value: "workflows", label: "Workflows", icon: GitBranch },
];

export function SolutionEngineeringModule() {
  const [activeTab, setActiveTab] = useState("poc");

  const renderContent = () => {
    switch (activeTab) {
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

      <div className="flex gap-6">
        <ModuleVerticalNav
          items={navItems}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
