import { useState } from "react";
import { ModuleVerticalNav, ModuleNavItem } from "@/components/ui/module-vertical-nav";
import { FolderKanban, ListTodo, Milestone, Clock } from "lucide-react";
import { ProjectsStats } from "./ProjectsStats";
import { ProjectsList } from "./ProjectsList";
import { ProjectTasksView } from "./ProjectTasksView";
import { ProjectMilestones } from "./ProjectMilestones";
import { TimeEntriesView } from "./TimeEntriesView";

const navItems: ModuleNavItem[] = [
  { value: "projects", label: "Projects", icon: FolderKanban },
  { value: "tasks", label: "My Tasks", icon: ListTodo },
  { value: "milestones", label: "Milestones", icon: Milestone },
  { value: "timesheet", label: "Timesheet", icon: Clock },
];

interface ProjectsModuleProps {
  defaultTab?: string;
}

export function ProjectsModule({ defaultTab = "projects" }: ProjectsModuleProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const renderContent = () => {
    switch (activeTab) {
      case "projects":
        return <ProjectsList />;
      case "tasks":
        return <ProjectTasksView />;
      case "milestones":
        return <ProjectMilestones />;
      case "timesheet":
        return <TimeEntriesView />;
      default:
        return <ProjectsList />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Project Management</h1>
        <p className="text-muted-foreground">
          Manage projects, tasks, milestones, and time tracking
        </p>
      </div>

      <ProjectsStats />

      <ModuleVerticalNav
        items={navItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
