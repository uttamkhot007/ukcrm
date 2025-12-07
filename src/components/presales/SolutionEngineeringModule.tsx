import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, Presentation, ClipboardCheck, FileText, GitBranch } from "lucide-react";
import { POCRequestsTab } from "./POCRequestsTab";
import { DemoSchedulesTab } from "./DemoSchedulesTab";
import { TechnicalAssessmentsTab } from "./TechnicalAssessmentsTab";
import { RFPResponsesTab } from "./RFPResponsesTab";
import { PresalesWorkflowsTab } from "./PresalesWorkflowsTab";

export function SolutionEngineeringModule() {
  const [activeTab, setActiveTab] = useState("poc");

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="poc" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            POC Requests
          </TabsTrigger>
          <TabsTrigger value="demos" className="flex items-center gap-2">
            <Presentation className="w-4 h-4" />
            Demos
          </TabsTrigger>
          <TabsTrigger value="assessments" className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="rfp" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            RFP/RFI
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Workflows
          </TabsTrigger>
        </TabsList>

        <TabsContent value="poc">
          <POCRequestsTab />
        </TabsContent>

        <TabsContent value="demos">
          <DemoSchedulesTab />
        </TabsContent>

        <TabsContent value="assessments">
          <TechnicalAssessmentsTab />
        </TabsContent>

        <TabsContent value="rfp">
          <RFPResponsesTab />
        </TabsContent>

        <TabsContent value="workflows">
          <PresalesWorkflowsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}