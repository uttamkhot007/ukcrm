import { ProjectsStats } from "./ProjectsStats";
import { ProjectsList } from "./ProjectsList";
import { ProjectTasksView } from "./ProjectTasksView";
import { ProjectMilestones } from "./ProjectMilestones";
import { TimeEntriesView } from "./TimeEntriesView";

interface ProjectsModuleProps {
  defaultTab?: string;
}

export function ProjectsModule({ defaultTab = "projects" }: ProjectsModuleProps) {
  const renderContent = () => {
    switch (defaultTab) {
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

      <div className="min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
