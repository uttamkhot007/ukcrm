import { useState } from "react";
import { FrameworksList } from "./FrameworksList";
import { ComplianceStats } from "./ComplianceStats";
import { NewFrameworkDialog } from "./NewFrameworkDialog";
import { FrameworkDetailsSheet } from "./FrameworkDetailsSheet";
import { SoftwareLicenseCompliance } from "./SoftwareLicenseCompliance";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, FileCode } from "lucide-react";

interface ComplianceModuleProps {
  initialTab?: string;
}

export function ComplianceModule({ initialTab = "all" }: ComplianceModuleProps) {
  const [isNewFrameworkOpen, setIsNewFrameworkOpen] = useState(false);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("frameworks");

  const renderFrameworkContent = () => {
    switch (initialTab) {
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
          <p className="text-muted-foreground">Manage compliance frameworks and software licenses</p>
        </div>
        {activeTab === "frameworks" && (
          <Button onClick={() => setIsNewFrameworkOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Framework
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="frameworks" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Frameworks
          </TabsTrigger>
          <TabsTrigger value="software-licenses" className="flex items-center gap-2">
            <FileCode className="w-4 h-4" />
            Software Licenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="frameworks" className="space-y-6 mt-6">
          <ComplianceStats />
          <div className="min-w-0">
            {renderFrameworkContent()}
          </div>
        </TabsContent>

        <TabsContent value="software-licenses" className="mt-6">
          <SoftwareLicenseCompliance />
        </TabsContent>
      </Tabs>

      <NewFrameworkDialog open={isNewFrameworkOpen} onOpenChange={setIsNewFrameworkOpen} />
      <FrameworkDetailsSheet 
        frameworkId={selectedFrameworkId} 
        open={!!selectedFrameworkId} 
        onOpenChange={(open) => !open && setSelectedFrameworkId(null)} 
      />
    </div>
  );
}
