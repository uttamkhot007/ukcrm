import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderKanban, ListTodo, Milestone, Clock } from "lucide-react";
import { ProjectsStats } from "./ProjectsStats";
import { ProjectsList } from "./ProjectsList";
import { ProjectTasksView } from "./ProjectTasksView";
import { ProjectMilestones } from "./ProjectMilestones";
import { TimeEntriesView } from "./TimeEntriesView";

interface ProjectsModuleProps {
  defaultTab?: string;
}

export function ProjectsModule({ defaultTab = "projects" }: ProjectsModuleProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Project Management</h1>
        <p className="text-muted-foreground">
          Manage projects, tasks, milestones, and time tracking
        </p>
      </div>

      <ProjectsStats />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            My Tasks
          </TabsTrigger>
          <TabsTrigger value="milestones" className="flex items-center gap-2">
            <Milestone className="h-4 w-4" />
            Milestones
          </TabsTrigger>
          <TabsTrigger value="timesheet" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timesheet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-6">
          <ProjectsList />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <ProjectTasksView />
        </TabsContent>

        <TabsContent value="milestones" className="mt-6">
          <ProjectMilestones />
        </TabsContent>

        <TabsContent value="timesheet" className="mt-6">
          <TimeEntriesView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
