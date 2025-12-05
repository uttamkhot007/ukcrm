import {
  TrendingUp,
  DollarSign,
  Users,
  Code,
  HeadphonesIcon,
  Megaphone,
  BarChart3,
  UserCircle,
  Target,
  FileText,
  Ticket,
  FolderKanban,
} from "lucide-react";
import { MetricCard } from "./MetricCard";
import { ModuleCard } from "./ModuleCard";
import { ActivityFeed } from "./ActivityFeed";
import { SalesFunnel } from "./SalesFunnel";
import { RevenueChart } from "./RevenueChart";
import { TeamPerformance } from "./TeamPerformance";
import { QuickActions } from "./QuickActions";
import { UpcomingTasks } from "./UpcomingTasks";

interface DashboardProps {
  onModuleChange: (module: string) => void;
}

const metrics = [
  {
    title: "Total Revenue",
    value: "$2.4M",
    change: 12.5,
    changeLabel: "vs last month",
    icon: DollarSign,
    color: "finance" as const,
  },
  {
    title: "Active Deals",
    value: "847",
    change: 8.2,
    changeLabel: "vs last month",
    icon: Target,
    color: "sales" as const,
  },
  {
    title: "Team Members",
    value: "156",
    change: 4.1,
    changeLabel: "vs last month",
    icon: Users,
    color: "hr" as const,
  },
  {
    title: "Active Projects",
    value: "32",
    change: -2.3,
    changeLabel: "vs last month",
    icon: FolderKanban,
    color: "tech" as const,
  },
  {
    title: "Open Tickets",
    value: "89",
    change: -15.4,
    changeLabel: "vs last month",
    icon: Ticket,
    color: "support" as const,
  },
  {
    title: "MQL Generated",
    value: "1,245",
    change: 23.8,
    changeLabel: "vs last month",
    icon: Megaphone,
    color: "marketing" as const,
  },
];

const modules = [
  {
    id: "sales",
    title: "Sales",
    description: "Funnel management, quotations & lead tracking",
    icon: TrendingUp,
    color: "sales" as const,
    stats: [
      { label: "Pipeline", value: "$12.5M" },
      { label: "Win Rate", value: "32%" },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    description: "Payments, DSO, P&L and GST reports",
    icon: DollarSign,
    color: "finance" as const,
    stats: [
      { label: "Receivables", value: "$890K" },
      { label: "DSO", value: "45 days" },
    ],
  },
  {
    id: "hr",
    title: "Human Resources",
    description: "People management & onboarding",
    icon: Users,
    color: "hr" as const,
    stats: [
      { label: "Employees", value: "156" },
      { label: "Open Positions", value: "12" },
    ],
  },
  {
    id: "tech",
    title: "Technical",
    description: "Projects, knowledge base & updates",
    icon: Code,
    color: "tech" as const,
    stats: [
      { label: "Projects", value: "32" },
      { label: "Sprints", value: "8" },
    ],
  },
  {
    id: "support",
    title: "Customer Support",
    description: "Ticketing and customer service",
    icon: HeadphonesIcon,
    color: "support" as const,
    stats: [
      { label: "Open", value: "89" },
      { label: "Avg Response", value: "2.4h" },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    description: "Campaigns, SQL & MQL tracking",
    icon: Megaphone,
    color: "marketing" as const,
    stats: [
      { label: "Campaigns", value: "15" },
      { label: "Leads", value: "1,245" },
    ],
  },
  {
    id: "management",
    title: "Management",
    description: "Performance & financial overview",
    icon: BarChart3,
    color: "management" as const,
    stats: [
      { label: "Net Profit", value: "$1.2M" },
      { label: "Growth", value: "+18%" },
    ],
  },
  {
    id: "employee",
    title: "Employee Portal",
    description: "Training, leaves & personal info",
    icon: UserCircle,
    color: "employee" as const,
    stats: [
      { label: "Trainings", value: "24" },
      { label: "Pending", value: "3" },
    ],
  },
];

export function Dashboard({ onModuleChange }: DashboardProps) {
  return (
    <div className="space-y-6 p-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, <span className="text-gradient">John</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your business today
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Today</p>
          <p className="text-lg font-semibold">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.title} {...metric} delay={index * 100} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <RevenueChart />
          <SalesFunnel />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <QuickActions />
          <UpcomingTasks />
        </div>
      </div>

      {/* Modules Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((module, index) => (
            <ModuleCard
              key={module.id}
              {...module}
              onClick={() => onModuleChange(module.id)}
              delay={index * 50}
            />
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed />
        <TeamPerformance />
      </div>
    </div>
  );
}
