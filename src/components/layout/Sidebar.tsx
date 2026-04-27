import { useState } from "react";
// Note: New finance modules added - CashFlowStatement, EInvoicingModule, EWayBillModule, TDSTCSModule, EstimatesModule, BudgetManagement, RatioAnalysis
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth, type PortalMode, type TeamType } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { TenantSwitcher } from "@/components/tenant/TenantSwitcher";
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
  Kanban,
  ListTodo,
  Milestone,
  Timer,
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
  Handshake,
  Server,
  Gavel,
  ShieldAlert,
  Eye,
  Radar,
  AlertTriangle,
  Bug,
  Crosshair,
  FileSearch,
  Siren,
  MonitorCheck,
  CheckSquare,
  Globe,
  Star,
  Newspaper,
  Video,
  Palette,
  Crown,
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
      { id: "sales-meddic-workflow", label: "MEDDIC Workflow", icon: Sparkles },
      { id: "sales-quotations", label: "Quotations", icon: FileText },
      { id: "sales-leads", label: "Lead Tracking", icon: Activity },
    ],
  },
  {
    id: "deal-desk",
    label: "Tenders & Deal Desk",
    icon: Gavel,
    color: "text-amber-600",
    portalMode: "workspace",
    isLink: true,
    linkPath: "/tenders",
    children: [
      { id: "deal-desk-registration", label: "Deal Registration", icon: FileCheck },
      { id: "deal-desk-oem-pipeline", label: "OEM Pipeline", icon: Target },
      { id: "deal-desk-opportunities", label: "Tender Opportunities", icon: FileText },
      { id: "deal-desk-bid-preparation", label: "Bid Preparation", icon: Users },
      { id: "deal-desk-evaluation", label: "Awards", icon: Award },
    ],
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
      { id: "employee-profile", label: "My Profile", icon: UserCircle },
      { id: "employee-benefits", label: "My Compensation", icon: DollarSign },
      { id: "employee-resources", label: "Resources & Docs", icon: BookOpen },
      { id: "employee-skill-matrix", label: "Skill Matrix", icon: Target },
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
  {
    id: "employee-communication",
    label: "Communication",
    icon: Video,
    color: "text-blue-500",
    portalMode: "customer",
  },
  {
    id: "learning-hub",
    label: "Learning Hub",
    icon: GraduationCap,
    color: "text-green-500",
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
      { id: "management-analytics", label: "Analytics Dashboard", icon: BarChart3 },
      { id: "management-vcfo", label: "vCFO Dashboard", icon: DollarSign },
      { id: "management-vciso", label: "vCISO Dashboard", icon: Shield },
      { id: "management-vcro", label: "vCRO Dashboard", icon: TrendingUp },
      { id: "management-performance", label: "People Performance", icon: Activity },
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
      { id: "admin-center-whitelabel", label: "Whitelabel", icon: Palette },
      { id: "admin-center-users", label: "User Management", icon: Users },
      { id: "admin-center-authorized-domains", label: "Authorized Domains", icon: ShieldCheck },
      { id: "admin-center-alliance", label: "Alliance", icon: Handshake },
      { id: "admin-center-offerings", label: "Offerings", icon: Package },
      { id: "admin-center-document-templates", label: "Document Templates", icon: FileText },
      { id: "admin-center-support-management", label: "Support Management", icon: HeadphonesIcon },
      { id: "admin-center-integrations", label: "Integrations", icon: Puzzle },
      { id: "admin-center-documentation", label: "Documentation", icon: BookOpen },
      { id: "admin-center-health", label: "Platform Health", icon: Activity },
    ],
  },
];

// Super admin only items - shown separately
const superAdminItems: NavItem[] = [
  {
    id: "platform-console",
    label: "Platform Console",
    icon: Crown,
    color: "text-purple-500",
    children: [
      { id: "platform-tenants", label: "Tenants", icon: Network },
      { id: "platform-users", label: "User Management", icon: Users },
      { id: "platform-licenses", label: "License Management", icon: Key },
      { id: "platform-integrations", label: "Integrations", icon: Puzzle },
    ],
  },
];

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["dashboard"]);
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
  // IMPORTANT: "manager" role does NOT automatically get all module access
  // Access is strictly based on user_teams assignments
  const hasTeamAccess = (requiredTeams: TeamType[], moduleId?: string): boolean => {
    // Super admins always have access to all modules in any portal mode
    if (isSuperAdmin) return true;
    
    // Admin and Manager roles always have access to all modules
    if (role === "admin" || role === "manager") return true;
    
    // If console access exists but user doesn't have full_access, they only get employee modules
    if (consoleAccess && !consoleAccess.has_full_access) {
      return false; // No access to team-based modules
    }
    
    // If console access is configured with full access, use module-based control
    if (consoleAccess && consoleAccess.has_full_access) {
      if (!moduleId) return teams.some(t => requiredTeams.includes(t));
      // Empty additional_modules means access based on team assignments
      if (consoleAccess.additional_modules.length === 0) {
        return teams.some(t => requiredTeams.includes(t));
      }
      return consoleAccess.additional_modules.includes(moduleId);
    }
    
    // Access is STRICTLY based on user_teams
    return teams.some(t => requiredTeams.includes(t));
  };

  // Check if user has employee-only access (explicitly configured with no full_access)
  // IMPORTANT: Only restrict if consoleAccess is explicitly set AND has_full_access is false
  // If consoleAccess is null (still loading), don't restrict - wait for proper data
  // Super admins and admins are never employee-only
  const isEmployeeOnlyAccess = 
    consoleAccess !== null && 
    consoleAccess.has_full_access === false && 
    !isSuperAdmin && 
    role !== 'admin' && 
    role !== 'manager';

  // Build navigation based on portal mode and access level
  const getNavItems = (): NavItem[] => {
    const items: NavItem[] = [];

    // Customer mode takes priority - only show customer portal items
    if (portalMode === "customer") {
      items.push(...customerPortalItems);
      return items;
    }

    // Admin mode shows ALL modules (super admins in admin mode also get all modules)
    if (portalMode === "admin") {
      // Dashboard first
      items.push({
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        color: "text-primary",
      });

      // NOTE: Team Communication and Learning Hub are embedded inside Employee Portal only
      // They should NOT appear as standalone items

      // Sales modules
      items.push({
        id: "sales",
        label: "Sales",
        icon: TrendingUp,
        color: "text-sales",
        children: [
          { id: "sales-ai-assistant", label: "Sales AI", icon: Sparkles },
          { id: "sales-meddic-workflow", label: "MEDDIC Workflow", icon: Sparkles },
          { id: "sales-deal-registration", label: "Deal Registration", icon: FileCheck },
          { id: "sales-quotations", label: "Quotations", icon: FileText },
          { id: "sales-leads", label: "Lead Tracking", icon: Activity },
          { id: "sales-offerings", label: "Offerings", icon: Package },
          { id: "sales-documentation", label: "Sales SOPs", icon: BookOpen },
        ],
      });

      // Inside Sales
      items.push({
        id: "inside-sales",
        label: "Inside Sales",
        icon: PhoneOutgoing,
        color: "text-orange-500",
        children: [
          { id: "inside-sales-prospects", label: "Prospects", icon: Target },
          { id: "inside-sales-leads", label: "Leads", icon: Activity },
          { id: "inside-sales-contacts", label: "Contacts", icon: Phone },
          { id: "inside-sales-accounts", label: "Accounts", icon: Building2 },
          { id: "inside-sales-offerings", label: "Offerings", icon: Package },
        ],
      });

      // Tenders & Deal Desk
      items.push({
        id: "deal-desk",
        label: "Tenders & Deal Desk",
        icon: Gavel,
        color: "text-amber-600",
        children: [
          { id: "deal-desk-registration", label: "Deal Registration", icon: FileCheck },
          { id: "deal-desk-oem-pipeline", label: "OEM Pipeline", icon: Target },
          { id: "deal-desk-opportunities", label: "Tender Opportunities", icon: FileText },
          { id: "deal-desk-bid-preparation", label: "Bid Preparation", icon: Users },
          { id: "deal-desk-evaluation", label: "Awards", icon: Award },
        ],
      });

      // Finance & Accounting (Unified Module)
      items.push({
        id: "finance",
        label: "Finance & Accounting",
        icon: Calculator,
        color: "text-finance",
        children: [
          // Dashboard & Overview
          { id: "finance-dashboard", label: "Dashboard", icon: LayoutDashboard },
          
          // Accounting Core
          { id: "finance-chart-of-accounts", label: "Chart of Accounts", icon: BookOpen },
          { id: "finance-voucher-entry", label: "Voucher Entry", icon: FileText },
          { id: "finance-estimates", label: "Estimates & Quotations", icon: FileText },
          { id: "finance-billing", label: "Billing & Invoicing", icon: CreditCard },
          
          // Bookkeeping (Consolidated)
          { id: "finance-bookkeeping", label: "Bookkeeping", icon: BookOpen },
          
          // Financial Reports
          { id: "finance-trial-balance", label: "Trial Balance", icon: Scale },
          { id: "finance-profit-loss", label: "Profit & Loss", icon: BarChart3 },
          { id: "finance-balance-sheet", label: "Balance Sheet", icon: PieChart },
          { id: "finance-cash-flow", label: "Cash Flow Statement", icon: TrendingUp },
          { id: "finance-ratio-analysis", label: "Ratio Analysis", icon: PieChart },
          { id: "finance-budgets", label: "Budget Management", icon: Target },
          { id: "finance-analytics", label: "Sales Analytics", icon: BarChart3 },
          { id: "finance-ar-aging", label: "AR Aging", icon: Clock },
          
          // Taxation & Compliance (Consolidated)
          { id: "finance-taxation", label: "Taxation & Compliance", icon: Receipt },
          
          // Operations
          { id: "finance-contracts", label: "Contracts", icon: FileText },
          { id: "finance-post-sale", label: "Post-Sale Workflows", icon: FolderKanban },
          { id: "finance-workflows", label: "Workflows", icon: RefreshCw },
          { id: "finance-procurement", label: "Procurement & Inventory", icon: Package },
          { id: "finance-quotation-approvals", label: "Quotation → Invoice", icon: FileText },
          { id: "finance-sla-reminders", label: "SLA & Reminders", icon: Bell },
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
          { id: "hr-skill-matrix", label: "Skill Matrix", icon: Target },
          { id: "hr-people", label: "People Management", icon: UserPlus },
          { id: "hr-salary", label: "Salary & Benefits", icon: Briefcase },
          { id: "hr-compliance", label: "Legal & Compliance", icon: Scale },
          { id: "hr-onboarding", label: "Onboarding", icon: Calendar },
        ],
      });

      // Technical Module
      items.push({
        id: "tech",
        label: "Technical Module",
        icon: Code,
        color: "text-tech",
        children: [
          { id: "tech-customers", label: "Support Customers", icon: Users },
          { id: "tech-contracts", label: "Customer Contracts", icon: FileText },
          { id: "tech-contacts", label: "Customer Contacts", icon: Phone },
          { id: "tech-recommendations", label: "Recommendations", icon: BookOpen },
          { id: "tech-implementation-plan", label: "Implementation Plan", icon: FileText },
          { id: "tech-remote-sessions", label: "Remote Sessions", icon: Video },
        ],
      });

      // Support Center
      items.push({
        id: "helpdesk",
        label: "Support Center",
        icon: HeadphonesIcon,
        color: "text-support",
        children: [
          { id: "helpdesk-tickets", label: "Tickets", icon: Ticket },
          { id: "helpdesk-open", label: "Open", icon: Clock },
          { id: "helpdesk-escalated", label: "Escalated", icon: Bell },
          { id: "helpdesk-remote-sessions", label: "Remote Sessions", icon: Video },
          { id: "helpdesk-templates", label: "Templates", icon: FileText },
          { id: "helpdesk-analytics", label: "Analytics", icon: BarChart3 },
          { id: "helpdesk-automation", label: "Automation", icon: Sparkles },
        ],
      });

      // IT Services Module
      items.push({
        id: "it",
        label: "IT Services",
        icon: Server,
        color: "text-cyan-500",
        children: [
          { id: "it-tickets", label: "IT Support Tickets", icon: Ticket },
          { id: "it-assets", label: "Digital Assets", icon: Package },
          { id: "it-inventory", label: "IT Inventory", icon: Briefcase },
          { id: "it-workflows", label: "IT Workflows", icon: FolderKanban },
        ],
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
          { id: "renewals-customers", label: "Renewal Customers", icon: Users },
          { id: "renewals-tracker", label: "Renewal Tracker", icon: RefreshCw },
          { id: "renewals-contracts", label: "Contracts", icon: FileText },
          { id: "renewals-licenses", label: "Licenses", icon: Key },
          { id: "renewals-subscriptions", label: "Subscriptions", icon: RefreshCw },
        ],
      });

      // Marketing Module
      items.push({
        id: "marketing",
        label: "Marketing",
        icon: Megaphone,
        color: "text-pink-500",
        children: [
          { id: "marketing-campaigns", label: "Campaigns", icon: Target },
          { id: "marketing-content", label: "Content", icon: FileText },
          { id: "marketing-leads", label: "Lead Generation", icon: UserPlus },
          { id: "marketing-analytics", label: "Analytics", icon: BarChart3 },
          { id: "marketing-social", label: "Social Media", icon: Globe },
          { id: "marketing-events", label: "Events", icon: Calendar },
        ],
      });

      // Public Relations Module
      items.push({
        id: "pr",
        label: "Public Relations",
        icon: Newspaper,
        color: "text-indigo-500",
        children: [
          { id: "pr-media", label: "Media Relations", icon: Newspaper },
          { id: "pr-press", label: "Press Releases", icon: FileText },
          { id: "pr-coverage", label: "Media Coverage", icon: Eye },
          { id: "pr-contacts", label: "Media Contacts", icon: Phone },
          { id: "pr-events", label: "PR Events", icon: Calendar },
          { id: "pr-crisis", label: "Crisis Management", icon: AlertTriangle },
        ],
      });

      // Communications Module
      items.push({
        id: "communications",
        label: "Communications",
        icon: Mail,
        color: "text-teal-500",
        children: [
          { id: "communications-internal", label: "Internal Comms", icon: Users },
          { id: "communications-external", label: "External Comms", icon: Globe },
          { id: "communications-newsletters", label: "Newsletters", icon: Mail },
          { id: "communications-announcements", label: "Announcements", icon: Bell },
          { id: "communications-templates", label: "Templates", icon: FileText },
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
          { id: "presales-recommendations", label: "Recommendations", icon: BookOpen },
          { id: "presales-poc-plans", label: "POC Plans", icon: FileText },
        ],
      });

      // Managed Security Services Module
      items.push({
        id: "mss",
        label: "Managed Security",
        icon: ShieldAlert,
        color: "text-blue-600",
        children: [
          { id: "mss-soc", label: "SOC Operations", icon: MonitorCheck },
          { id: "mss-monitoring", label: "Threat Monitoring", icon: Radar },
          { id: "mss-incidents", label: "Incident Response", icon: Siren },
          { id: "mss-alerts", label: "Security Alerts", icon: AlertTriangle },
          { id: "mss-reports", label: "Security Reports", icon: FileSearch },
          { id: "mss-clients", label: "Client Portals", icon: Users },
        ],
      });

      // Offensive Security Services Module
      items.push({
        id: "offensive",
        label: "Offensive Security",
        icon: Crosshair,
        color: "text-red-600",
        children: [
          { id: "offensive-pentest", label: "Penetration Testing", icon: Bug },
          { id: "offensive-vapt", label: "VAPT Assessments", icon: Eye },
          { id: "offensive-redteam", label: "Red Team Ops", icon: Target },
          { id: "offensive-audits", label: "Security Audits", icon: ClipboardCheck },
          { id: "offensive-findings", label: "Findings & Reports", icon: FileText },
          { id: "offensive-remediation", label: "Remediation Tracking", icon: CheckSquare },
        ],
      });

      // Project Management Module - for technical, presales, mss, offensive teams
      if (hasTeamAccess(["technical", "presales", "managed_services", "mss", "offensive", "management"], "projects")) {
        items.push({
          id: "projects",
          label: "Project Management",
          icon: FolderKanban,
          color: "text-purple-600",
          children: [
            { id: "projects-list", label: "All Projects", icon: Kanban },
            { id: "projects-tasks", label: "Tasks", icon: ListTodo },
            { id: "projects-milestones", label: "Milestones", icon: Milestone },
            { id: "projects-timesheet", label: "Timesheets", icon: Timer },
          ],
        });
      }

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

      // Employee Portal - Full structure for admin mode
      items.push({
        id: "employee",
        label: "Employee Portal",
        icon: UserCircle,
        color: "text-employee",
        children: [
          { id: "employee-organization", label: "My Organization", icon: Network },
          { id: "employee-profile", label: "My Profile", icon: UserCircle },
          { id: "employee-communication", label: "Team Communication", icon: Video },
          { id: "learning-hub", label: "Learning Hub", icon: GraduationCap },
          { id: "employee-attendance", label: "Attendance", icon: Clock },
          { id: "employee-attendance-reports", label: "Attendance Reports", icon: BarChart3 },
          { id: "employee-activity-tracker", label: "Activity Tracker", icon: Activity },
          { id: "employee-benefits", label: "My Compensation", icon: DollarSign },
          { id: "employee-resources", label: "Resources & Docs", icon: BookOpen },
          { id: "employee-events", label: "Events & Recognition", icon: PartyPopper },
          { id: "employee-requests", label: "Leave & Travel", icon: Calendar },
          { id: "employee-tickets", label: "Support Tickets", icon: Ticket },
          { id: "employee-workflows", label: "My Workflows", icon: FolderKanban },
          { id: "employee-approvals", label: "Request Approvals", icon: FileCheck },
        ],
      });

      // Admin items (Management & Admin Panel) - for admin role or super admin
      if (role === "admin" || isSuperAdmin) {
        items.push(...adminItems);
      }
      
      // Super admin items - always shown for super admins
      if (isSuperAdmin) {
        items.push(...superAdminItems);
      }
    } else if (portalMode === "workspace") {
      // Workspace mode: Team-based access control
      // But if user has employee-only access, skip all team-based modules
      
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

      // NOTE: Team Communication and Learning Hub are embedded inside Employee Portal only
      // They should NOT appear as standalone items

      // If employee-only access, show ONLY employee portal and skip all other modules
      if (isEmployeeOnlyAccess) {
        // Employee Portal - Simplified 7-item structure (employee-only access)
        items.push({
          id: "employee",
          label: "Employee Portal",
          icon: UserCircle,
          color: "text-employee",
          children: [
            { id: "employee-organization", label: "My Organization", icon: Network },
            { id: "employee-profile", label: "My Profile", icon: UserCircle },
            { id: "employee-communication", label: "Team Communication", icon: Video },
            { id: "learning-hub", label: "Learning Hub", icon: GraduationCap },
            { id: "employee-attendance", label: "Attendance", icon: Clock },
            { id: "employee-activity-tracker", label: "Activity Tracker", icon: Activity },
            { id: "employee-benefits", label: "My Compensation", icon: DollarSign },
            { id: "employee-requests", label: "Requests & Expenses", icon: Calendar },
            { id: "employee-resources", label: "Resources & Events", icon: BookOpen },
            { id: "employee-tasks", label: "Tasks & Approvals", icon: FileCheck },
          ],
        });
        return items; // Return early - no other modules for employee-only access
      }

      // Sales Portal - for sales, presales, inside_sales teams
      if (hasTeamAccess(["sales", "presales", "inside_sales", "management"], "sales")) {
        const salesChildren = [
          { id: "sales-meddic-workflow", label: "MEDDIC Workflow", icon: Sparkles },
          { id: "sales-quotations", label: "Quotations", icon: FileText },
          { id: "sales-leads", label: "Lead Tracking", icon: Activity },
          { id: "sales-my-accounts", label: "My Accounts", icon: Building2 },
          { id: "sales-contacts", label: "My Contacts", icon: Phone },
          { id: "sales-offerings", label: "Offerings", icon: Package },
        ];
        
        items.push({
          id: "sales",
          label: "Sales",
          icon: TrendingUp,
          color: "text-sales",
          children: salesChildren,
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
            { id: "presales-recommendations", label: "Recommendations", icon: BookOpen },
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
            { id: "hr-skill-matrix", label: "Skill Matrix", icon: Target },
            { id: "hr-people", label: "People Management", icon: UserPlus },
            { id: "hr-salary", label: "Salary & Benefits", icon: Briefcase },
            { id: "hr-compliance", label: "Legal & Compliance", icon: Scale },
            { id: "hr-onboarding", label: "Onboarding", icon: Calendar },
          ],
        });
      }

      // Finance & Accounting Module - for finance/accounts team
      if (hasTeamAccess(["finance", "accounts", "management"], "finance")) {
        items.push({
          id: "finance",
          label: "Finance & Accounting",
          icon: Calculator,
          color: "text-finance",
          children: [
            { id: "finance-dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "finance-chart-of-accounts", label: "Chart of Accounts", icon: BookOpen },
            { id: "finance-voucher-entry", label: "Voucher Entry", icon: FileText },
            { id: "finance-billing", label: "Billing", icon: CreditCard },
            { id: "finance-day-book", label: "Day Book", icon: Calendar },
            { id: "finance-trial-balance", label: "Trial Balance", icon: Scale },
            { id: "finance-profit-loss", label: "Profit & Loss", icon: BarChart3 },
            { id: "finance-balance-sheet", label: "Balance Sheet", icon: PieChart },
            { id: "finance-gst", label: "GST Module", icon: Receipt },
            { id: "finance-gst-reports", label: "GST Reports", icon: Receipt },
            { id: "finance-contracts", label: "Contracts", icon: FileText },
            { id: "finance-ar-aging", label: "AR Aging", icon: Clock },
            { id: "finance-procurement", label: "Procurement & Inventory", icon: Package },
          ],
        });
      }

      // Marketing Module - Coming Soon (hidden for now)

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

      // Support Center
      if (hasTeamAccess(["technical", "managed_services", "management"], "ticketing")) {
        items.push({
          id: "helpdesk",
          label: "Support Center",
          icon: HeadphonesIcon,
          color: "text-support",
          children: [
            { id: "helpdesk-tickets", label: "Tickets", icon: Ticket },
            { id: "helpdesk-open", label: "Open", icon: Clock },
            { id: "helpdesk-escalated", label: "Escalated", icon: Bell },
            { id: "helpdesk-remote-sessions", label: "Remote Sessions", icon: Video },
            { id: "helpdesk-templates", label: "Templates", icon: FileText },
            { id: "helpdesk-analytics", label: "Analytics", icon: BarChart3 },
            { id: "helpdesk-automation", label: "Automation", icon: Sparkles },
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
          { id: "employee-profile", label: "My Profile", icon: UserCircle },
          { id: "employee-communication", label: "Team Communication", icon: Video },
          { id: "learning-hub", label: "Learning Hub", icon: GraduationCap },
          { id: "employee-attendance", label: "Attendance", icon: Clock },
          { id: "employee-attendance-reports", label: "Attendance Reports", icon: BarChart3 },
          { id: "employee-benefits", label: "My Compensation", icon: DollarSign },
          { id: "employee-resources", label: "Resources & Docs", icon: BookOpen },
          { id: "employee-events", label: "Events & Recognition", icon: PartyPopper },
          { id: "employee-requests", label: "Leave & Travel", icon: Calendar },
          { id: "employee-tickets", label: "Support Tickets", icon: Ticket },
          { id: "employee-workflows", label: "My Workflows", icon: FolderKanban },
          { id: "employee-approvals", label: "Request Approvals", icon: FileCheck },
        ],
      });

      // IT Module - for IT team
      if (hasTeamAccess(["technical", "admin"], "it")) {
        items.push({
          id: "it",
          label: "IT Services",
          icon: Server,
          color: "text-cyan-500",
          children: [
            { id: "it-tickets", label: "IT Support Tickets", icon: Ticket },
            { id: "it-assets", label: "Digital Assets", icon: Package },
            { id: "it-inventory", label: "IT Inventory", icon: Briefcase },
            { id: "it-workflows", label: "IT Workflows", icon: FolderKanban },
          ],
        });
      }

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

      // Note: Manager role does NOT automatically get management access
      // Access is now strictly based on user_teams assignments
      // Managers only see modules their team is assigned to
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
          { id: "employee-profile", label: "My Profile", icon: UserCircle },
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
      {/* Logo - Shows tenant branding if available */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center">
            {currentTenant?.logo_url ? (
              <img 
                src={currentTenant.logo_url} 
                alt={currentTenant.branding?.display_name || currentTenant.name} 
                className="h-12 max-w-[180px] object-contain"
              />
            ) : (
              <>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="ml-2 font-bold text-lg text-foreground truncate max-w-[140px]">
                  {currentTenant?.branding?.display_name || currentTenant?.name || "NexusCRM"}
                </span>
              </>
            )}
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
          <div key={item.id} className="mb-2">
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
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group/parent",
                "hover:shadow-md",
                activeModule === item.id || activeModule.startsWith(item.id + "-")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                  "transition-all duration-300 group-hover/parent:scale-110 group-hover/parent:rotate-3",
                  activeModule === item.id || activeModule.startsWith(item.id + "-")
                    ? "bg-primary/20"
                    : "bg-sidebar-accent group-hover/parent:bg-sidebar-accent"
                )}
              >
                <item.icon className={cn("w-5 h-5", item.color)} />
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm font-semibold">
                    {item.label}
                  </span>
                  {item.children && (
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 transition-transform duration-300",
                        expandedItems.includes(item.id) && "rotate-90"
                      )}
                    />
                  )}
                </>
              )}
            </button>

            {/* Premium 3D Card Children */}
            {!collapsed && item.children && expandedItems.includes(item.id) && (
              <div className="ml-2 mt-2 space-y-1.5 animate-fade-in">
                {item.children.map((child, index) => (
                  <button
                    key={child.id}
                    onClick={() => {
                      // Handle admin-center children navigation
                      if (child.id.startsWith("admin-center-")) {
                        const path = child.id.replace("admin-center-", "");
                        navigate(`/admin/${path}`);
                      }
                      // Handle Platform Console children
                      if (child.id.startsWith("platform-")) {
                        const path = child.id.replace("platform-", "");
                        navigate(`/admin/platform/${path}`);
                      }
                      onModuleChange(child.id);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-sm group/child",
                      "bg-sidebar-accent/30 hover:bg-sidebar-accent/60",
                      "border border-transparent hover:border-sidebar-border/50",
                      "hover:shadow-md hover:-translate-y-0.5",
                      activeModule === child.id
                        ? "bg-primary/15 border-primary/30 text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        "transition-all duration-300 group-hover/child:scale-110 group-hover/child:rotate-3",
                        activeModule === child.id
                          ? "bg-primary/20 text-primary"
                          : "bg-sidebar-accent text-muted-foreground group-hover/child:bg-primary/10 group-hover/child:text-primary"
                      )}
                    >
                      <child.icon className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-left font-medium">{child.label}</span>
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
          onClick={() => signOut()}
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
