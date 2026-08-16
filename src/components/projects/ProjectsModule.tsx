import { useState } from "react";
import { ProjectsStats } from "./ProjectsStats";
import { ProjectsList } from "./ProjectsList";
import { ProjectTasksView } from "./ProjectTasksView";
import { ProjectMilestones } from "./ProjectMilestones";
import { TimeEntriesView } from "./TimeEntriesView";
import { ProjectIntelligenceDashboard } from "./ProjectIntelligenceDashboard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderKanban, ListTodo, Flag, Clock, Brain } from "lucide-react";

interface ProjectsModuleProps {
  defaultTab?: string;
}

const TABS = [
  { id: "projects", label: "Projects", icon: FolderKanban, component: ProjectsList },
  { id: "tasks", label: "Tasks", icon: ListTodo, component: ProjectTasksView },
  { id: "milestones", label: "Milestones", icon: Flag, component: ProjectMilestones },
  { id: "timesheet", label: "Timesheet", icon: Clock, component: TimeEntriesView },
  { id: "intelligence", label: "Intelligence", icon: Brain, component: ProjectIntelligenceDashboard },
];

export function ProjectsModule({ defaultTab = "projects" }: ProjectsModuleProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const activeTabDef = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const ActiveComponent = activeTabDef.component;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Project Management</h1>
        <p className="text-muted-foreground">
          Manage projects, tasks, milestones, time tracking and AI delivery insights
        </p>
      </div>

      <ProjectsStats />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 flex-wrap h-auto py-2 gap-1">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2 data-[state=active]:bg-background">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="min-w-0">
        <ActiveComponent />
      </div>
    </div>
  );
}
