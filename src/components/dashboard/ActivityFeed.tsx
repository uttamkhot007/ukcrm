import { cn } from "@/lib/utils";
import {
  FileText,
  UserPlus,
  DollarSign,
  CheckCircle,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

interface Activity {
  id: number;
  type: "deal" | "hire" | "payment" | "task" | "alert" | "message";
  title: string;
  description: string;
  time: string;
  user?: string;
}

const activities: Activity[] = [
  {
    id: 1,
    type: "deal",
    title: "New deal closed",
    description: "Enterprise package sold to TechCorp Inc.",
    time: "2 min ago",
    user: "Sarah M.",
  },
  {
    id: 2,
    type: "hire",
    title: "New employee onboarded",
    description: "James Wilson joined as Senior Developer",
    time: "15 min ago",
    user: "HR Team",
  },
  {
    id: 3,
    type: "payment",
    title: "Payment received",
    description: "$45,000 from Global Solutions Ltd.",
    time: "1 hour ago",
  },
  {
    id: 4,
    type: "task",
    title: "Project milestone completed",
    description: "Phase 2 of Project Apollo delivered",
    time: "2 hours ago",
    user: "Dev Team",
  },
  {
    id: 5,
    type: "alert",
    title: "Ticket escalated",
    description: "Priority support ticket #1234 needs attention",
    time: "3 hours ago",
  },
  {
    id: 6,
    type: "message",
    title: "New feedback received",
    description: "Customer satisfaction score: 4.8/5",
    time: "4 hours ago",
  },
];

const typeConfig = {
  deal: { icon: FileText, color: "text-sales bg-sales/10" },
  hire: { icon: UserPlus, color: "text-hr bg-hr/10" },
  payment: { icon: DollarSign, color: "text-finance bg-finance/10" },
  task: { icon: CheckCircle, color: "text-tech bg-tech/10" },
  alert: { icon: AlertCircle, color: "text-support bg-support/10" },
  message: { icon: MessageSquare, color: "text-marketing bg-marketing/10" },
};

export function ActivityFeed() {
  return (
    <div className="glass rounded-xl p-6 border border-border animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <button className="text-sm text-primary hover:underline">View all</button>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const config = typeConfig[activity.type];
          const Icon = config.icon;

          return (
            <div
              key={activity.id}
              className="flex gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  config.color
                )}
              >
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-medium text-foreground truncate">
                    {activity.title}
                  </h4>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.time}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {activity.description}
                </p>
                {activity.user && (
                  <p className="text-xs text-muted-foreground mt-1">
                    by {activity.user}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
