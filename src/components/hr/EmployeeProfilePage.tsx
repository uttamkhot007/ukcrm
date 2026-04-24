import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  User, Mail, Phone, Building, Briefcase, Calendar, 
  Loader2, Star, MapPin, Linkedin, Clock, BarChart3,
  Pencil, Brain, ArrowLeft, Award, GraduationCap, Trophy,
  Target, Users, Github, Twitter, Heart, Shield, FileText,
  TrendingUp, CheckCircle, AlertCircle, ShieldCheck, UserCog,
  Landmark, Wallet, Building2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, differenceInYears, differenceInMonths, differenceInDays } from "date-fns";
import { EmployeeVerificationsTab } from "./EmployeeVerificationsTab";

interface EmployeeProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  job_title: string | null;
  birth_date: string | null;
  hire_date: string | null;
  employee_code: string | null;
  location: string | null;
  anniversary_date: string | null;
  employment_status: string | null;
  bio: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  github_url?: string | null;
  phone?: string | null;
  responsibilities?: string[] | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  manager_id?: string | null;
  // Bank details
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc_code?: string | null;
  bank_branch?: string | null;
  // ESI details
  esi_number?: string | null;
  esi_dispensary?: string | null;
  // PF details
  pf_number?: string | null;
  uan_number?: string | null;
  // Gratuity details
  gratuity_nomination_name?: string | null;
  gratuity_nomination_relation?: string | null;
  gratuity_nomination_percentage?: number | null;
}

interface EmployeeProfilePageProps {
  employee: EmployeeProfile;
  onBack: () => void;
  onEdit?: (employee: EmployeeProfile) => void;
}

const EMPLOYMENT_STATUSES = [
  { value: "active", label: "Active", description: "Regular active employee" },
  { value: "new_hire", label: "New Hire", description: "New employee - triggers onboarding workflow" },
  { value: "probation", label: "Probation", description: "Under probation period" },
  { value: "pip", label: "PIP", description: "Performance Improvement Plan" },
  { value: "notice_period", label: "Notice Period", description: "Serving notice period" },
  { value: "inactive", label: "Inactive", description: "Currently inactive" },
  { value: "terminated", label: "Terminated", description: "Employment terminated" },
];

export function EmployeeProfilePage({ 
  employee, 
  onBack,
  onEdit 
}: EmployeeProfilePageProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(employee.employment_status || "active");
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  // Fetch manager info
  const { data: manager } = useQuery({
    queryKey: ["employee-manager", employee?.manager_id],
    queryFn: async () => {
      if (!employee?.manager_id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, job_title, avatar_url")
        .eq("user_id", employee.manager_id)
        .single();
      return data;
    },
    enabled: !!employee?.manager_id,
  });

  // Fetch attendance data
  const { data: attendance = [] } = useQuery({
    queryKey: ["employee-attendance", employee?.user_id],
    queryFn: async () => {
      if (!employee?.user_id) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", employee.user_id)
        .gte("check_in", thirtyDaysAgo.toISOString())
        .order("check_in", { ascending: false });
      return data || [];
    },
    enabled: !!employee?.user_id,
  });

  // Fetch awards
  const { data: awards = [] } = useQuery({
    queryKey: ["employee-awards", employee?.user_id],
    queryFn: async () => {
      if (!employee?.user_id) return [];
      const { data } = await supabase
        .from("employee_awards")
        .select("*")
        .eq("user_id", employee.user_id)
        .order("awarded_date", { ascending: false });
      return data || [];
    },
    enabled: !!employee?.user_id,
  });

  // Fetch certifications
  const { data: certifications = [] } = useQuery({
    queryKey: ["employee-certifications", employee?.user_id],
    queryFn: async () => {
      if (!employee?.user_id) return [];
      const { data } = await supabase
        .from("employee_certifications")
        .select("*")
        .eq("user_id", employee.user_id)
        .order("issue_date", { ascending: false });
      return data || [];
    },
    enabled: !!employee?.user_id,
  });

  // Fetch achievements
  const { data: achievements = [] } = useQuery({
    queryKey: ["employee-achievements", employee?.user_id],
    queryFn: async () => {
      if (!employee?.user_id) return [];
      const { data } = await supabase
        .from("employee_achievements")
        .select("*")
        .eq("user_id", employee.user_id)
        .order("achieved_date", { ascending: false });
      return data || [];
    },
    enabled: !!employee?.user_id,
  });

  // Fetch mood logs for analytics
  const { data: moodLogs = [] } = useQuery({
    queryKey: ["employee-mood-logs", employee?.user_id],
    queryFn: async () => {
      if (!employee?.user_id) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data } = await supabase
        .from("employee_mood_logs")
        .select("*")
        .eq("user_id", employee.user_id)
        .gte("logged_at", thirtyDaysAgo.toISOString())
        .order("logged_at", { ascending: false });
      return data || [];
    },
    enabled: !!employee?.user_id,
  });

  // Calculate service period
  const getServicePeriod = () => {
    if (!employee.hire_date) return "N/A";
    const hireDate = new Date(employee.hire_date);
    const now = new Date();
    const years = differenceInYears(now, hireDate);
    const months = differenceInMonths(now, hireDate) % 12;
    const days = differenceInDays(now, new Date(now.getFullYear(), now.getMonth() - months, hireDate.getDate()));
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;
    } else if (months > 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`;
  };

  // Calculate attendance stats
  const attendanceRate = attendance.length > 0 
    ? Math.round((attendance.filter(a => a.check_out).length / attendance.length) * 100)
    : 0;
  const totalWorkHours = attendance.reduce((sum, a) => sum + (Number(a.work_hours) || 0), 0);
  const avgWorkHours = attendance.length > 0 ? (totalWorkHours / attendance.length).toFixed(1) : "0";

  // Mood analytics
  const moodCounts = moodLogs.reduce((acc: Record<string, number>, log) => {
    acc[log.mood] = (acc[log.mood] || 0) + 1;
    return acc;
  }, {});
  const primaryMood = (Object.entries(moodCounts) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "new_hire": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "probation": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "pip": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "notice_period": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // Mutation to update employee status
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ employment_status: newStatus as any })
        .eq("user_id", employee.user_id);
      
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["employee-directory"] });
      toast.success(
        newStatus === "new_hire" 
          ? "Status updated to New Hire - Onboarding workflow will be initiated" 
          : "Employment status updated successfully"
      );
      setShowStatusDialog(false);
    },
    onError: (error) => {
      console.error("Failed to update status:", error);
      toast.error("Failed to update employment status");
    },
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Employee Profile</h1>
        </div>
        
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 border-2 border-primary/20">
            <AvatarImage src={employee.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
              {employee.full_name?.substring(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold">{employee.full_name}</h2>
              {employee.employee_code && (
                <Badge variant="outline" className="font-mono">
                  {employee.employee_code}
                </Badge>
              )}
              <Badge className={getStatusColor(employee.employment_status || "active")}>
                {employee.employment_status?.replace(/_/g, " ") || "Active"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {employee.job_title || "Employee"} 
              {employee.department && ` • ${employee.department}`}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {getServicePeriod()} of service
              </span>
              {employee.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {employee.location}
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              {onEdit && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => onEdit(employee)}
                >
                  <Pencil className="h-3 w-3" />
                  Edit Profile
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={() => {
                  setSelectedStatus(employee.employment_status || "active");
                  setShowStatusDialog(true);
                }}
              >
                <UserCog className="h-3 w-3" />
                Change Status
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Employment Status</DialogTitle>
            <DialogDescription>
              Update the employment status for {employee.full_name}. Setting status to "New Hire" will automatically trigger an onboarding workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Current Status</Label>
              <Badge className={getStatusColor(employee.employment_status || "active")}>
                {employee.employment_status?.replace(/_/g, " ") || "Active"}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex flex-col">
                        <span>{status.label}</span>
                        <span className="text-xs text-muted-foreground">{status.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedStatus === "new_hire" && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
                <p className="font-medium text-blue-600">Onboarding Workflow</p>
                <p className="text-muted-foreground mt-1">
                  Setting this status will automatically create an HR onboarding workflow for this employee.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => updateStatusMutation.mutate(selectedStatus)}
              disabled={updateStatusMutation.isPending || selectedStatus === employee.employment_status}
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b px-4 md:px-6 overflow-x-auto flex-wrap h-auto gap-1 py-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="career">Career</TabsTrigger>
          <TabsTrigger value="statutory" className="gap-1">
            <Landmark className="h-3 w-3" />
            Bank & Statutory
          </TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="verifications" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            Verifications
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1">
            <Brain className="h-3 w-3" />
            AI Analytics
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="p-4 md:p-6 space-y-6 mt-0">
            {/* Contact Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {employee.email ? (
                      <a href={`mailto:${employee.email}`} className="text-primary hover:underline">
                        {employee.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className={!(employee as any).phone ? "text-muted-foreground" : ""}>
                      {(employee as any).phone || "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className={!employee.location ? "text-muted-foreground" : ""}>
                      {employee.location || "Not set"}
                    </span>
                  </div>
                  
                  {/* Social Links */}
                  {((employee as any).linkedin_url || (employee as any).twitter_url || (employee as any).github_url) && (
                    <>
                      <Separator className="my-2" />
                      <div className="flex items-center gap-2">
                        {(employee as any).linkedin_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={(employee as any).linkedin_url} target="_blank" rel="noopener noreferrer">
                              <Linkedin className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {(employee as any).twitter_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={(employee as any).twitter_url} target="_blank" rel="noopener noreferrer">
                              <Twitter className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {(employee as any).github_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={(employee as any).github_url} target="_blank" rel="noopener noreferrer">
                              <Github className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {employee.emergency_contact_name ? (
                    <>
                      <div className="flex items-center gap-3 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{employee.emergency_contact_name}</span>
                        {employee.emergency_contact_relationship && (
                          <Badge variant="outline" className="text-xs">
                            {employee.emergency_contact_relationship}
                          </Badge>
                        )}
                      </div>
                      {employee.emergency_contact_phone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{employee.emergency_contact_phone}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No emergency contact set</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Service Period</p>
                    <p className="text-sm font-bold">{getServicePeriod()}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Attendance (30d)</p>
                    <p className="text-sm font-bold">{attendanceRate}%</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Award className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Awards</p>
                    <p className="text-sm font-bold">{awards.length}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <GraduationCap className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Certifications</p>
                    <p className="text-sm font-bold">{certifications.length}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Manager & Dates */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Reports To</CardTitle>
                </CardHeader>
                <CardContent>
                  {manager ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={manager.avatar_url || undefined} />
                        <AvatarFallback>
                          {manager.full_name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{manager.full_name}</p>
                        <p className="text-sm text-muted-foreground">{manager.job_title}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No manager assigned</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Important Dates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {employee.hire_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Hire Date</span>
                      <span>{format(new Date(employee.hire_date), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  {employee.birth_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Birthday</span>
                      <span>{format(new Date(employee.birth_date), "MMM d")}</span>
                    </div>
                  )}
                  {employee.anniversary_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Anniversary</span>
                      <span>{format(new Date(employee.anniversary_date), "MMM d")}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bio */}
            {employee.bio && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{employee.bio}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="career" className="p-4 md:p-6 space-y-6 mt-0">
            {/* Role & Responsibilities */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Role & Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">{employee.job_title || "Employee"}</h4>
                  <p className="text-sm text-muted-foreground">{employee.department}</p>
                </div>
                {(employee as any).responsibilities?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Key Responsibilities:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {(employee as any).responsibilities.map((resp: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          {resp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Certifications */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Certifications ({certifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {certifications.length > 0 ? (
                  <div className="space-y-3">
                    {certifications.map((cert: any) => (
                      <div key={cert.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <GraduationCap className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{cert.name}</p>
                          <p className="text-sm text-muted-foreground">{cert.issuing_organization}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {cert.issue_date && (
                              <span>Issued: {format(new Date(cert.issue_date), "MMM yyyy")}</span>
                            )}
                            {cert.expiry_date && (
                              <span>• Expires: {format(new Date(cert.expiry_date), "MMM yyyy")}</span>
                            )}
                          </div>
                        </div>
                        {cert.credential_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={cert.credential_url} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No certifications added yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank & Statutory Tab */}
          <TabsContent value="statutory" className="p-4 md:p-6 space-y-6 mt-0">
            {/* Bank Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Landmark className="h-4 w-4" />
                  Bank Account Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Bank Name</p>
                    <p className="font-medium">{(employee as any).bank_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Branch</p>
                    <p className="font-medium">{(employee as any).bank_branch || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="font-medium">
                      {(employee as any).bank_account_number 
                        ? `****${(employee as any).bank_account_number.slice(-4)}` 
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IFSC Code</p>
                    <p className="font-medium">{(employee as any).bank_ifsc_code || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ESI Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  ESI Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ESI Number</p>
                    <p className="font-medium">{(employee as any).esi_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ESI Dispensary</p>
                    <p className="font-medium">{(employee as any).esi_dispensary || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PF Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Provident Fund Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">PF Number</p>
                    <p className="font-medium">{(employee as any).pf_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">UAN Number</p>
                    <p className="font-medium">{(employee as any).uan_number || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gratuity Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Gratuity Nomination
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nominee Name</p>
                    <p className="font-medium">{(employee as any).gratuity_nomination_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Relationship</p>
                    <p className="font-medium">{(employee as any).gratuity_nomination_relation || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Percentage</p>
                    <p className="font-medium">{(employee as any).gratuity_nomination_percentage || 100}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="p-4 md:p-6 space-y-6 mt-0">
            {/* Attendance Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-500">{attendanceRate}%</p>
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{attendance.length}</p>
                  <p className="text-sm text-muted-foreground">Days Logged (30d)</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{avgWorkHours}h</p>
                  <p className="text-sm text-muted-foreground">Avg. Work Hours</p>
                </div>
              </Card>
            </div>

            {/* Recent Attendance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Recent Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                {attendance.length > 0 ? (
                  <div className="space-y-2">
                    {attendance.slice(0, 10).map((record: any) => (
                      <div key={record.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-sm font-medium">
                            {format(new Date(record.check_in), "EEE, MMM d")}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>In: {format(new Date(record.check_in), "h:mm a")}</span>
                          {record.check_out && (
                            <span>Out: {format(new Date(record.check_out), "h:mm a")}</span>
                          )}
                          {record.work_hours && (
                            <Badge variant="outline">{Number(record.work_hours).toFixed(1)}h</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No attendance records found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="p-4 md:p-6 space-y-6 mt-0">
            {/* Awards */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Awards & Recognition ({awards.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {awards.length > 0 ? (
                  <div className="space-y-3">
                    {awards.map((award: any) => (
                      <div key={award.id} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <Award className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{award.title}</p>
                          {award.description && (
                            <p className="text-sm text-muted-foreground">{award.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {award.awarded_date && (
                              <span>{format(new Date(award.awarded_date), "MMM yyyy")}</span>
                            )}
                            {award.awarded_by && (
                              <span>• By {award.awarded_by}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No awards yet</p>
                )}
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-purple-500" />
                  Achievements ({achievements.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {achievements.length > 0 ? (
                  <div className="space-y-3">
                    {achievements.map((achievement: any) => (
                      <div key={achievement.id} className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <Trophy className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{achievement.title}</p>
                          {achievement.description && (
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {achievement.metric_value && (
                              <Badge variant="outline" className="text-xs">
                                {achievement.metric_value} {achievement.metric_unit}
                              </Badge>
                            )}
                            {achievement.achieved_date && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(achievement.achieved_date), "MMM yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No achievements recorded</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="p-4 md:p-6 space-y-6 mt-0">
            {/* AI Analytics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  AI-Powered Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mood Analytics */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Mood Trend (30 days)</span>
                    <Badge variant="outline">{primaryMood}</Badge>
                  </div>
                  <div className="grid grid-cols-5 gap-2 mt-3">
                    {["😊", "😐", "😔", "😤", "🤩"].map((mood, i) => (
                      <div key={i} className="text-center">
                        <span className="text-2xl">{mood}</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          {moodCounts[mood.toLowerCase()] || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance Indicators */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Attendance Consistency</span>
                    <span className="text-sm font-medium">{attendanceRate}%</span>
                  </div>
                  <Progress value={attendanceRate} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Engagement Score</span>
                    <span className="text-sm font-medium">
                      {Math.round((awards.length * 20 + certifications.length * 15 + achievements.length * 10) / 3)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, (awards.length * 20 + certifications.length * 15 + achievements.length * 10) / 3)} 
                    className="h-2" 
                  />
                </div>

                {/* Summary */}
                <div className="p-4 rounded-lg border bg-primary/5">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Summary
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {employee.full_name} has been with the organization for {getServicePeriod()}.
                    {attendanceRate >= 90 
                      ? " Shows excellent attendance consistency." 
                      : attendanceRate >= 70 
                      ? " Maintains good attendance." 
                      : " Attendance could be improved."}
                    {awards.length > 0 && ` Has received ${awards.length} award${awards.length > 1 ? 's' : ''}.`}
                    {certifications.length > 0 && ` Holds ${certifications.length} certification${certifications.length > 1 ? 's' : ''}.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verifications Tab */}
          <TabsContent value="verifications" className="p-4 md:p-6 mt-0">
            <EmployeeVerificationsTab employee={employee} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
