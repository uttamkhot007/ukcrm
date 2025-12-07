import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, Search, ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const presalesWorkflowTemplates = [
  {
    id: "poc_workflow",
    name: "POC Execution",
    description: "End-to-end proof of concept workflow",
    stages: [
      { name: "Requirements Gathering", icon: "📋" },
      { name: "Environment Setup", icon: "🔧" },
      { name: "Implementation", icon: "💻" },
      { name: "Testing & Validation", icon: "✅" },
      { name: "Demo & Review", icon: "🎯" },
      { name: "Documentation", icon: "📝" },
      { name: "Handoff", icon: "🤝" },
    ],
  },
  {
    id: "rfp_workflow",
    name: "RFP Response",
    description: "Complete RFP/RFI response workflow",
    stages: [
      { name: "Document Analysis", icon: "📄" },
      { name: "Team Assignment", icon: "👥" },
      { name: "Section Drafting", icon: "✏️" },
      { name: "Technical Review", icon: "🔍" },
      { name: "Management Review", icon: "👔" },
      { name: "Final Editing", icon: "📝" },
      { name: "Submission", icon: "📤" },
    ],
  },
  {
    id: "demo_workflow",
    name: "Demo Preparation",
    description: "Product demonstration preparation workflow",
    stages: [
      { name: "Requirement Analysis", icon: "📊" },
      { name: "Demo Environment", icon: "🖥️" },
      { name: "Script Preparation", icon: "📜" },
      { name: "Rehearsal", icon: "🎭" },
      { name: "Demo Delivery", icon: "🎬" },
      { name: "Follow-up", icon: "📞" },
    ],
  },
  {
    id: "technical_assessment",
    name: "Technical Assessment",
    description: "Technical evaluation and assessment workflow",
    stages: [
      { name: "Discovery Call", icon: "📞" },
      { name: "Environment Review", icon: "🔍" },
      { name: "Requirements Mapping", icon: "🗺️" },
      { name: "Gap Analysis", icon: "📊" },
      { name: "Solution Design", icon: "🎨" },
      { name: "Proposal", icon: "📋" },
    ],
  },
];

const activeWorkflows = [
  {
    id: "1",
    name: "Acme Corp POC",
    template: "POC Execution",
    currentStage: "Implementation",
    progress: 45,
    status: "on_track",
    dueDate: "2024-02-15",
  },
  {
    id: "2",
    name: "Global Tech RFP",
    template: "RFP Response",
    currentStage: "Technical Review",
    progress: 60,
    status: "at_risk",
    dueDate: "2024-02-10",
  },
  {
    id: "3",
    name: "StartupXYZ Demo",
    template: "Demo Preparation",
    currentStage: "Script Preparation",
    progress: 50,
    status: "on_track",
    dueDate: "2024-02-08",
  },
];

export function PresalesWorkflowsTab() {
  const [searchQuery, setSearchQuery] = useState("");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "on_track":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "at_risk":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "delayed":
        return <Clock className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "on_track":
        return <Badge className="bg-green-500/20 text-green-500">On Track</Badge>;
      case "at_risk":
        return <Badge className="bg-yellow-500/20 text-yellow-500">At Risk</Badge>;
      case "delayed":
        return <Badge className="bg-red-500/20 text-red-500">Delayed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Active Workflows Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Active Workflows
            </h2>
            <p className="text-sm text-muted-foreground">Currently running presales workflows</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {activeWorkflows.map((workflow) => (
            <div
              key={workflow.id}
              className="glass rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(workflow.status)}
                    <h3 className="font-semibold">{workflow.name}</h3>
                    {getStatusBadge(workflow.status)}
                    <Badge variant="outline">{workflow.template}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Current Stage:</span>
                    <span className="font-medium text-foreground">{workflow.currentStage}</span>
                    <span className="mx-2">•</span>
                    <span>Due: {workflow.dueDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold">{workflow.progress}%</p>
                    <p className="text-xs text-muted-foreground">Complete</p>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow Templates Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Workflow Templates</h2>
          <p className="text-sm text-muted-foreground">Start a new presales workflow from a template</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {presalesWorkflowTemplates.map((template) => (
            <Card key={template.id} className="glass border-border hover:bg-muted/30 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {template.stages.map((stage, index) => (
                      <div key={index} className="flex items-center">
                        <span className="text-xs bg-muted px-2 py-1 rounded-full flex items-center gap-1">
                          <span>{stage.icon}</span>
                          {stage.name}
                        </span>
                        {index < template.stages.length - 1 && (
                          <ArrowRight className="w-3 h-3 mx-1 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Start Workflow
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">12</p>
              <p className="text-sm text-muted-foreground">Active Workflows</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">8</p>
              <p className="text-sm text-muted-foreground">On Track</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-500">3</p>
              <p className="text-sm text-muted-foreground">At Risk</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">1</p>
              <p className="text-sm text-muted-foreground">Delayed</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}