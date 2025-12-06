import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth, type PortalMode, type TeamType } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Users,
  Code,
  HeadphonesIcon,
  Megaphone,
  BarChart3,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Target,
  FileText,
  CreditCard,
  PieChart,
  Receipt,
  UserPlus,
  Briefcase,
  Calendar,
  FolderKanban,
  BookOpen,
  Bell,
  Ticket,
  Mail,
  Activity,
  GraduationCap,
  Plane,
  Award,
  FileUser,
  Settings,
  LogOut,
  Shield,
  Phone,
  PhoneOutgoing,
  Building2,
  Scale,
  RefreshCw,
  Key,
  FileCheck,
  ClipboardCheck,
  PartyPopper,
  Cake,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUnreadEventCounts } from "@/hooks/useUnreadEventCounts";

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  requiredRoles?: ("admin" | "manager" | "employee")[];
  portalMode?: PortalMode;
  children?: { id: string; label: string; icon: React.ElementType }[];
}

// Sales Portal Items
const salesPortalItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Sales Dashboard",
    icon: LayoutDashboard,
    color: "text-primary",
    portalMode: "sales",
  },
  {
    id: "sales",
    label: "Sales",
    icon: TrendingUp,
    color: "text-sales",
    portalMode: "sales",
    children: [
      { id: "sales-funnel", label: "Funnel Management", icon: Target },
      { id: "sales-quotations", label: "Quotations", icon: FileText },
      { id: "sales-leads", label: "Lead Tracking", icon: Activity },
    ],
  },
  {
    id: "contacts",
    label: "Contacts",
    icon: Phone,
    color: "text-primary",
    portalMode: "sales",
  },
];

// Employee Portal Items
const employeePortalItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "text-primary",
    portalMode: "employee",
  },
  {
    id: "employee",
    label: "Employee Portal",
    icon: UserCircle,
    color: "text-employee",
    portalMode: "employee",
    children: [
      { id: "employee-requests", label: "My Requests", icon: Ticket },
      { id: "employee-training", label: "Trainings", icon: GraduationCap },
      { id: "employee-salary", label: "Salary Slips", icon: FileText },
      { id: "employee-leave", label: "Leave Management", icon: Calendar },
      { id: "employee-travel", label: "Travel Management", icon: Plane },
      { id: "employee-appreciation", label: "Peer Appreciation", icon: Award },
      { id: "employee-profile", label: "CV & Certifications", icon: FileUser },
    ],
  },
];

// Admin-only Items
const adminItems: NavItem[] = [
  {
    id: "management",
    label: "Management",
    icon: BarChart3,
    color: "text-management",
    requiredRoles: ["admin"],
    children: [
      { id: "management-performance", label: "People Performance", icon: Activity },
      { id: "management-cashflow", label: "Inflow vs Outflow", icon: DollarSign },
    ],
  },
  {
    id: "admin-center",
    label: "Admin Center",
    icon: Settings,
    color: "text-destructive",
    requiredRoles: ["admin"],
    children: [
      { id: "admin-integrations", label: "Integrations", icon: Building2 },
      { id: "admin-panel", label: "Admin Panel", icon: Shield },
    ],
  },
];

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["dashboard"]);
  const { role, signOut, profile, portalMode, hasSalesAccess, isManagement } = useAuth();
  const eventCounts = useUnreadEventCounts();
  const totalEventCount = eventCounts.birthdayCount + eventCounts.anniversaryCount + eventCounts.orgEventCount + eventCounts.achievementCount + eventCounts.performanceCount;

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const hasAccess = (item: NavItem) => {
    if (!item.requiredRoles) return true;
    if (!role) return false;
    return item.requiredRoles.includes(role);
  };

  // Build navigation based on portal mode and access level
  const getNavItems = (): NavItem[] => {
    const items: NavItem[] = [];
    const isFullAccess = role === "admin" || isManagement;

    // Admin/Management see ALL modules regardless of portal mode
    if (isFullAccess) {
      // Dashboard first
      items.push({
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        color: "text-primary",
      });

      // Sales modules
      items.push({
        id: "sales",
        label: "Sales",
        icon: TrendingUp,
        color: "text-sales",
        children: [
          { id: "sales-funnel", label: "Funnel Management", icon: Target },
          { id: "sales-quotations", label: "Quotations", icon: FileText },
          { id: "sales-leads", label: "Lead Tracking", icon: Activity },
        ],
      });

      items.push({
        id: "contacts",
        label: "Contacts",
        icon: Phone,
        color: "text-primary",
      });

      // Inside Sales
      items.push({
        id: "inside-sales",
        label: "Inside Sales",
        icon: PhoneOutgoing,
        color: "text-orange-500",
      });

      // Finance
      items.push({
        id: "finance",
        label: "Finance",
        icon: DollarSign,
        color: "text-finance",
        children: [
          { id: "finance-payments", label: "Payment Tracking", icon: CreditCard },
          { id: "finance-dso", label: "DSO Trends", icon: PieChart },
          { id: "finance-pnl", label: "Profit & Loss", icon: BarChart3 },
          { id: "finance-tax", label: "GST Reports", icon: Receipt },
        ],
      });

      // HR
      items.push({
        id: "hr",
        label: "Human Resources",
        icon: Users,
        color: "text-hr",
        children: [
          { id: "hr-people", label: "People Management", icon: UserPlus },
          { id: "hr-salary", label: "Salary & Benefits", icon: Briefcase },
          { id: "hr-onboarding", label: "Onboarding", icon: Calendar },
        ],
      });

      // Technical
      items.push({
        id: "tech",
        label: "Technical",
        icon: Code,
        color: "text-tech",
        children: [
          { id: "tech-projects", label: "Project Management", icon: FolderKanban },
          { id: "tech-knowledge", label: "Knowledge Base", icon: BookOpen },
          { id: "tech-updates", label: "Updates & Alerts", icon: Bell },
        ],
      });

      // Support / Help Desk
      items.push({
        id: "helpdesk",
        label: "Help Desk",
        icon: HeadphonesIcon,
        color: "text-support",
        children: [
          { id: "helpdesk-tickets", label: "Tickets", icon: Ticket },
        ],
      });

      // Billing
      items.push({
        id: "billing",
        label: "Billing",
        icon: CreditCard,
        color: "text-finance",
      });

      // Compliance
      items.push({
        id: "compliance",
        label: "Compliance",
        icon: ClipboardCheck,
        color: "text-green-500",
      });

      // Legal
      items.push({
        id: "legal",
        label: "Legal",
        icon: Scale,
        color: "text-legal",
        children: [
          { id: "legal-documents", label: "Documents", icon: FileText },
          { id: "legal-approvals", label: "Approvals", icon: FileCheck },
        ],
      });

      // Renewals
      items.push({
        id: "renewals",
        label: "Renewals",
        icon: RefreshCw,
        color: "text-renewals",
        children: [
          { id: "renewals-contracts", label: "Contracts", icon: FileText },
          { id: "renewals-licenses", label: "Licenses", icon: Key },
          { id: "renewals-subscriptions", label: "Subscriptions", icon: RefreshCw },
        ],
      });

      // Marketing
      items.push({
        id: "marketing",
        label: "Marketing",
        icon: Megaphone,
        color: "text-marketing",
        children: [
          { id: "marketing-campaigns", label: "Campaigns", icon: Mail },
          { id: "marketing-leads", label: "SQL/MQL Tracking", icon: Target },
        ],
      });

      // Employee Portal
      items.push({
        id: "employee",
        label: "Employee Portal",
        icon: UserCircle,
        color: "text-employee",
        children: [
          { id: "employee-attendance", label: "Attendance", icon: Clock },
          { id: "employee-attendance-reports", label: "Attendance Reports", icon: BarChart3 },
          { id: "employee-requests", label: "My Requests", icon: Ticket },
          { id: "employee-approvals", label: "Request Approvals", icon: FileCheck },
          { id: "employee-events", label: "Events & Celebrations", icon: PartyPopper },
          { id: "employee-training", label: "Trainings", icon: GraduationCap },
          { id: "employee-salary", label: "Salary Slips", icon: FileText },
          { id: "employee-leave", label: "Leave Management", icon: Calendar },
          { id: "employee-travel", label: "Travel Management", icon: Plane },
          { id: "employee-appreciation", label: "Peer Appreciation", icon: Award },
          { id: "employee-profile", label: "CV & Certifications", icon: FileUser },
        ],
      });

      // Admin items (Management & Admin Panel)
      items.push(...adminItems.filter(hasAccess));
    } else {
      // Regular users: show based on portal mode
      if (portalMode === "sales" && hasSalesAccess) {
        items.push(...salesPortalItems);
      } else {
        items.push(...employeePortalItems);
      }
    }

    return items;
  };

  const filteredNavItems = getNavItems();

  const getRoleBadgeColor = () => {
    switch (role) {
      case "admin":
        return "bg-destructive/20 text-destructive";
      case "manager":
        return "bg-management/20 text-management";
      default:
        return "bg-employee/20 text-employee";
    }
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">NexusCRM</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* User Info */}
      {!collapsed && profile && (
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold text-sm">
              {profile.full_name?.slice(0, 2).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.full_name || "User"}</p>
              <span className={cn("text-xs px-2 py-0.5 rounded-full capitalize", getRoleBadgeColor())}>
                {role || "employee"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {filteredNavItems.map((item) => (
          <div key={item.id} className="mb-1">
            <button
              onClick={() => {
                if (item.children) {
                  toggleExpand(item.id);
                }
                onModuleChange(item.id);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                activeModule === item.id || activeModule.startsWith(item.id + "-")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", item.color)} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm font-medium">
                    {item.label}
                  </span>
                  {item.children && (
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 transition-transform",
                        expandedItems.includes(item.id) && "rotate-90"
                      )}
                    />
                  )}
                </>
              )}
            </button>

            {/* Children */}
            {!collapsed && item.children && expandedItems.includes(item.id) && (
              <div className="ml-4 mt-1 space-y-1 animate-fade-in">
                {item.children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onModuleChange(child.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                      activeModule === child.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/30"
                    )}
                  >
                    <child.icon className="w-4 h-4" />
                    <span>{child.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <button
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-all",
            collapsed && "justify-center"
          )}
        >
          <Settings className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Settings</span>}
        </button>
        <button
          onClick={signOut}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
