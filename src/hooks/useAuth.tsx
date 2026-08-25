import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User, Session } from "@/integrations/api/aws-types";
// IMPORTANT: import the real Supabase client (works in the Lovable preview).
// In the AWS production build, the Vite alias in vite.config.ts rewrites this
// import to the REST-shim stub, so the same source works in both environments.
import { clearPersistedQueryCache } from "@/lib/query-persist";
import { clearPersistedUiState } from "@/hooks/usePersistentState";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "manager" | "employee";
type TeamType = "sales" | "presales" | "technical" | "managed_services" | "management" | "hr" | "finance" | "inside_sales" | "marketing" | "renewals" | "accounts" | "admin";
type PortalMode = "admin" | "workspace" | "customer";
type UserCategory = "employee" | "contractor" | "vendor" | "distributor" | "customer";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  job_title: string | null;
  user_category: UserCategory | null;
  is_super_admin: boolean | null;
  tenant_id: string | null;
}

interface ConsoleAccess {
  portal_modes: string[];
  additional_modules: string[];
  has_full_access: boolean; // true = full access based on role, false = employee portal only
}

export type DiagnosticStatus = "idle" | "pending" | "ok" | "error" | "skipped";
export interface DiagnosticStep {
  key: "login" | "session" | "profile" | "role" | "teams" | "console_access" | "redirect";
  label: string;
  status: DiagnosticStatus;
  message?: string;
  durationMs?: number;
  startedAt?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  teams: TeamType[];
  portalMode: PortalMode;
  setPortalMode: (mode: PortalMode) => void;
  hasSalesAccess: boolean;
  isManagement: boolean;
  isLoading: boolean;
  isProfileLoading: boolean;
  isRoleLoading: boolean;
  isAuthResolved: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPlatformAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  isCustomer: boolean;
  isAdminMode: boolean;
  refreshTeams: () => Promise<void>;
  consoleAccess: ConsoleAccess | null;
  hasModuleAccess: (moduleId: string) => boolean;
  diagnostics: DiagnosticStep[];
  resetDiagnostics: () => void;
  getRedirectPath: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SALES_TEAMS: TeamType[] = ["sales", "presales", "inside_sales", "management"];

const INITIAL_DIAGNOSTICS: DiagnosticStep[] = [
  { key: "login", label: "Login (credentials)", status: "idle" },
  { key: "session", label: "Session established", status: "idle" },
  { key: "profile", label: "Profile loaded", status: "idle" },
  { key: "role", label: "Role assigned", status: "idle" },
  { key: "teams", label: "Teams fetched", status: "idle" },
  { key: "console_access", label: "Console access resolved", status: "idle" },
  { key: "redirect", label: "Post-login redirect resolved", status: "idle" },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [teams, setTeams] = useState<TeamType[]>([]);
  const [portalMode, setPortalMode] = useState<PortalMode>("admin");
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [consoleAccess, setConsoleAccess] = useState<ConsoleAccess | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticStep[]>(INITIAL_DIAGNOSTICS);

  const updateStep = (key: DiagnosticStep["key"], patch: Partial<DiagnosticStep>) => {
    setDiagnostics(prev =>
      prev.map(s => {
        if (s.key !== key) return s;
        const next = { ...s, ...patch };
        if (patch.status === "pending") next.startedAt = Date.now();
        if ((patch.status === "ok" || patch.status === "error") && s.startedAt) {
          next.durationMs = Date.now() - s.startedAt;
        }
        return next;
      })
    );
  };

  const resetDiagnostics = () => setDiagnostics(INITIAL_DIAGNOSTICS.map(s => ({ ...s })));


  const fetchUserData = async (userId: string) => {
    try {
      setProfile(null);
      setRole(null);
      // Fetch profile
      setIsProfileLoading(true);
      updateStep("profile", { status: "pending", message: undefined });
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (profileErr) {
        updateStep("profile", { status: "error", message: profileErr.message });
      } else if (!profileData) {
        updateStep("profile", { status: "error", message: "No profile row found for this user." });
      } else {
        updateStep("profile", { status: "ok", message: profileData.email ?? undefined });
      }

      if (profileData) {
        setProfile({
          id: profileData.id,
          user_id: profileData.user_id,
          email: profileData.email,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          department: profileData.department,
          job_title: profileData.job_title,
          user_category: profileData.user_category as UserCategory | null,
          is_super_admin: (profileData as any).is_super_admin ?? false,
          tenant_id: (profileData as any).tenant_id ?? null,
        });
        
        // Set portal mode based on user category
        if (profileData.user_category === 'customer') {
          setPortalMode('customer');
        }
        // Admin users default to admin mode (set after role is fetched)
      }
      setIsProfileLoading(false);

      // Fetch role
      setIsRoleLoading(true);
      updateStep("role", { status: "pending", message: undefined });
      const { data: roleData, error: roleErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (roleErr) {
        updateStep("role", { status: "error", message: roleErr.message });
      }

      const isSuperAdminUser = (profileData as any)?.is_super_admin === true;
      
      if (roleData) {
        setRole(roleData.role as AppRole);
        updateStep("role", { status: "ok", message: roleData.role as string });
        // Set default portal mode for admins and super admins
        if ((roleData.role === 'admin' || isSuperAdminUser) && profileData?.user_category !== 'customer') {
          setPortalMode('admin');
        }
      } else {
        setRole("employee");
        updateStep("role", { status: "ok", message: isSuperAdminUser ? "super_admin (implicit)" : "employee (default)" });
        // Super admins without explicit role still get admin mode
        if (isSuperAdminUser) {
          setPortalMode('admin');
        } else if (profileData?.user_category !== 'customer') {
          setPortalMode('workspace');
        }
      }
      setIsRoleLoading(false);

      // Fetch teams
      updateStep("teams", { status: "pending", message: undefined });
      const { data: teamsData, error: teamsErr } = await supabase
        .from("user_teams")
        .select("team")
        .eq("user_id", userId);
      if (teamsErr) {
        updateStep("teams", { status: "error", message: teamsErr.message });
      } else {
        const list = (teamsData ?? []).map(t => t.team as TeamType);
        setTeams(list);
        updateStep("teams", { status: "ok", message: list.length ? list.join(", ") : "no teams assigned" });
      }

      // Fetch console access settings
      updateStep("console_access", { status: "pending", message: undefined });
      const { data: consoleAccessData, error: caErr } = await supabase
        .from("user_console_access")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (caErr) {
        updateStep("console_access", { status: "error", message: caErr.message });
      }



      if (consoleAccessData) {
        // User has explicit console access configured
        const accessSettings: ConsoleAccess = {
          portal_modes: consoleAccessData.portal_modes || ['workspace'],
          additional_modules: consoleAccessData.additional_modules || [],
          has_full_access: true, // They have configured access
        };
        setConsoleAccess(accessSettings);
        
        // Set portal mode based on console access settings
        // Super admins always get admin mode, regardless of console access
        if (isSuperAdminUser) {
          setPortalMode('admin');
        } else if (roleData?.role === 'admin' && accessSettings.portal_modes.includes('admin')) {
          setPortalMode('admin');
        } else if (accessSettings.portal_modes.includes('workspace')) {
          setPortalMode('workspace');
        } else if (accessSettings.portal_modes.includes('customer')) {
          setPortalMode('customer');
        } else if (accessSettings.portal_modes.length > 0) {
          setPortalMode(accessSettings.portal_modes[0] as PortalMode);
        }
      } else {
        // No console access configured - determine access based on role
        // Super admins, admins, and managers retain full access to their team modules
        if (isSuperAdminUser || roleData?.role === 'admin') {
          // Admins and super admins keep full access even without console_access record
          setConsoleAccess({
            portal_modes: ['admin', 'workspace'],
            additional_modules: [],
            has_full_access: true,
          });
          setPortalMode('admin');
        } else if (roleData?.role === 'manager') {
          // Managers get full access to modules based on their team assignments
          setConsoleAccess({
            portal_modes: ['admin', 'workspace'],
            additional_modules: [],
            has_full_access: true,
          });
          setPortalMode('admin');
        } else if (profileData?.user_category === 'customer') {
          // Customers get customer portal
          setConsoleAccess({
            portal_modes: ['customer'],
            additional_modules: [],
            has_full_access: false,
          });
          setPortalMode('customer');
        } else {
          // Regular employees without console_access get EMPLOYEE PORTAL ONLY
          setConsoleAccess({
            portal_modes: ['workspace'],
            additional_modules: ['employee'], // Only employee module access
            has_full_access: false,
          });
          setPortalMode('workspace');
        }
      }
      // Mark console_access ok if not already errored
      setDiagnostics(prev => prev.map(s =>
        s.key === "console_access" && s.status === "pending"
          ? { ...s, status: "ok", message: consoleAccessData ? "configured" : "derived from role", durationMs: s.startedAt ? Date.now() - s.startedAt : undefined }
          : s
      ));
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      setRole("employee");
      setIsProfileLoading(false);
      setIsRoleLoading(false);
      updateStep("profile", { status: "error", message: error?.message ?? "unexpected error" });
    }
  };

  const refreshTeams = async () => {
    if (user) {
      const { data: teamsData } = await supabase
        .from("user_teams")
        .select("team")
        .eq("user_id", user.id);

      if (teamsData) {
        setTeams(teamsData.map(t => t.team as TeamType));
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    let initialSessionHandled = false;

    // First, get the initial session
    const initializeAuth = async () => {
      try {
        updateStep("session", { status: "pending" });
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session as unknown as Session);
        setUser((session?.user ?? null) as unknown as User);
        if (sessErr) {
          updateStep("session", { status: "error", message: sessErr.message });
        } else if (session?.user) {
          updateStep("session", { status: "ok", message: `uid: ${session.user.id.slice(0, 8)}…` });
        } else {
          updateStep("session", { status: "skipped", message: "No active session" });
        }
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
        
        initialSessionHandled = true;
        setIsLoading(false);
      } catch (error: any) {
        console.error("Error initializing auth:", error);
        updateStep("session", { status: "error", message: error?.message ?? "init failed" });
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Then set up the listener for future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        // Skip if this is the initial session (already handled above)
        if (!initialSessionHandled) return;
        
        setSession(session as unknown as Session);
        setUser((session?.user ?? null) as unknown as User);

        if (session?.user) {
          setIsProfileLoading(true);
          setIsRoleLoading(true);
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(async () => {
            if (isMounted) {
              await fetchUserData(session.user.id);
            }
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setIsProfileLoading(false);
          setIsRoleLoading(false);
          setTeams([]);
        }
      }
    );

    // Browsers can restore an inactive tab from BFCache without remounting
    // React. Re-read auth and role/team data so a frozen shell cannot reappear.
    const revalidateAfterResume = async () => {
      if (!isMounted || document.visibilityState !== "visible") return;
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          updateStep("session", { status: "error", message: error.message });
          return;
        }
        setSession(session as unknown as Session);
        setUser((session?.user ?? null) as unknown as User);
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
          setTeams([]);
          setIsProfileLoading(false);
          setIsRoleLoading(false);
        }
      } catch (error: any) {
        updateStep("session", { status: "error", message: error?.message ?? "resume check failed" });
      }
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void revalidateAfterResume();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void revalidateAfterResume();
    };
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    resetDiagnostics();
    updateStep("login", { status: "pending" });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      updateStep("login", { status: "error", message: error.message });
    } else {
      updateStep("login", { status: "ok", message: email });
    }
    return { error: error as Error | null };
  };

  // Compute the correct landing path post-login based on user state.
  const getRedirectPath = (): string => {
    // Platform / super admins land on the global Platform Console
    if (profile?.is_super_admin || role === "admin") return "/admin/platform/tenants";
    // Customers go to their portal
    if (profile?.user_category === "customer") return "/customer";
    // Everyone else lands on the workspace home
    return "/";
  };


  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // The query cache is persisted to disk for fast reopens — it must never
    // outlive the session, or the next user could see the previous tenant's data.
    clearPersistedQueryCache();
    // Saved tabs/filters are per-account UI state and must not follow the next
    // person who signs in on this browser.
    clearPersistedUiState();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setTeams([]);
    setPortalMode("admin");
  };


  const hasSalesAccess = role === "admin" || teams.some(t => SALES_TEAMS.includes(t));
  const isManagement = teams.includes("management") || role === "admin";
  const isCustomer = profile?.user_category === 'customer';
  const isAdminMode = portalMode === 'admin' && role === 'admin';

  // Check if user has access to a specific module based on console access settings
  const hasModuleAccess = (moduleId: string): boolean => {
    // Super admins and admins always have access to everything
    if (role === "admin" || profile?.is_super_admin) return true;
    
    // If no console access configured or doesn't have full access, restrict to employee modules
    if (!consoleAccess || !consoleAccess.has_full_access) {
      // Only allow employee-related modules
      const employeeModules = [
        'employee', 'employee-ai-assistant', 'employee-attendance',
        'employee-attendance-reports', 'employee-requests', 'employee-approvals',
        'employee-events', 'employee-documentation', 'employee-organization',
        'employee-workflows', 'employee-benefits', 'employee-resources',
        'employee-profile', 'employee-leave', 'employee-travel'
      ];
      return employeeModules.some(m => moduleId.startsWith(m) || moduleId === m);
    }
    
    // Check if module is in the user's additional_modules list
    return consoleAccess.additional_modules.includes(moduleId) || 
           consoleAccess.additional_modules.length === 0; // Empty means all modules for that portal
  };

  // Super admins are also considered admins
  const isSuperAdmin = profile?.is_super_admin === true;
  const isAdminOrSuperAdmin = role === "admin" || isSuperAdmin;
  // True for any user who should land in the global Platform Console.
  const isPlatformAdmin = isAdminOrSuperAdmin;
  // Auth is "resolved" when:
  //  - the initial session check finished (isLoading=false), AND
  //  - if a user is logged in, we've finished fetching profile + role.
  // For unauthenticated visitors, the initial check alone is enough.
  const isAuthResolved =
    !isLoading &&
    (!user || (!isProfileLoading && !isRoleLoading));

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    teams,
    portalMode,
    setPortalMode,
    hasSalesAccess,
    isManagement,
    isLoading,
    isProfileLoading,
    isRoleLoading,
    isAuthResolved,
    signIn,
    signUp,
    signOut,
    isAdmin: isAdminOrSuperAdmin,
    isSuperAdmin,
    isPlatformAdmin,
    isManager: role === "manager",
    isEmployee: role === "employee",
    isCustomer,
    isAdminMode,
    refreshTeams,
    consoleAccess,
    hasModuleAccess,
    diagnostics,
    resetDiagnostics,
    getRedirectPath,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export type { TeamType, PortalMode, AppRole, UserCategory };
