import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth, type PortalMode, type TeamType } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { TenantSwitcher } from "@/components/tenant/TenantSwitcher";
import { LogoutMoodDialog } from "@/components/logout/LogoutMoodDialog";
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
  Calculator,
  ShieldCheck,
  Package,
  Network,
  Puzzle,
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
  isLink?: boolean;
  linkPath?: string;
}

// Sales-enabled employees see these items (under workspace mode)
const salesPortalItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Sales Dashboard",
    icon: LayoutDashboard,
    color: "text-primary",
    portalMode: "workspace",
  },
  {
    id: "sales",
    label: "Sales",
    icon: TrendingUp,
    color: "text-sales",
    portalMode: "workspace",
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
    portalMode: "workspace",
  },
];

// Regular employee portal items (under workspace mode)
const employeePortalItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "text-primary",
    portalMode: "workspace",
  },
  {
    id: "employee-ai-assistant",
    label: "My AI Assistant",
    icon: Sparkles,
    color: "text-primary",
    portalMode: "workspace",
  },
  {
    id: "employee",
    label: "Employee Portal",
    icon: UserCircle,
    color: "text-employee",
    portalMode: "workspace",
    children: [
      { id: "employee-organization", label: "My Organization", icon: Network },
      { id: "employee-benefits", label: "My Compensation", icon: DollarSign },
      { id: "employee-resources", label: "Resources & Docs", icon: BookOpen },
      { id: "employee-events", label: "Events & Recognition", icon: PartyPopper },
      { id: "employee-requests", label: "Leave & Travel", icon: Calendar },
      { id: "employee-workflows", label: "My Workflows", icon: FolderKanban },
      { id: "employee-approvals", label: "Request Approvals", icon: FileCheck },
    ],
  },
];

// Customer portal items (for customers)
const customerPortalItems: NavItem[] = [
  {
    id: "customer-support",
    label: "Support Center",
    icon: HeadphonesIcon,
    color: "text-primary",
    portalMode: "customer",
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
      { id: "admin-center-organization", label: "Organization", icon: Building2 },
      { id: "admin-center-users", label: "Users", icon: Users },
      { id: "admin-center-integrations", label: "Integrations", icon: Puzzle },
      { id: "admin-center-documentation", label: "Documentation", icon: BookOpen },
      { id: "admin-center-portal", label: "Admin Portal", icon: Shield },
      { id: "admin-center-health", label: "Platform Health", icon: Activity },
    ],
  },
];

// Super admin only items - shown separately
const superAdminItems: NavItem[] = [
  {
    id: "super-admin-tenants",
    label: "Tenant Management",
    icon: Network,
    color: "text-amber-500",
    isLink: true,
    linkPath: "/admin/tenants",
  },
];

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["dashboard"]);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { role, signOut, profile, portalMode, hasSalesAccess, isManagement, isAdminMode, teams, hasModuleAccess, consoleAccess, isSuperAdmin, user } = useAuth();
  const { currentTenant, tenantMemberships } = useTenant();
  const navigate = useNavigate();
  const eventCounts = useUnreadEventCounts();
  const totalEventCount = eventCounts.birthdayCount + eventCounts.anniversaryCount + eventCounts.orgEventCount + eventCounts.achievementCount + eventCounts.performanceCount;
  
  // Show tenant switcher if user is super admin OR has multiple tenant memberships
  const showTenantSwitcher = isSuperAdmin || tenantMemberships.length > 1;

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const hasAccess = (item: NavItem) => {
    // Super admins have access to everything
    if (isSuperAdmin) return true;
    if (!item.requiredRoles) return true;
    if (!role) return false;
    return item.requiredRoles.includes(role);
  };

  // Helper function to check if user has access to specific team modules
  // Now also considers console access settings
  const hasTeamAccess = (requiredTeams: TeamType[], moduleId?: string): boolean => {
    // Super admins and admins always have access (only when in admin portal mode)
    if ((role === "admin" || isSuperAdmin) && portalMode === "admin") return true;
    
    // If console access is configured, ONLY use console access for module control
    // Do NOT fall back to team-based access
    if (consoleAccess) {
      if (!moduleId) return false;
      return consoleAccess.additional_modules.includes(moduleId);
    }
    
    // Only use team-based access if NO console access is configured
    return teams.some(t => requiredTeams.includes(t));
  };

  // Build navigation based on portal mode and access level
  const getNavItems = (): NavItem[] => {
    const items: NavItem[] = [];

    // Admin mode OR super admin shows ALL modules
    if (portalMode === "admin" || isSuperAdmin) {
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
          { id: "hr-directory", label: "Employee Directory", icon: Users },
          { id: "hr-workflows", label: "Workflows", icon: FolderKanban },
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

      // Accounts Module
      items.push({
        id: "accounts",
        label: "Accounts",
        icon: Calculator,
        color: "text-emerald-500",
        children: [
          { id: "accounts-contracts", label: "Contracts", icon: FileText },
          { id: "accounts-workflows", label: "Workflows", icon: RefreshCw },
          { id: "accounts-ar-aging", label: "AR Aging", icon: Clock },
          { id: "accounts-sla-reminders", label: "SLA & Reminders", icon: Bell },
        ],
      });

      // Solution Engineering / Presales Module
      items.push({
        id: "presales",
        label: "Solution Engineering",
        icon: Puzzle,
        color: "text-presales",
        children: [
          { id: "presales-poc", label: "POC Requests", icon: Target },
          { id: "presales-demos", label: "Demos", icon: Activity },
          { id: "presales-assessments", label: "Assessments", icon: ClipboardCheck },
          { id: "presales-rfp", label: "RFP/RFI", icon: FileText },
        ],
      });

      // Admin Module
      items.push({
        id: "admin",
        label: "Administration",
        icon: ShieldCheck,
        color: "text-slate-500",
        children: [
          { id: "admin-facilities", label: "Facilities", icon: Building2 },
          { id: "admin-assets", label: "Asset Management", icon: Briefcase },
          { id: "admin-vendors", label: "Vendor Management", icon: Users },
          { id: "admin-procurement", label: "Procurement", icon: FileText },
        ],
      });

      // Employee Portal
      items.push({
        id: "employee",
        label: "Employee Portal",
        icon: UserCircle,
        color: "text-employee",
        children: [
          { id: "employee-organization", label: "My Organization", icon: Network },
          { id: "employee-attendance", label: "Attendance", icon: Clock },
          { id: "employee-attendance-reports", label: "Attendance Reports", icon: BarChart3 },
          { id: "employee-benefits", label: "My Compensation", icon: DollarSign },
          { id: "employee-resources", label: "Resources & Docs", icon: BookOpen },
          { id: "employee-events", label: "Events & Recognition", icon: PartyPopper },
          { id: "employee-requests", label: "Leave & Travel", icon: Calendar },
          { id: "employee-workflows", label: "My Workflows", icon: FolderKanban },
          { id: "employee-approvals", label: "Request Approvals", icon: FileCheck },
        ],
      });

      // Admin items (Management & Admin Panel)
      items.push(...adminItems.filter(hasAccess));
      
      // Super admin items - only for super admins
      if (isSuperAdmin) {
        items.push(...superAdminItems);
      }
    } else if (portalMode === "customer") {
      // Customer mode - only support
      items.push(...customerPortalItems);
    } else if (portalMode === "workspace") {
      // Workspace mode: Team-based access control
      
      // Dashboard is always available
      items.push({
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        color: "text-primary",
      });

      // AI Assistant is always available in Employee Portal
      items.push({
        id: "employee-ai-assistant",
        label: "My AI Assistant",
        icon: Sparkles,
        color: "text-primary",
      });

      // Sales Portal - for sales, presales, inside_sales teams
      if (hasTeamAccess(["sales", "presales", "inside_sales", "management"], "sales")) {
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
      }

      // Solution Engineering - for presales team
      if (hasTeamAccess(["presales", "sales", "management"], "presales")) {
        items.push({
          id: "presales",
          label: "Solution Engineering",
          icon: Puzzle,
          color: "text-presales",
          children: [
            { id: "presales-poc", label: "POC Requests", icon: Target },
            { id: "presales-demos", label: "Demos", icon: Activity },
            { id: "presales-assessments", label: "Assessments", icon: ClipboardCheck },
            { id: "presales-rfp", label: "RFP/RFI", icon: FileText },
          ],
        });
      }

      // Inside Sales - specific to inside_sales team
      if (hasTeamAccess(["inside_sales", "management"], "inside_sales")) {
        items.push({
          id: "inside-sales",
          label: "Inside Sales",
          icon: PhoneOutgoing,
          color: "text-orange-500",
        });
      }

      // HR Module - for hr team
      if (hasTeamAccess(["hr", "management"], "hr")) {
        items.push({
          id: "hr",
          label: "Human Resources",
          icon: Users,
          color: "text-hr",
          children: [
            { id: "hr-directory", label: "Employee Directory", icon: Users },
            { id: "hr-workflows", label: "Workflows", icon: FolderKanban },
            { id: "hr-people", label: "People Management", icon: UserPlus },
            { id: "hr-salary", label: "Salary & Benefits", icon: Briefcase },
            { id: "hr-onboarding", label: "Onboarding", icon: Calendar },
          ],
        });
      }

      // Finance Module - for finance team
      if (hasTeamAccess(["finance", "management"], "finance")) {
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
      }

      // Technical Module - for technical team
      if (hasTeamAccess(["technical", "managed_services"], "technical")) {
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
      }

      // Accounts Module - for accounts team
      if (hasTeamAccess(["accounts", "finance", "management"], "accounts")) {
        items.push({
          id: "accounts",
          label: "Accounts",
          icon: Calculator,
          color: "text-emerald-500",
          children: [
            { id: "accounts-contracts", label: "Contracts", icon: FileText },
            { id: "accounts-workflows", label: "Workflows", icon: RefreshCw },
            { id: "accounts-ar-aging", label: "AR Aging", icon: Clock },
            { id: "accounts-sla-reminders", label: "SLA & Reminders", icon: Bell },
          ],
        });
      }

      // Marketing Module - for marketing team
      if (hasTeamAccess(["marketing", "management"], "marketing")) {
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
      }

      // Renewals Module - for renewals team
      if (hasTeamAccess(["renewals", "sales", "management"], "renewals")) {
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
      }

      // Legal Module
      if (hasTeamAccess(["management"], "legal")) {
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
      }

      // Compliance Module
      if (hasTeamAccess(["management"], "compliance")) {
        items.push({
          id: "compliance",
          label: "Compliance",
          icon: ClipboardCheck,
          color: "text-green-500",
        });
      }

      // Billing Module
      if (hasTeamAccess(["finance", "accounts", "management"], "billing")) {
        items.push({
          id: "billing",
          label: "Billing",
          icon: CreditCard,
          color: "text-finance",
        });
      }

      // Ticketing Module
      if (hasTeamAccess(["technical", "managed_services", "management"], "ticketing")) {
        items.push({
          id: "helpdesk",
          label: "Help Desk",
          icon: HeadphonesIcon,
          color: "text-support",
          children: [
            { id: "helpdesk-tickets", label: "Tickets", icon: Ticket },
          ],
        });
      }

      // Employee Portal - always available for all employees
      items.push({
        id: "employee",
        label: "Employee Portal",
        icon: UserCircle,
        color: "text-employee",
        children: [
          { id: "employee-organization", label: "My Organization", icon: Network },
          { id: "employee-attendance", label: "Attendance", icon: Clock },
          { id: "employee-attendance-reports", label: "Attendance Reports", icon: BarChart3 },
          { id: "employee-benefits", label: "My Compensation", icon: DollarSign },
          { id: "employee-resources", label: "Resources & Docs", icon: BookOpen },
          { id: "employee-events", label: "Events & Recognition", icon: PartyPopper },
          { id: "employee-requests", label: "Leave & Travel", icon: Calendar },
          { id: "employee-workflows", label: "My Workflows", icon: FolderKanban },
          { id: "employee-approvals", label: "Request Approvals", icon: FileCheck },
        ],
      });

      // Admin team gets admin module
      if (hasTeamAccess(["admin"])) {
        items.push({
          id: "admin",
          label: "Administration",
          icon: ShieldCheck,
          color: "text-slate-500",
          children: [
            { id: "admin-facilities", label: "Facilities", icon: Building2 },
            { id: "admin-assets", label: "Asset Management", icon: Briefcase },
            { id: "admin-vendors", label: "Vendor Management", icon: Users },
            { id: "admin-procurement", label: "Procurement", icon: FileText },
          ],
        });
      }

      // Manager role gets management access
      if (role === "manager" || isManagement) {
        items.push(...adminItems.filter(item => item.id === "management").filter(hasAccess));
      }
    } else {
      // Default to basic employee portal
      items.push({
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        color: "text-primary",
      });
      items.push({
        id: "employee-ai-assistant",
        label: "My AI Assistant",
        icon: Sparkles,
        color: "text-primary",
      });
      items.push({
        id: "employee",
        label: "Employee Portal",
        icon: UserCircle,
        color: "text-employee",
        children: [
          { id: "employee-organization", label: "My Organization", icon: Network },
          { id: "employee-benefits", label: "My Compensation", icon: DollarSign },
          { id: "employee-resources", label: "Resources & Docs", icon: BookOpen },
          { id: "employee-events", label: "Events & Recognition", icon: PartyPopper },
          { id: "employee-requests", label: "Leave & Travel", icon: Calendar },
          { id: "employee-workflows", label: "My Workflows", icon: FolderKanban },
          { id: "employee-approvals", label: "Request Approvals", icon: FileCheck },
        ],
      });
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
        "h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
        "md:fixed md:left-0 md:top-0 md:z-40",
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

      {/* Tenant Switcher - shown for super admins or users with multiple workspaces */}
      {showTenantSwitcher && (
        <div className="px-3 py-2 border-b border-sidebar-border">
          <TenantSwitcher collapsed={collapsed} />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {filteredNavItems.map((item) => (
          <div key={item.id} className="mb-1">
            <button
              onClick={() => {
                if (item.isLink && item.linkPath) {
                  navigate(item.linkPath);
                  return;
                }
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
                    onClick={() => {
                      // Handle admin-center children navigation
                      if (child.id.startsWith("admin-center-")) {
                        const path = child.id.replace("admin-center-", "");
                        navigate(`/admin/${path}`);
                      }
                      onModuleChange(child.id);
                    }}
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
          onClick={() => setShowLogoutDialog(true)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>

      {/* Logout Mood Dialog */}
      {user && (
        <LogoutMoodDialog
          open={showLogoutDialog}
          onOpenChange={setShowLogoutDialog}
          onConfirmLogout={signOut}
          userId={user.id}
        />
      )}
    </aside>
  );
}
