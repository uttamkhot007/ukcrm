import { useState } from "react";
import { ModuleVerticalNav, ModuleNavItem } from "@/components/ui/module-vertical-nav";
import { FrameworksList } from "./FrameworksList";
import { ComplianceStats } from "./ComplianceStats";
import { NewFrameworkDialog } from "./NewFrameworkDialog";
import { FrameworkDetailsSheet } from "./FrameworkDetailsSheet";
import { Button } from "@/components/ui/button";
import { Plus, Shield, ClipboardCheck, AlertTriangle, CheckCircle } from "lucide-react";

const navItems: ModuleNavItem[] = [
  { value: "all", label: "All Frameworks", icon: Shield },
  { value: "in_progress", label: "In Progress", icon: ClipboardCheck },
  { value: "non_compliant", label: "Non-Compliant", icon: AlertTriangle },
  { value: "compliant", label: "Compliant", icon: CheckCircle },
];

export function ComplianceModule() {
  const [activeTab, setActiveTab] = useState("all");
  const [isNewFrameworkOpen, setIsNewFrameworkOpen] = useState(false);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(null);

  const renderContent = () => {
    switch (activeTab) {
      case "all":
        return <FrameworksList statusFilter={null} onFrameworkSelect={setSelectedFrameworkId} />;
      case "in_progress":
        return <FrameworksList statusFilter="in_progress" onFrameworkSelect={setSelectedFrameworkId} />;
      case "non_compliant":
        return <FrameworksList statusFilter="non_compliant" onFrameworkSelect={setSelectedFrameworkId} />;
      case "compliant":
        return <FrameworksList statusFilter="compliant" onFrameworkSelect={setSelectedFrameworkId} />;
      default:
        return <FrameworksList statusFilter={null} onFrameworkSelect={setSelectedFrameworkId} />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Tracker</h1>
          <p className="text-muted-foreground">Manage compliance frameworks and controls</p>
        </div>
        <Button onClick={() => setIsNewFrameworkOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Framework
        </Button>
      </div>

      <ComplianceStats />

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

      <NewFrameworkDialog open={isNewFrameworkOpen} onOpenChange={setIsNewFrameworkOpen} />
      <FrameworkDetailsSheet 
        frameworkId={selectedFrameworkId} 
        open={!!selectedFrameworkId} 
        onOpenChange={(open) => !open && setSelectedFrameworkId(null)} 
      />
    </div>
  );
}
