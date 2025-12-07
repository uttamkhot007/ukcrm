import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Plus, Users, Briefcase, Shield, AlertTriangle, ExternalLink, 
  RefreshCw, Star, Phone, Mail, MapPin, Globe, Linkedin, Twitter, Facebook,
  CheckCircle, Loader2, ChevronDown, ChevronRight, ArrowLeft, 
  FileText, PhoneCall, Video, Sparkles, Copy, Database, Key, Bug,
  Calendar, Clock, Bell, ListTodo, StickyNote, Cake, RotateCcw, Trash2, Edit,
  Save, X, Building2, UserCheck, Headphones, CreditCard, RefreshCcw, Crown, UserPlus, Image
} from "lucide-react";
import { CONTACT_ROLES } from "@/components/shared/OrganizationFormFields";

interface AllianceOrganization {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  status: string;
  created_at: string;
  organization_type: string | null;
  logo_url: string | null;
  address: string | null;
  solutions: string[] | null;
  services: string[] | null;
}

interface AllianceUser {
  id: string;
  organization_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  status: string;
  notes: string | null;
}

interface ThreatIntelligence {
  breaches: Array<{
    name: string;
    date: string;
    records: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }>;
  leakedCredentials: {
    count: number;
    sources: string[];
    lastSeen: string;
  };
  vulnerabilities: Array<{
    cve: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    product: string;
    description: string;
  }>;
  exposedServices: Array<{
    port: number;
    service: string;
    risk: string;
  }>;
  riskScore: number;
  lastUpdated: string;
}

interface OrgNote {
  id: string;
  content: string;
  note_type: string;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
}

interface OrgTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
}

interface OrgMeeting {
  id: string;
  title: string;
  description: string | null;
  meeting_type: string;
  meeting_link: string | null;
  location: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface OrgReminder {
  id: string;
  title: string;
  description: string | null;
  reminder_type: string;
  remind_at: string;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  is_completed: boolean;
  contact_id: string | null;
  created_at: string;
}

const SECURITY_CONTROLS = [
  { id: 'firewall', name: 'Next-Gen Firewall', category: 'Network Security' },
  { id: 'siem', name: 'SIEM Solution', category: 'Monitoring' },
  { id: 'edr', name: 'EDR/XDR', category: 'Endpoint Security' },
  { id: 'dlp', name: 'Data Loss Prevention', category: 'Data Security' },
  { id: 'iam', name: 'Identity & Access Management', category: 'Identity' },
  { id: 'pam', name: 'Privileged Access Management', category: 'Identity' },
  { id: 'mfa', name: 'Multi-Factor Authentication', category: 'Identity' },
  { id: 'casb', name: 'CASB', category: 'Cloud Security' },
  { id: 'waf', name: 'Web Application Firewall', category: 'Application Security' },
  { id: 'vapt', name: 'Vulnerability Assessment', category: 'Risk Management' },
  { id: 'secops', name: 'SecOps', category: 'Operations' },
  { id: 'patch_mgmt', name: 'Patch Management', category: 'Vulnerability Management' },
  { id: 'backup', name: 'Backup & Recovery', category: 'Business Continuity' },
  { id: 'email_security', name: 'Email Security Gateway', category: 'Email Security' },
  { id: 'zero_trust', name: 'Zero Trust Architecture', category: 'Architecture' },
];

interface SolutionConfig {
  oem: string;
  partner: string;
  renewalMonth: string;
  renewalYear: string;
  isManagedService: boolean;
}

interface InfrastructureConfig {
  locations: string;
  endpoints: string;
  servers: string;
  endpointOS: string[];
  serverOS: string[];
  networkDevices: string;
  systemEnvironment: string;
}

interface Collaborator {
  id: string;
  name: string;
  team: string;
  expectation: string;
}

interface TeamConfig {
  accountManager: string;
  technicalAccountManager: string;
  collaborators: Collaborator[];
}

const COLLABORATIVE_TEAMS = [
  { id: 'presales', name: 'Presales', icon: Sparkles, expectations: ['Solution Designing', 'Demo', 'POC', 'Technical Assessment'] },
  { id: 'accounts', name: 'Accounts', icon: CreditCard, expectations: ['Payment Reminders', 'Invoice Management', 'Credit Follow-up'] },
  { id: 'technical', name: 'Technical Team', icon: Headphones, expectations: ['Technical Issues', 'Support Escalation', 'Implementation'] },
  { id: 'renewal', name: 'Renewal Team', icon: RefreshCcw, expectations: ['Renewal Reminders', 'Contract Negotiation', 'Upsell Opportunities'] },
  { id: 'management', name: 'Management', icon: Crown, expectations: ['Executive Connects', 'Strategic Reviews', 'Escalations'] },
];

const OS_OPTIONS = ['Windows', 'Mac', 'Linux'];
const ENVIRONMENT_OPTIONS = ['Domain', 'Workgroup', 'Hybrid'];

const OEM_OPTIONS = [
  'Palo Alto Networks',
  'CrowdStrike',
  'Microsoft',
  'Cisco',
  'Fortinet',
  'Check Point',
  'SentinelOne',
  'Splunk',
  'IBM',
  'McAfee',
  'Trend Micro',
  'Sophos',
  'Tenable',
  'Rapid7',
  'CyberArk',
  'Okta',
  'Zscaler',
  'Cloudflare',
  'Other',
];

const PARTNER_OPTIONS = [
  'Not a Partner',
  'Registered Partner',
  'Silver Partner',
  'Gold Partner',
  'Platinum Partner',
  'Strategic Partner',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const REMINDER_TYPES = [
  { value: 'birthday', label: 'Birthday', icon: Cake },
  { value: 'meeting', label: 'Meeting', icon: Video },
  { value: 'renewal', label: 'Renewal', icon: RotateCcw },
  { value: 'follow_up', label: 'Follow Up', icon: PhoneCall },
  { value: 'custom', label: 'Custom', icon: Bell },
];

interface AllianceOrgProfilePageProps {
  organization: AllianceOrganization;
  onBack: () => void;
}

export function AllianceOrgProfilePage({ organization, onBack }: AllianceOrgProfilePageProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddMeetingOpen, setIsAddMeetingOpen] = useState(false);
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [selectedControls, setSelectedControls] = useState<string[]>([]);
  const [solutionConfigs, setSolutionConfigs] = useState<Record<string, SolutionConfig>>({});
  const [infrastructure, setInfrastructure] = useState<InfrastructureConfig>({
    locations: '',
    endpoints: '',
    servers: '',
    endpointOS: [],
    serverOS: [],
    networkDevices: '',
    systemEnvironment: '',
  });
  const [expandedSolutions, setExpandedSolutions] = useState<string[]>([]);
  const [threatIntel, setThreatIntel] = useState<ThreatIntelligence | null>(null);
  const [isLoadingThreat, setIsLoadingThreat] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [contactsExpanded, setContactsExpanded] = useState(true);
  const [dealsExpanded, setDealsExpanded] = useState(true);
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [meetingsExpanded, setMeetingsExpanded] = useState(true);
  const [remindersExpanded, setRemindersExpanded] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [teamConfig, setTeamConfig] = useState<TeamConfig>({
    accountManager: '',
    technicalAccountManager: '',
    collaborators: [],
  });
  const [isAddCollaboratorOpen, setIsAddCollaboratorOpen] = useState(false);
  const [newCollaborator, setNewCollaborator] = useState({ name: '', team: '', expectation: '', userId: '' });
  
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch employees for account manager selection
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list", currentTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("user_id, full_name, email, department")
        .order("full_name");

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Array<{ user_id: string; full_name: string | null; email: string | null; department: string | null }>;
    },
  });

  // Fetch contacts
  const { data: contacts = [], refetch: refetchContacts } = useQuery({
    queryKey: ["org-contacts", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("alliance_users")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name");
      if (error) throw error;
      return data as AllianceUser[];
    },
    enabled: !!organization?.id,
  });

  // Fetch deals
  const { data: deals = [], refetch: refetchDeals } = useQuery({
    queryKey: ["org-deals", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data: orgContacts } = await supabase
        .from("contacts")
        .select("id")
        .ilike("company", `%${organization.name}%`);
      
      if (!orgContacts || orgContacts.length === 0) return [];
      
      const contactIds = orgContacts.map(c => c.id);
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .in("contact_id", contactIds)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });

  // Fetch notes
  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["org-notes", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("organization_notes")
        .select("*")
        .eq("organization_id", organization.id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrgNote[];
    },
    enabled: !!organization?.id,
  });

  // Fetch tasks
  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ["org-tasks", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("organization_tasks")
        .select("*")
        .eq("organization_id", organization.id)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrgTask[];
    },
    enabled: !!organization?.id,
  });

  // Fetch meetings
  const { data: meetings = [], refetch: refetchMeetings } = useQuery({
    queryKey: ["org-meetings", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("organization_meetings")
        .select("*")
        .eq("organization_id", organization.id)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as OrgMeeting[];
    },
    enabled: !!organization?.id,
  });

  // Fetch reminders
  const { data: reminders = [], refetch: refetchReminders } = useQuery({
    queryKey: ["org-reminders", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("organization_reminders")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("is_completed", false)
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return data as OrgReminder[];
    },
    enabled: !!organization?.id,
  });

  // Fetch threat intelligence
  const fetchThreatIntelligence = async () => {
    if (!organization?.website) {
      toast.error("No website URL available for threat analysis");
      return;
    }

    setIsLoadingThreat(true);
    try {
      const { data, error } = await supabase.functions.invoke('threat-intelligence', {
        body: { domain: organization.website, companyName: organization.name }
      });
      if (error) throw error;
      setThreatIntel(data);
      setLastRefresh(new Date());
      toast.success("Threat intelligence updated");
    } catch (error: any) {
      console.error("Threat intel error:", error);
      toast.error("Failed to fetch threat intelligence");
    } finally {
      setIsLoadingThreat(false);
    }
  };

  // Enrich company
  const enrichCompany = async () => {
    if (!organization?.website) {
      toast.error("No website URL available for enrichment");
      return;
    }

    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-company', {
        body: { url: organization.website }
      });
      if (error) throw error;
      toast.success("Company data enriched successfully");
      queryClient.invalidateQueries({ queryKey: ["alliance-organizations"] });
    } catch (error: any) {
      console.error("Enrichment error:", error);
      toast.error("Failed to enrich company data");
    } finally {
      setIsEnriching(false);
    }
  };

  useEffect(() => {
    if (organization?.website && !threatIntel) {
      fetchThreatIntelligence();
    }
  }, [organization?.website]);

  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: async (contactData: any) => {
      const { error } = await supabase
        .from("alliance_users")
        .insert({
          tenant_id: currentTenant?.id,
          organization_id: organization?.id,
          name: contactData.name,
          email: contactData.email || null,
          phone: contactData.phone || null,
          role: contactData.role,
          notes: contactData.isChampion ? '[CHAMPION]' : null,
          status: 'active',
          created_by: user?.id!,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchContacts();
      setIsAddContactOpen(false);
      toast.success("Contact added");
    },
    onError: (error) => {
      toast.error("Failed to add contact: " + error.message);
    },
  });

  // Add deal mutation
  const addDealMutation = useMutation({
    mutationFn: async (dealData: any) => {
      let contactId = null;
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .ilike("company", `%${organization?.name}%`)
        .limit(1)
        .single();

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const { data: newContact, error: contactError } = await supabase
          .from("contacts")
          .insert({
            tenant_id: currentTenant?.id,
            user_id: user?.id!,
            name: organization?.name || 'Unknown',
            company: organization?.name,
          })
          .select('id')
          .single();
        if (contactError) throw contactError;
        contactId = newContact.id;
      }

      const { error } = await supabase
        .from("deals")
        .insert({
          tenant_id: currentTenant?.id,
          user_id: user?.id!,
          contact_id: contactId,
          title: dealData.title,
          value: parseFloat(dealData.value) || 0,
          stage: 'pipeline',
          description: dealData.description,
          expected_close_date: dealData.expectedCloseDate || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchDeals();
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setIsAddDealOpen(false);
      toast.success("Deal created");
    },
    onError: (error) => {
      toast.error("Failed to create deal: " + error.message);
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      const { error } = await supabase
        .from("organization_notes")
        .insert({
          tenant_id: currentTenant?.id,
          organization_id: organization?.id,
          user_id: user?.id!,
          content: noteData.content,
          note_type: noteData.note_type || 'general',
          is_pinned: noteData.is_pinned || false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchNotes();
      setIsAddNoteOpen(false);
      toast.success("Note added");
    },
    onError: (error) => {
      toast.error("Failed to add note: " + error.message);
    },
  });

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const { error } = await supabase
        .from("organization_tasks")
        .insert({
          tenant_id: currentTenant?.id,
          organization_id: organization?.id,
          user_id: user?.id!,
          title: taskData.title,
          description: taskData.description || null,
          priority: taskData.priority || 'medium',
          due_date: taskData.due_date || null,
          assigned_to: taskData.assigned_to || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchTasks();
      setIsAddTaskOpen(false);
      toast.success("Task created");
    },
    onError: (error) => {
      toast.error("Failed to create task: " + error.message);
    },
  });

  // Toggle task status
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from("organization_tasks")
        .update({
          status: completed ? 'completed' : 'pending',
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchTasks();
    },
  });

  // Add meeting mutation
  const addMeetingMutation = useMutation({
    mutationFn: async (meetingData: any) => {
      const { error } = await supabase
        .from("organization_meetings")
        .insert({
          tenant_id: currentTenant?.id,
          organization_id: organization?.id,
          user_id: user?.id!,
          title: meetingData.title,
          description: meetingData.description || null,
          meeting_type: meetingData.meeting_type || 'general',
          meeting_link: meetingData.meeting_link || null,
          location: meetingData.location || null,
          scheduled_at: meetingData.scheduled_at,
          duration_minutes: parseInt(meetingData.duration_minutes) || 60,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchMeetings();
      setIsAddMeetingOpen(false);
      toast.success("Meeting scheduled");
    },
    onError: (error) => {
      toast.error("Failed to schedule meeting: " + error.message);
    },
  });

  // Add reminder mutation
  const addReminderMutation = useMutation({
    mutationFn: async (reminderData: any) => {
      const { error } = await supabase
        .from("organization_reminders")
        .insert({
          tenant_id: currentTenant?.id,
          organization_id: organization?.id,
          user_id: user?.id!,
          title: reminderData.title,
          description: reminderData.description || null,
          reminder_type: reminderData.reminder_type,
          remind_at: reminderData.remind_at,
          is_recurring: reminderData.is_recurring || false,
          recurrence_pattern: reminderData.recurrence_pattern || null,
          contact_id: reminderData.contact_id || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchReminders();
      setIsAddReminderOpen(false);
      toast.success("Reminder set");
    },
    onError: (error) => {
      toast.error("Failed to set reminder: " + error.message);
    },
  });

  // Complete reminder mutation
  const completeReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from("organization_reminders")
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchReminders();
      toast.success("Reminder completed");
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("organization_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchNotes();
      toast.success("Note deleted");
    },
  });

  const toggleControl = (controlId: string) => {
    setSelectedControls(prev => 
      prev.includes(controlId) ? prev.filter(c => c !== controlId) : [...prev, controlId]
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'closed_won': return 'text-green-600';
      case 'closed_lost': return 'text-red-600';
      case 'negotiation': return 'text-orange-600';
      case 'proposal': return 'text-blue-600';
      default: return 'text-primary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getReminderTypeIcon = (type: string) => {
    const found = REMINDER_TYPES.find(r => r.value === type);
    return found ? found.icon : Bell;
  };

  const champion = contacts.find(c => c.notes?.includes('[CHAMPION]'));
  const websiteClean = organization.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '';
  const upcomingMeetings = meetings.filter(m => new Date(m.scheduled_at) >= new Date());
  const pendingTasks = tasks.filter(t => t.status !== 'completed');

  // Save all settings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Here you would save the security controls, infrastructure, and solution configs
      // For now, we'll just show a success message
      // In production, you'd save these to a database table
      toast.success("Settings saved successfully");
    } catch (error: any) {
      toast.error("Failed to save settings: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-background rounded-lg border overflow-hidden">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Close
          </Button>
          <Button 
            size="sm" 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="gap-1"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-72 border-r bg-card flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-4">

            <div className="flex items-start gap-3 mb-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={organization.logo_url || ""} alt={organization.name} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {organization.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold truncate">{organization.name}</h1>
                {organization.website && (
                  <a href={organization.website} target="_blank" rel="noopener noreferrer"
                     className="text-sm text-primary hover:underline flex items-center gap-1">
                    {websiteClean}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex gap-1.5 mb-4 flex-wrap">
              <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-8 flex-1">
                    <StickyNote className="h-3 w-3" />Note
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Note</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    const fd = new FormData(e.currentTarget); 
                    addNoteMutation.mutate({ 
                      content: fd.get('content'), 
                      note_type: fd.get('note_type'),
                      is_pinned: fd.get('is_pinned') === 'on'
                    }); 
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Note Type</Label>
                      <Select name="note_type" defaultValue="general">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="call">Call Notes</SelectItem>
                          <SelectItem value="meeting">Meeting Notes</SelectItem>
                          <SelectItem value="email">Email Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Content *</Label>
                      <Textarea name="content" required rows={4} placeholder="Enter your note..." />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox name="is_pinned" id="is_pinned" />
                      <Label htmlFor="is_pinned">Pin this note</Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={addNoteMutation.isPending}>
                      {addNoteMutation.isPending ? "Saving..." : "Save Note"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="outline" className="gap-1 text-xs h-8 flex-1">
                <Mail className="h-3 w-3" />Email
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-xs h-8 flex-1">
                <PhoneCall className="h-3 w-3" />Call
              </Button>
              <Dialog open={isAddMeetingOpen} onOpenChange={setIsAddMeetingOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-8 flex-1">
                    <Video className="h-3 w-3" />Meet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Schedule Meeting</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    const fd = new FormData(e.currentTarget); 
                    addMeetingMutation.mutate({ 
                      title: fd.get('title'),
                      description: fd.get('description'),
                      meeting_type: fd.get('meeting_type'),
                      meeting_link: fd.get('meeting_link'),
                      location: fd.get('location'),
                      scheduled_at: fd.get('scheduled_at'),
                      duration_minutes: fd.get('duration_minutes'),
                    }); 
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input name="title" required placeholder={`Meeting with ${organization.name}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select name="meeting_type" defaultValue="general">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="demo">Demo</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="kickoff">Kickoff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Duration (mins)</Label>
                        <Select name="duration_minutes" defaultValue="60">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30 mins</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="90">1.5 hours</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Date & Time *</Label>
                      <Input name="scheduled_at" type="datetime-local" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Meeting Link</Label>
                      <Input name="meeting_link" placeholder="https://meet.google.com/..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input name="location" placeholder="Office / Conference Room" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea name="description" rows={2} />
                    </div>
                    <Button type="submit" className="w-full" disabled={addMeetingMutation.isPending}>
                      {addMeetingMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex gap-1.5 mb-6 flex-wrap">
              <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-8 flex-1">
                    <ListTodo className="h-3 w-3" />Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    const fd = new FormData(e.currentTarget); 
                    addTaskMutation.mutate({ 
                      title: fd.get('title'),
                      description: fd.get('description'),
                      priority: fd.get('priority'),
                      due_date: fd.get('due_date') || null,
                    }); 
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input name="title" required placeholder="Task title" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select name="priority" defaultValue="medium">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Input name="due_date" type="date" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea name="description" rows={3} />
                    </div>
                    <Button type="submit" className="w-full" disabled={addTaskMutation.isPending}>
                      {addTaskMutation.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog open={isAddReminderOpen} onOpenChange={setIsAddReminderOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-8 flex-1">
                    <Bell className="h-3 w-3" />Remind
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Set Reminder</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    const fd = new FormData(e.currentTarget); 
                    addReminderMutation.mutate({ 
                      title: fd.get('title'),
                      description: fd.get('description'),
                      reminder_type: fd.get('reminder_type'),
                      remind_at: fd.get('remind_at'),
                      is_recurring: fd.get('is_recurring') === 'on',
                      recurrence_pattern: fd.get('recurrence_pattern'),
                      contact_id: fd.get('contact_id') || null,
                    }); 
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input name="title" required placeholder="Reminder title" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type *</Label>
                        <Select name="reminder_type" defaultValue="follow_up">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {REMINDER_TYPES.map(rt => (
                              <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Contact</Label>
                        <Select name="contact_id">
                          <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                          <SelectContent>
                            {contacts.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Remind At *</Label>
                      <Input name="remind_at" type="datetime-local" required />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox name="is_recurring" id="is_recurring" />
                        <Label htmlFor="is_recurring">Recurring</Label>
                      </div>
                      <Select name="recurrence_pattern" defaultValue="yearly">
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea name="description" rows={2} />
                    </div>
                    <Button type="submit" className="w-full" disabled={addReminderMutation.isPending}>
                      {addReminderMutation.isPending ? "Setting..." : "Set Reminder"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">About this company</h3>
              <div className="space-y-3 text-sm">
                <div><Label className="text-xs text-muted-foreground">Website URL</Label><p>{websiteClean || '--'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Type</Label><p>{organization.organization_type || '--'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Industry</Label><p>{organization.industry || '--'}</p></div>
                {organization.address && <div><Label className="text-xs text-muted-foreground">Address</Label><p>{organization.address}</p></div>}
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={organization.status === "active" ? "default" : "secondary"}>{organization.status}</Badge>
                  </div>
                </div>
                {champion && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Champion</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span className="font-medium">{champion.name}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="pt-4 border-t space-y-2">
                <h3 className="font-semibold text-sm">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground">Contacts</p>
                    <p className="font-bold text-lg">{contacts.length}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground">Deals</p>
                    <p className="font-bold text-lg">{deals.length}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground">Tasks</p>
                    <p className="font-bold text-lg">{pendingTasks.length}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground">Meetings</p>
                    <p className="font-bold text-lg">{upcomingMeetings.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Center Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b bg-card px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-11 bg-transparent border-0 p-0 gap-4">
              <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3">Overview</TabsTrigger>
              <TabsTrigger value="activities" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3">Activities</TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3">Tasks</TabsTrigger>
              <TabsTrigger value="calendar" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3">Calendar</TabsTrigger>
              <TabsTrigger value="intelligence" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-3">Intelligence</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {activeTab === "overview" && (
              <>
                {/* Enrichment Card */}
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <p className="text-sm">AI can enrich data for {organization.name}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={enrichCompany} disabled={isEnriching} className="gap-1">
                      {isEnriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Enrich record
                    </Button>
                  </CardContent>
                </Card>

                {/* Company Card with Enhanced Logo */}
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6 border-b">
                    <div className="flex items-start gap-6">
                      {/* Large Logo Display */}
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-card flex items-center justify-center overflow-hidden shadow-md">
                          {organization.logo_url ? (
                            <img 
                              src={organization.logo_url} 
                              alt={organization.name}
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <div className="text-center">
                              <Image className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                              <p className="text-xs text-muted-foreground mt-1">No Logo</p>
                            </div>
                          )}
                        </div>
                        <Badge className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground">
                          {organization.organization_type || 'Customer'}
                        </Badge>
                      </div>

                      {/* Company Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-2xl font-bold">{organization.name}</h2>
                            <p className="text-muted-foreground">{organization.industry || 'Industry not specified'}</p>
                            {organization.website && (
                              <a href={organization.website} target="_blank" rel="noopener noreferrer" 
                                className="text-primary hover:underline flex items-center gap-1 mt-1">
                                <Globe className="h-4 w-4" />
                                {websiteClean}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <Badge variant={organization.status === "active" ? "default" : "secondary"} className="text-sm">
                            {organization.status}
                          </Badge>
                        </div>

                        {/* Quick Info Grid */}
                        <div className="grid grid-cols-4 gap-4 mt-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground block">Employees</span>
                            <span className="font-semibold">--</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground block">Annual Revenue</span>
                            <span className="font-semibold">--</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground block">Contacts</span>
                            <span className="font-semibold">{contacts.length}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground block">Open Deals</span>
                            <span className="font-semibold">{deals.length}</span>
                          </div>
                        </div>
                      </div>

                      {/* Social Links */}
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9"><Facebook className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9"><Linkedin className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9"><Twitter className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>

                  {organization.description && (
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">{organization.description}</p>
                    </CardContent>
                  )}
                </Card>

                {/* Account Management Team */}
                <Card>
                  <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Account Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium flex items-center gap-2">
                          <Briefcase className="h-3 w-3" />
                          Account Manager
                        </Label>
                        <Select 
                          value={teamConfig.accountManager}
                          onValueChange={(value) => setTeamConfig({...teamConfig, accountManager: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Account Manager" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map(emp => (
                              <SelectItem key={emp.user_id} value={emp.user_id}>
                                <div className="flex flex-col">
                                  <span>{emp.full_name || emp.email}</span>
                                  {emp.department && (
                                    <span className="text-xs text-muted-foreground">{emp.department}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium flex items-center gap-2">
                          <Headphones className="h-3 w-3" />
                          Technical Account Manager
                        </Label>
                        <Select 
                          value={teamConfig.technicalAccountManager}
                          onValueChange={(value) => setTeamConfig({...teamConfig, technicalAccountManager: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Technical Account Manager" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map(emp => (
                              <SelectItem key={emp.user_id} value={emp.user_id}>
                                <div className="flex flex-col">
                                  <span>{emp.full_name || emp.email}</span>
                                  {emp.department && (
                                    <span className="text-xs text-muted-foreground">{emp.department}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Collaborative Team Section */}
                <Card>
                  <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Collaborative Team
                    </CardTitle>
                    <Dialog open={isAddCollaboratorOpen} onOpenChange={setIsAddCollaboratorOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1 h-7">
                          <UserPlus className="h-3 w-3" />
                          Add Collaborator
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Collaborator</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Team *</Label>
                            <Select 
                              value={newCollaborator.team}
                              onValueChange={(value) => setNewCollaborator({...newCollaborator, team: value, expectation: '', name: '', userId: ''})}
                            >
                              <SelectTrigger><SelectValue placeholder="Select team first" /></SelectTrigger>
                              <SelectContent>
                                {COLLABORATIVE_TEAMS.map(team => (
                                  <SelectItem key={team.id} value={team.id}>
                                    <div className="flex items-center gap-2">
                                      <team.icon className="h-4 w-4" />
                                      {team.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {newCollaborator.team && (
                            <div className="space-y-2">
                              <Label>Team Member *</Label>
                              <Select 
                                value={newCollaborator.userId}
                                onValueChange={(value) => {
                                  const emp = employees.find(e => e.user_id === value);
                                  setNewCollaborator({...newCollaborator, userId: value, name: emp?.full_name || emp?.email || value});
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select team member" />
                                </SelectTrigger>
                                <SelectContent>
                                  {employees
                                    .filter(emp => {
                                      const teamInfo = COLLABORATIVE_TEAMS.find(t => t.id === newCollaborator.team);
                                      if (!teamInfo) return true;
                                      // Filter by department matching team name (case-insensitive)
                                      const dept = emp.department?.toLowerCase() || '';
                                      const teamName = teamInfo.name.toLowerCase();
                                      const teamId = teamInfo.id.toLowerCase();
                                      return dept.includes(teamId) || dept.includes(teamName) || 
                                             teamName.includes(dept) || dept === '' || !emp.department;
                                    })
                                    .map(emp => (
                                      <SelectItem key={emp.user_id} value={emp.user_id}>
                                        <div className="flex flex-col">
                                          <span>{emp.full_name || emp.email}</span>
                                          {emp.department && (
                                            <span className="text-xs text-muted-foreground">{emp.department}</span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  {employees.filter(emp => {
                                    const teamInfo = COLLABORATIVE_TEAMS.find(t => t.id === newCollaborator.team);
                                    if (!teamInfo) return true;
                                    const dept = emp.department?.toLowerCase() || '';
                                    const teamName = teamInfo.name.toLowerCase();
                                    const teamId = teamInfo.id.toLowerCase();
                                    return dept.includes(teamId) || dept.includes(teamName) || 
                                           teamName.includes(dept) || dept === '' || !emp.department;
                                  }).length === 0 && (
                                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                                      No team members found. Showing all employees.
                                    </div>
                                  )}
                                  {employees.filter(emp => {
                                    const teamInfo = COLLABORATIVE_TEAMS.find(t => t.id === newCollaborator.team);
                                    if (!teamInfo) return true;
                                    const dept = emp.department?.toLowerCase() || '';
                                    const teamName = teamInfo.name.toLowerCase();
                                    const teamId = teamInfo.id.toLowerCase();
                                    return dept.includes(teamId) || dept.includes(teamName) || 
                                           teamName.includes(dept) || dept === '' || !emp.department;
                                  }).length === 0 && employees.map(emp => (
                                    <SelectItem key={emp.user_id} value={emp.user_id}>
                                      <div className="flex flex-col">
                                        <span>{emp.full_name || emp.email}</span>
                                        {emp.department && (
                                          <span className="text-xs text-muted-foreground">{emp.department}</span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {newCollaborator.team && (
                            <div className="space-y-2">
                              <Label>Expectation *</Label>
                              <Select 
                                value={newCollaborator.expectation}
                                onValueChange={(value) => setNewCollaborator({...newCollaborator, expectation: value})}
                              >
                                <SelectTrigger><SelectValue placeholder="Select expectation" /></SelectTrigger>
                                <SelectContent>
                                  {COLLABORATIVE_TEAMS.find(t => t.id === newCollaborator.team)?.expectations.map(exp => (
                                    <SelectItem key={exp} value={exp}>{exp}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <Button 
                            className="w-full"
                            disabled={!newCollaborator.name || !newCollaborator.team || !newCollaborator.expectation}
                            onClick={() => {
                              const collaborator: Collaborator = {
                                id: Date.now().toString(),
                                name: newCollaborator.name,
                                team: newCollaborator.team,
                                expectation: newCollaborator.expectation,
                              };
                              setTeamConfig({
                                ...teamConfig,
                                collaborators: [...teamConfig.collaborators, collaborator]
                              });
                              setNewCollaborator({ name: '', team: '', expectation: '', userId: '' });
                              setIsAddCollaboratorOpen(false);
                              toast.success("Collaborator added successfully");
                            }}
                          >
                            Add Collaborator
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    {/* Team Categories */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                      {COLLABORATIVE_TEAMS.map(team => {
                        const teamCollaborators = teamConfig.collaborators.filter(c => c.team === team.id);
                        return (
                          <div key={team.id} className="p-3 rounded-lg border bg-muted/30">
                            <div className="flex items-center gap-2 mb-2">
                              <team.icon className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">{team.name}</span>
                              <Badge variant="outline" className="ml-auto text-xs">{teamCollaborators.length}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {team.expectations.slice(0, 2).join(', ')}...
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Added Collaborators List */}
                    {teamConfig.collaborators.length === 0 ? (
                      <div className="text-center py-6 border rounded-lg border-dashed">
                        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No collaborators added yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Click "Add Collaborator" to assign team members</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Assigned Collaborators</Label>
                        <div className="space-y-2">
                          {teamConfig.collaborators.map(collaborator => {
                            const teamInfo = COLLABORATIVE_TEAMS.find(t => t.id === collaborator.team);
                            const TeamIcon = teamInfo?.icon || Users;
                            return (
                              <div key={collaborator.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {collaborator.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">{collaborator.name}</p>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs gap-1">
                                        <TeamIcon className="h-3 w-3" />
                                        {teamInfo?.name}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">{collaborator.expectation}</span>
                                    </div>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setTeamConfig({
                                      ...teamConfig,
                                      collaborators: teamConfig.collaborators.filter(c => c.id !== collaborator.id)
                                    });
                                    toast.success("Collaborator removed");
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notes Section */}
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <StickyNote className="h-4 w-4" />
                      Notes ({notes.length})
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setIsAddNoteOpen(true)} className="gap-1 text-primary h-7">
                      <Plus className="h-4 w-4" />Add
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                    ) : (
                      <div className="space-y-3">
                        {notes.slice(0, 5).map(note => (
                          <div key={note.id} className={`p-3 rounded-lg border ${note.is_pinned ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : 'bg-muted/30'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {note.is_pinned && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                                  <Badge variant="outline" className="text-xs">{note.note_type}</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                  </span>
                                </div>
                                <p className="text-sm">{note.content}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteNoteMutation.mutate(note.id)}>
                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {(organization.solutions?.length || organization.services?.length) && (
                  <Card><CardHeader><CardTitle className="text-sm">Solutions & Services</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {organization.solutions && organization.solutions.length > 0 && (
                        <div><Label className="text-xs text-muted-foreground">Solutions</Label>
                          <div className="flex flex-wrap gap-1 mt-1">{organization.solutions.map((s, i) => <Badge key={i} variant="outline">{s}</Badge>)}</div>
                        </div>
                      )}
                      {organization.services && organization.services.length > 0 && (
                        <div><Label className="text-xs text-muted-foreground">Services</Label>
                          <div className="flex flex-wrap gap-1 mt-1">{organization.services.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Infrastructure Section */}
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Infrastructure
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">No. of Locations</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={infrastructure.locations}
                          onChange={(e) => setInfrastructure({...infrastructure, locations: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">No. of Endpoints</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={infrastructure.endpoints}
                          onChange={(e) => setInfrastructure({...infrastructure, endpoints: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">No. of Servers</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={infrastructure.servers}
                          onChange={(e) => setInfrastructure({...infrastructure, servers: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">No. of Network Devices</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={infrastructure.networkDevices}
                          onChange={(e) => setInfrastructure({...infrastructure, networkDevices: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Endpoint OS Platforms</Label>
                        <div className="flex gap-2">
                          {OS_OPTIONS.map(os => (
                            <Button
                              key={os}
                              type="button"
                              size="sm"
                              variant={infrastructure.endpointOS.includes(os) ? "default" : "outline"}
                              className={infrastructure.endpointOS.includes(os) ? "bg-primary" : ""}
                              onClick={() => {
                                const newOS = infrastructure.endpointOS.includes(os)
                                  ? infrastructure.endpointOS.filter(o => o !== os)
                                  : [...infrastructure.endpointOS, os];
                                setInfrastructure({...infrastructure, endpointOS: newOS});
                              }}
                            >
                              {os}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Server OS Platforms</Label>
                        <div className="flex gap-2">
                          {OS_OPTIONS.map(os => (
                            <Button
                              key={os}
                              type="button"
                              size="sm"
                              variant={infrastructure.serverOS.includes(os) ? "default" : "outline"}
                              className={infrastructure.serverOS.includes(os) ? "bg-primary" : ""}
                              onClick={() => {
                                const newOS = infrastructure.serverOS.includes(os)
                                  ? infrastructure.serverOS.filter(o => o !== os)
                                  : [...infrastructure.serverOS, os];
                                setInfrastructure({...infrastructure, serverOS: newOS});
                              }}
                            >
                              {os}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium">System Environment</Label>
                      <div className="flex gap-2">
                        {ENVIRONMENT_OPTIONS.map(env => (
                          <Button
                            key={env}
                            type="button"
                            size="sm"
                            variant={infrastructure.systemEnvironment === env ? "default" : "outline"}
                            className={infrastructure.systemEnvironment === env ? "bg-primary" : ""}
                            onClick={() => setInfrastructure({...infrastructure, systemEnvironment: env})}
                          >
                            {env}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Security Controls */}
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-sm">Security Solutions</CardTitle>
                    <Badge variant="outline">{selectedControls.length} selected</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {SECURITY_CONTROLS.map(control => {
                      const isSelected = selectedControls.includes(control.id);
                      const isExpanded = expandedSolutions.includes(control.id);
                      const config = solutionConfigs[control.id] || { oem: '', partner: '', renewalMonth: '', renewalYear: '', isManagedService: false };
                      
                      return (
                        <div key={control.id} className={`border rounded-lg transition-all ${isSelected ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : ''}`}>
                          <div 
                            className="flex items-center justify-between p-3 cursor-pointer"
                            onClick={() => {
                              if (!isSelected) {
                                setSelectedControls([...selectedControls, control.id]);
                                setExpandedSolutions([...expandedSolutions, control.id]);
                              } else {
                                setExpandedSolutions(
                                  isExpanded 
                                    ? expandedSolutions.filter(id => id !== control.id)
                                    : [...expandedSolutions, control.id]
                                );
                              }
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${isSelected ? 'bg-green-500 text-white' : 'bg-muted'}`}>
                                {isSelected ? <CheckCircle className="h-4 w-4" /> : <Shield className="h-4 w-4 text-muted-foreground" />}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{control.name}</p>
                                <p className="text-xs text-muted-foreground">{control.category}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSelected && config.oem && (
                                <Badge variant="secondary" className="text-xs">{config.oem}</Badge>
                              )}
                              {isSelected && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedControls(selectedControls.filter(id => id !== control.id));
                                    setExpandedSolutions(expandedSolutions.filter(id => id !== control.id));
                                    const newConfigs = {...solutionConfigs};
                                    delete newConfigs[control.id];
                                    setSolutionConfigs(newConfigs);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                </Button>
                              )}
                              {isSelected && (
                                isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          
                          {isSelected && isExpanded && (
                            <div className="px-4 pb-4 pt-1 border-t bg-muted/20">
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">OEM / Vendor</Label>
                                  <Select 
                                    value={config.oem} 
                                    onValueChange={(val) => setSolutionConfigs({
                                      ...solutionConfigs, 
                                      [control.id]: {...config, oem: val}
                                    })}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Select OEM" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {OEM_OPTIONS.map(oem => (
                                        <SelectItem key={oem} value={oem}>{oem}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Partner</Label>
                                  <Select 
                                    value={config.partner} 
                                    onValueChange={(val) => setSolutionConfigs({
                                      ...solutionConfigs, 
                                      [control.id]: {...config, partner: val}
                                    })}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Select Partner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PARTNER_OPTIONS.map(partner => (
                                        <SelectItem key={partner} value={partner}>{partner}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Renewal Date</Label>
                                  <div className="flex gap-1">
                                    <Select 
                                      value={config.renewalMonth} 
                                      onValueChange={(val) => setSolutionConfigs({
                                        ...solutionConfigs, 
                                        [control.id]: {...config, renewalMonth: val}
                                      })}
                                    >
                                      <SelectTrigger className="h-8 text-xs flex-1">
                                        <SelectValue placeholder="Month" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {MONTHS.map((month, i) => (
                                          <SelectItem key={month} value={String(i + 1).padStart(2, '0')}>{month.slice(0, 3)}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select 
                                      value={config.renewalYear} 
                                      onValueChange={(val) => setSolutionConfigs({
                                        ...solutionConfigs, 
                                        [control.id]: {...config, renewalYear: val}
                                      })}
                                    >
                                      <SelectTrigger className="h-8 text-xs w-20">
                                        <SelectValue placeholder="Year" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                                          <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Managed Service</Label>
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={config.isManagedService === false ? "default" : "outline"}
                                      className={`flex-1 h-8 text-xs ${config.isManagedService === false ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                                      onClick={() => setSolutionConfigs({
                                        ...solutionConfigs, 
                                        [control.id]: {...config, isManagedService: false}
                                      })}
                                    >
                                      No
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={config.isManagedService === true ? "default" : "outline"}
                                      className={`flex-1 h-8 text-xs ${config.isManagedService === true ? 'bg-green-500 hover:bg-green-600' : ''}`}
                                      onClick={() => setSolutionConfigs({
                                        ...solutionConfigs, 
                                        [control.id]: {...config, isManagedService: true}
                                      })}
                                    >
                                      Yes
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "activities" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Activity Timeline</h3>
                </div>
                
                {/* Notes as activities */}
                {notes.length === 0 && meetings.length === 0 ? (
                  <Card className="p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No activities yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Add notes, meetings, or tasks to see activity</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {[...notes, ...meetings].sort((a, b) => 
                      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    ).map((item: any) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${item.scheduled_at ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-muted'}`}>
                            {item.scheduled_at ? <Calendar className="h-4 w-4 text-blue-600" /> : <StickyNote className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {item.scheduled_at ? 'Meeting' : item.note_type || 'Note'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{item.content || item.title}</p>
                            {item.scheduled_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Scheduled: {new Date(item.scheduled_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Tasks ({tasks.length})</h3>
                  <Button size="sm" onClick={() => setIsAddTaskOpen(true)} className="gap-1">
                    <Plus className="h-4 w-4" />Add Task
                  </Button>
                </div>

                {tasks.length === 0 ? (
                  <Card className="p-8 text-center">
                    <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No tasks yet</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <Card key={task.id} className={`p-4 ${task.status === 'completed' ? 'opacity-60' : ''}`}>
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={task.status === 'completed'}
                            onCheckedChange={(checked) => toggleTaskMutation.mutate({ taskId: task.id, completed: !!checked })}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>{task.title}</p>
                              <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                            </div>
                            {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                            {task.due_date && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Due: {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "calendar" && (
              <div className="space-y-6">
                {/* Upcoming Meetings */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Upcoming Meetings ({upcomingMeetings.length})
                    </h3>
                    <Button size="sm" onClick={() => setIsAddMeetingOpen(true)} className="gap-1">
                      <Plus className="h-4 w-4" />Schedule
                    </Button>
                  </div>

                  {upcomingMeetings.length === 0 ? (
                    <Card className="p-8 text-center">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No upcoming meetings</p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {upcomingMeetings.map(meeting => (
                        <Card key={meeting.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                              <Video className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{meeting.title}</p>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(meeting.scheduled_at).toLocaleString('en-GB', { 
                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                                  })}
                                </span>
                                <span>{meeting.duration_minutes} mins</span>
                                {meeting.meeting_link && (
                                  <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                    Join <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline">{meeting.meeting_type}</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reminders */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Reminders ({reminders.length})
                    </h3>
                    <Button size="sm" variant="outline" onClick={() => setIsAddReminderOpen(true)} className="gap-1">
                      <Plus className="h-4 w-4" />Add
                    </Button>
                  </div>

                  {reminders.length === 0 ? (
                    <Card className="p-6 text-center">
                      <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">No reminders set</p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {reminders.map(reminder => {
                        const ReminderIcon = getReminderTypeIcon(reminder.reminder_type);
                        const isOverdue = new Date(reminder.remind_at) < new Date();
                        return (
                          <Card key={reminder.id} className={`p-4 ${isOverdue ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full ${isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted'}`}>
                                <ReminderIcon className={`h-4 w-4 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{reminder.title}</p>
                                  <Badge variant="outline" className="text-xs">{reminder.reminder_type}</Badge>
                                  {reminder.is_recurring && <Badge variant="secondary" className="text-xs">Recurring</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(reminder.remind_at).toLocaleString('en-GB', { 
                                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                                  })}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => completeReminderMutation.mutate(reminder.id)} className="gap-1">
                                <CheckCircle className="h-4 w-4" />Done
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "intelligence" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">Threat Intelligence</h3>
                    {lastRefresh && <p className="text-xs text-muted-foreground">Last updated: {lastRefresh.toLocaleTimeString()}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={fetchThreatIntelligence} disabled={isLoadingThreat} className="gap-1">
                    {isLoadingThreat ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh
                  </Button>
                </div>

                {isLoadingThreat ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : threatIntel ? (
                  <div className="space-y-4">
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className={getRiskScoreColor(threatIntel.riskScore)} />Overall Risk Score</CardTitle></CardHeader>
                      <CardContent><div className="flex items-center gap-4"><span className={`text-4xl font-bold ${getRiskScoreColor(threatIntel.riskScore)}`}>{threatIntel.riskScore}</span><Progress value={threatIntel.riskScore} className="flex-1" /></div></CardContent>
                    </Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4 text-red-500" />Data Breaches ({threatIntel.breaches.length})</CardTitle></CardHeader>
                      <CardContent>{threatIntel.breaches.length === 0 ? <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="h-4 w-4" />No known breaches found</p> : <div className="space-y-2">{threatIntel.breaches.map((b, i) => <div key={i} className="p-2 bg-muted rounded flex items-center justify-between"><div><p className="font-medium text-sm">{b.name}</p><p className="text-xs text-muted-foreground">{b.date} - {b.records} records</p></div><Badge className={getSeverityColor(b.severity)}>{b.severity}</Badge></div>)}</div>}</CardContent>
                    </Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Key className="h-4 w-4 text-orange-500" />Leaked Credentials</CardTitle></CardHeader>
                      <CardContent>{threatIntel.leakedCredentials.count === 0 ? <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="h-4 w-4" />No leaked credentials found</p> : <div><p className="text-2xl font-bold text-orange-500">{threatIntel.leakedCredentials.count}</p><p className="text-xs text-muted-foreground">Last seen: {threatIntel.leakedCredentials.lastSeen}</p></div>}</CardContent>
                    </Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bug className="h-4 w-4 text-purple-500" />Vulnerabilities ({threatIntel.vulnerabilities.length})</CardTitle></CardHeader>
                      <CardContent>{threatIntel.vulnerabilities.length === 0 ? <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="h-4 w-4" />No known vulnerabilities</p> : <div className="space-y-2">{threatIntel.vulnerabilities.map((v, i) => <div key={i} className="p-2 bg-muted rounded"><div className="flex items-center justify-between"><code className="text-xs font-mono">{v.cve}</code><Badge className={getSeverityColor(v.severity)}>{v.severity}</Badge></div><p className="text-xs text-muted-foreground mt-1">{v.product}</p></div>)}</div>}</CardContent>
                    </Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" />Exposed Services ({threatIntel.exposedServices.length})</CardTitle></CardHeader>
                      <CardContent><div className="space-y-1">{threatIntel.exposedServices.map((svc, i) => <div key={i} className="flex items-center justify-between text-sm"><span>Port {svc.port}: {svc.service}</span><Badge variant={svc.risk === 'Low' ? 'secondary' : 'destructive'}>{svc.risk}</Badge></div>)}</div></CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No threat intelligence available</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={fetchThreatIntelligence}>Scan Now</Button>
                  </Card>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Sidebar */}
      <div className="w-72 border-l bg-card flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Contacts */}
            <Collapsible open={contactsExpanded} onOpenChange={setContactsExpanded}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-1 font-semibold text-sm hover:text-primary">
                  {contactsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Contacts ({contacts.length})
                </CollapsibleTrigger>
                <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
                  <DialogTrigger asChild><Button variant="ghost" size="sm" className="text-primary gap-1 h-7"><Plus className="h-4 w-4" />Add</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Contact to {organization.name}</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); addContactMutation.mutate({ name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), role: fd.get('role'), isChampion: fd.get('isChampion') === 'on' }); }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Name *</Label><Input name="name" required /></div>
                        <div className="space-y-2"><Label>Role</Label><Select name="role" defaultValue="other"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTACT_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" /></div>
                        <div className="space-y-2"><Label>Phone</Label><Input name="phone" /></div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                        <input type="checkbox" name="isChampion" id="isChampion" className="h-5 w-5 rounded accent-amber-500" />
                        <Label htmlFor="isChampion" className="flex items-center gap-2 cursor-pointer"><Star className="h-5 w-5 text-amber-500 fill-amber-500" /><span className="font-medium">Set as Champion</span></Label>
                      </div>
                      <Button type="submit" className="w-full" disabled={addContactMutation.isPending}>{addContactMutation.isPending ? "Adding..." : "Add Contact"}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <CollapsibleContent className="mt-3 space-y-2">
                {contacts.length === 0 ? (
                  <div className="text-center py-6"><Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">See the people associated with this record.</p></div>
                ) : contacts.map(c => (
                  <Card key={c.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{c.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1"><p className="font-medium text-sm truncate">{c.name}</p>{c.notes?.includes('[CHAMPION]') && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}</div>
                        <p className="text-xs text-muted-foreground">{c.role || 'No role'}</p>
                        {c.email && <a href={`mailto:${c.email}`} className="text-xs text-primary hover:underline">{c.email}</a>}
                      </div>
                    </div>
                  </Card>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Deals */}
            <Collapsible open={dealsExpanded} onOpenChange={setDealsExpanded}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-1 font-semibold text-sm hover:text-primary">
                  {dealsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Deals ({deals.length})
                </CollapsibleTrigger>
                <Dialog open={isAddDealOpen} onOpenChange={setIsAddDealOpen}>
                  <DialogTrigger asChild><Button variant="ghost" size="sm" className="text-primary gap-1 h-7"><Plus className="h-4 w-4" />Add</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create Deal for {organization.name}</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); addDealMutation.mutate({ title: fd.get('title'), value: fd.get('value'), description: fd.get('description'), expectedCloseDate: fd.get('expectedCloseDate') }); }} className="space-y-4">
                      <div className="space-y-2"><Label>Deal Title *</Label><Input name="title" required placeholder={`${organization.name} - Solution`} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Value</Label><Input name="value" type="number" placeholder="0" /></div>
                        <div className="space-y-2"><Label>Expected Close Date</Label><Input name="expectedCloseDate" type="date" /></div>
                      </div>
                      <div className="space-y-2"><Label>Description</Label><Textarea name="description" rows={3} /></div>
                      <Button type="submit" className="w-full" disabled={addDealMutation.isPending}>{addDealMutation.isPending ? "Creating..." : "Create Deal"}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <CollapsibleContent className="mt-3 space-y-2">
                {deals.length === 0 ? (
                  <div className="text-center py-6"><Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No deals yet</p></div>
                ) : deals.map((d: any) => (
                  <Card key={d.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <Briefcase className="h-4 w-4 text-green-500 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-primary truncate">{d.title}</p>
                        {d.value > 0 && <p className="text-sm">Amount: <span className="font-medium">₹{d.value.toLocaleString()}</span></p>}
                        {d.expected_close_date && <p className="text-xs text-muted-foreground">Close: {new Date(d.expected_close_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                        <p className={`text-xs font-medium ${getStageColor(d.stage)}`}>Stage: {d.stage.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Tasks Quick View */}
            <Collapsible open={tasksExpanded} onOpenChange={setTasksExpanded}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-1 font-semibold text-sm hover:text-primary">
                  {tasksExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Tasks ({pendingTasks.length})
                </CollapsibleTrigger>
                <Button variant="ghost" size="sm" className="text-primary gap-1 h-7" onClick={() => setIsAddTaskOpen(true)}>
                  <Plus className="h-4 w-4" />Add
                </Button>
              </div>
              <CollapsibleContent className="mt-3 space-y-2">
                {pendingTasks.length === 0 ? (
                  <div className="text-center py-4"><ListTodo className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-xs text-muted-foreground">No pending tasks</p></div>
                ) : pendingTasks.slice(0, 3).map(task => (
                  <Card key={task.id} className="p-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={task.status === 'completed'}
                        onCheckedChange={(checked) => toggleTaskMutation.mutate({ taskId: task.id, completed: !!checked })}
                        className="h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{task.title}</p>
                        {task.due_date && <p className="text-xs text-muted-foreground">{new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>}
                      </div>
                    </div>
                  </Card>
                ))}
                {pendingTasks.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setActiveTab('tasks')}>
                    View all {pendingTasks.length} tasks
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Reminders Quick View */}
            <Collapsible open={remindersExpanded} onOpenChange={setRemindersExpanded}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-1 font-semibold text-sm hover:text-primary">
                  {remindersExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Reminders ({reminders.length})
                </CollapsibleTrigger>
                <Button variant="ghost" size="sm" className="text-primary gap-1 h-7" onClick={() => setIsAddReminderOpen(true)}>
                  <Plus className="h-4 w-4" />Add
                </Button>
              </div>
              <CollapsibleContent className="mt-3 space-y-2">
                {reminders.length === 0 ? (
                  <div className="text-center py-4"><Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-xs text-muted-foreground">No reminders</p></div>
                ) : reminders.slice(0, 3).map(reminder => {
                  const ReminderIcon = getReminderTypeIcon(reminder.reminder_type);
                  return (
                    <Card key={reminder.id} className="p-2">
                      <div className="flex items-center gap-2">
                        <ReminderIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{reminder.title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(reminder.remind_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {reminders.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setActiveTab('calendar')}>
                    View all {reminders.length} reminders
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>
      </div>
      </div>
    </div>
  );
}
