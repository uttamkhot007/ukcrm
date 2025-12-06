import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FrameworksList } from "./FrameworksList";
import { ComplianceStats } from "./ComplianceStats";
import { NewFrameworkDialog } from "./NewFrameworkDialog";
import { FrameworkDetailsSheet } from "./FrameworkDetailsSheet";
import { Button } from "@/components/ui/button";
import { Plus, Shield, ClipboardCheck, AlertTriangle, CheckCircle } from "lucide-react";

export function ComplianceModule() {
  const [activeTab, setActiveTab] = useState("all");
  const [isNewFrameworkOpen, setIsNewFrameworkOpen] = useState(false);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(null);

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Shield className="w-4 h-4" />
            All Frameworks
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            In Progress
          </TabsTrigger>
          <TabsTrigger value="non_compliant" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Non-Compliant
          </TabsTrigger>
          <TabsTrigger value="compliant" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Compliant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <FrameworksList statusFilter={null} onFrameworkSelect={setSelectedFrameworkId} />
        </TabsContent>
        <TabsContent value="in_progress">
          <FrameworksList statusFilter="in_progress" onFrameworkSelect={setSelectedFrameworkId} />
        </TabsContent>
        <TabsContent value="non_compliant">
          <FrameworksList statusFilter="non_compliant" onFrameworkSelect={setSelectedFrameworkId} />
        </TabsContent>
        <TabsContent value="compliant">
          <FrameworksList statusFilter="compliant" onFrameworkSelect={setSelectedFrameworkId} />
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
