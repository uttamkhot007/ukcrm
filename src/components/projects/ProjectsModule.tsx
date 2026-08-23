import { useState } from "react";
import { ProjectsStats } from "./ProjectsStats";
import { ProjectsList } from "./ProjectsList";
import { TimeEntriesView } from "./TimeEntriesView";
import { ProjectIntelligenceDashboard } from "./ProjectIntelligenceDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, FolderKanban, Clock } from "lucide-react";

interface ProjectsModuleProps {
  defaultTab?: string;
}

function ProjectsOverview() {
  return (
    <div className="space-y-6">
      <ProjectsStats />
      <ProjectIntelligenceDashboard />
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, component: ProjectsOverview },
  { id: "projects", label: "All Projects", icon: FolderKanban, component: ProjectsList },
  { id: "timesheet", label: "Timesheets", icon: Clock, component: TimeEntriesView },
];

export function ProjectsModule({ defaultTab = "overview" }: ProjectsModuleProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const activeTabDef = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const ActiveComponent = activeTabDef.component;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Project Management</h1>
        <p className="text-muted-foreground">
          Delivery dashboards, project portfolio and time tracking — tasks and milestones live inside each project
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 flex-wrap h-auto py-2 gap-1">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2 data-[state=active]:bg-background">
              <tab.icon className="h-4 w-4" aria-hidden="true" />
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-6 min-w-0">
            {tab.id === activeTab ? <ActiveComponent /> : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
