import {
  Plus,
  FileText,
  UserPlus,
  Send,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { label: "New Deal", icon: Plus, variant: "sales" as const },
  { label: "Create Quote", icon: FileText, variant: "finance" as const },
  { label: "Add Contact", icon: UserPlus, variant: "hr" as const },
  { label: "Send Campaign", icon: Send, variant: "marketing" as const },
  { label: "Schedule Meeting", icon: Calendar, variant: "tech" as const },
  { label: "Generate Report", icon: BarChart3, variant: "default" as const },
];

export function QuickActions() {
  return (
    <div className="glass rounded-xl p-6 border border-border animate-fade-in">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className="h-auto py-4 flex-col gap-2"
          >
            <action.icon className="w-5 h-5" />
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
