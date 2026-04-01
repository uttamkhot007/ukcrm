import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UserPlus, FileText, Calendar, CheckCircle,
  Clock, BookOpen, Laptop, Shield
} from "lucide-react";
import { useState } from "react";

interface OnboardingTask {
  id: string;
  label: string;
  category: string;
  completed: boolean;
}

const DEFAULT_ONBOARDING_TASKS: OnboardingTask[] = [
  { id: "1", label: "Offer letter signed", category: "Documents", completed: false },
  { id: "2", label: "Background verification initiated", category: "Documents", completed: false },
  { id: "3", label: "ID proof collected", category: "Documents", completed: false },
  { id: "4", label: "PAN card copy", category: "Documents", completed: false },
  { id: "5", label: "Bank account details", category: "Documents", completed: false },
  { id: "6", label: "IT equipment assigned", category: "IT Setup", completed: false },
  { id: "7", label: "Email account created", category: "IT Setup", completed: false },
  { id: "8", label: "Access cards issued", category: "IT Setup", completed: false },
  { id: "9", label: "Welcome orientation completed", category: "Training", completed: false },
  { id: "10", label: "Department introduction", category: "Training", completed: false },
  { id: "11", label: "Buddy assigned", category: "Training", completed: false },
  { id: "12", label: "Policy handbook acknowledged", category: "Training", completed: false },
];

export function HROnboarding() {
  const [tasks, setTasks] = useState(DEFAULT_ONBOARDING_TASKS);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = (completedCount / tasks.length) * 100;

  const categories = [...new Set(tasks.map(t => t.category))];
  const categoryIcons: Record<string, any> = {
    Documents: FileText,
    "IT Setup": Laptop,
    Training: BookOpen,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tasks.length}</p>
              <p className="text-sm text-muted-foreground">Checklist Items</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tasks.length - completedCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">Progress</p>
            <div className="flex items-center gap-3">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-sm font-medium">{progress.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map(category => {
          const Icon = categoryIcons[category] || Shield;
          const categoryTasks = tasks.filter(t => t.category === category);
          const catCompleted = categoryTasks.filter(t => t.completed).length;

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary" />
                    {category}
                  </div>
                  <Badge variant="secondary" className="text-xs">{catCompleted}/{categoryTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleTask(task.id)}
                  >
                    <Checkbox checked={task.completed} />
                    <span className={`text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                      {task.label}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
