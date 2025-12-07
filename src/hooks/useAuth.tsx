import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
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
}

interface ConsoleAccess {
  portal_modes: string[];
  additional_modules: string[];
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
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  isCustomer: boolean;
  isAdminMode: boolean;
  refreshTeams: () => Promise<void>;
  consoleAccess: ConsoleAccess | null;
  hasModuleAccess: (moduleId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SALES_TEAMS: TeamType[] = ["sales", "presales", "inside_sales", "management"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [teams, setTeams] = useState<TeamType[]>([]);
  const [portalMode, setPortalMode] = useState<PortalMode>("admin");
  const [isLoading, setIsLoading] = useState(true);
  const [consoleAccess, setConsoleAccess] = useState<ConsoleAccess | null>(null);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
        
        // Set portal mode based on user category
        if (profileData.user_category === 'customer') {
          setPortalMode('customer');
        }
        // Admin users default to admin mode (set after role is fetched)
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleData) {
        setRole(roleData.role as AppRole);
        // Set default portal mode for admins
        if (roleData.role === 'admin' && profileData?.user_category !== 'customer') {
          setPortalMode('admin');
        }
      } else {
        setRole("employee");
        if (profileData?.user_category !== 'customer') {
          setPortalMode('workspace');
        }
      }

      // Fetch teams
      const { data: teamsData } = await supabase
        .from("user_teams")
        .select("team")
        .eq("user_id", userId);

      if (teamsData) {
        setTeams(teamsData.map(t => t.team as TeamType));
      }

      // Fetch console access settings
      const { data: consoleAccessData } = await supabase
        .from("user_console_access")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (consoleAccessData) {
        const accessSettings = {
          portal_modes: consoleAccessData.portal_modes || ['workspace'],
          additional_modules: consoleAccessData.additional_modules || [],
        };
        setConsoleAccess(accessSettings);
        
        // Set portal mode based on console access settings
        // Only allow admin portal mode if user is admin role AND has admin in portal_modes
        if (roleData?.role === 'admin' && accessSettings.portal_modes.includes('admin')) {
          setPortalMode('admin');
        } else if (accessSettings.portal_modes.includes('workspace')) {
          setPortalMode('workspace');
        } else if (accessSettings.portal_modes.includes('customer')) {
          setPortalMode('customer');
        } else if (accessSettings.portal_modes.length > 0) {
          setPortalMode(accessSettings.portal_modes[0] as PortalMode);
        }
      } else {
        // Default: no specific restrictions (will use role-based access)
        setConsoleAccess(null);
        // Keep existing portal mode logic for users without console access configured
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setRole("employee");
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
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
        
        initialSessionHandled = true;
        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing auth:", error);
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
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(async () => {
            if (isMounted) {
              await fetchUserData(session.user.id);
            }
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setTeams([]);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
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
    // Admins always have access to everything
    if (role === "admin") return true;
    
    // If no console access configured, allow based on team access (legacy behavior)
    if (!consoleAccess) return true;
    
    // Check if module is in the user's additional_modules list
    return consoleAccess.additional_modules.includes(moduleId);
  };

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
    signIn,
    signUp,
    signOut,
    isAdmin: role === "admin",
    isManager: role === "manager",
    isEmployee: role === "employee",
    isCustomer,
    isAdminMode,
    refreshTeams,
    consoleAccess,
    hasModuleAccess,
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
