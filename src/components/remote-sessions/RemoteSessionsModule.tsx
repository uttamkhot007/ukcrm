import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Video, 
  Plus, 
  Play, 
  Calendar, 
  Clock, 
  Users, 
  MonitorPlay,
  ExternalLink,
  PlayCircle,
  StopCircle,
  Film,
  Link2,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";

interface RemoteSessionsModuleProps {
  context?: 'customer' | 'technical' | 'support';
  organizationId?: string;
  ticketId?: string;
}

export function RemoteSessionsModule({ context = 'technical', organizationId, ticketId }: RemoteSessionsModuleProps) {
  const { user, profile, isAdmin, isManager, isEmployee } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showNewSession, setShowNewSession] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isStaff = isAdmin || isManager || isEmployee;

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    session_type: 'support',
    meeting_platform: 'internal',
    scheduled_start: '',
    scheduled_end: '',
    meeting_link: ''
  });

  // Generate session code
  const generateSessionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Fetch sessions
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["remote-sessions", user?.id, organizationId, context],
    queryFn: async () => {
      let query = supabase
        .from("remote_sessions")
        .select(`
          *,
          remote_session_recordings(id, recording_name, recording_url, duration_seconds, created_at),
          remote_session_participants(id, participant_name, participant_email, role)
        `)
        .order("scheduled_start", { ascending: false });

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      if (ticketId) {
        query = query.eq("ticket_id", ticketId);
      }

      if (context === 'customer' && !isStaff) {
        query = query.eq("customer_id", user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch profiles for host names
  const hostIds = [...new Set(sessions.map(s => s.host_id))];
  const { data: hosts = [] } = useQuery({
    queryKey: ["session-hosts", hostIds],
    queryFn: async () => {
      if (hostIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", hostIds);
      if (error) throw error;
      return data || [];
    },
    enabled: hostIds.length > 0,
  });

  const getHostName = (hostId: string) => {
    const host = hosts.find(h => h.id === hostId);
    return host?.full_name || 'Unknown';
  };

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const sessionCode = generateSessionCode();
      const { error } = await supabase
        .from("remote_sessions")
        .insert({
          session_code: sessionCode,
          title: data.title,
          description: data.description,
          session_type: data.session_type,
          meeting_platform: data.meeting_platform,
          scheduled_start: data.scheduled_start || null,
          scheduled_end: data.scheduled_end || null,
          meeting_link: data.meeting_link || null,
          host_id: user?.id,
          organization_id: organizationId || null,
          ticket_id: ticketId || null,
          status: 'scheduled'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remote-sessions"] });
      toast.success("Session created successfully");
      setShowNewSession(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to create session: " + error.message);
    }
  });

  // Update session status mutation
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, status, actual_start, actual_end }: { id: string; status: string; actual_start?: string; actual_end?: string }) => {
      const updateData: any = { status };
      if (actual_start) updateData.actual_start = actual_start;
      if (actual_end) updateData.actual_end = actual_end;
      
      const { error } = await supabase
        .from("remote_sessions")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remote-sessions"] });
      toast.success("Session updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update session: " + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      session_type: 'support',
      meeting_platform: 'internal',
      scheduled_start: '',
      scheduled_end: '',
      meeting_link: ''
    });
  };

  const handleStartSession = (session: any) => {
    updateSessionMutation.mutate({
      id: session.id,
      status: 'in_progress',
      actual_start: new Date().toISOString()
    });
  };

  const handleEndSession = (session: any) => {
    updateSessionMutation.mutate({
      id: session.id,
      status: 'completed',
      actual_end: new Date().toISOString()
    });
  };

  const copySessionCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Session code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'in_progress': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'completed': return 'bg-muted text-muted-foreground border-border';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'zoom': return '🎥';
      case 'webex': return '🌐';
      case 'gotoresolve': return '🔧';
      case 'teams': return '👥';
      default: return '💻';
    }
  };

  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const activeSessions = sessions.filter(s => s.status === 'in_progress');
  const pastSessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled');
  const recordingsAvailable = sessions.filter(s => s.remote_session_recordings && s.remote_session_recordings.length > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Video className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Remote Sessions</h2>
            <p className="text-sm text-muted-foreground">
              {context === 'customer' ? 'Join support sessions' : 'Manage remote support sessions'}
            </p>
          </div>
        </div>
        {isStaff && (
          <Button onClick={() => setShowNewSession(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingSessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Now</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pastSessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recordings</CardTitle>
            <Film className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recordingsAvailable.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <Play className="h-4 w-4" />
            Active
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            <Clock className="h-4 w-4" />
            Past
          </TabsTrigger>
          <TabsTrigger value="recordings" className="gap-2">
            <Film className="h-4 w-4" />
            Recordings
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Sessions */}
        <TabsContent value="upcoming" className="space-y-4">
          {upcomingSessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No upcoming sessions</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {isStaff ? "Create a new session to get started" : "No sessions scheduled yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingSessions.map((session) => (
                <SessionCard 
                  key={session.id} 
                  session={session} 
                  getHostName={getHostName}
                  getStatusColor={getStatusColor}
                  getPlatformIcon={getPlatformIcon}
                  copySessionCode={copySessionCode}
                  copiedCode={copiedCode}
                  isStaff={isStaff}
                  onStart={handleStartSession}
                  onSelect={() => setSelectedSession(session)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Active Sessions */}
        <TabsContent value="active" className="space-y-4">
          {activeSessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MonitorPlay className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No active sessions</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  No sessions are currently in progress
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeSessions.map((session) => (
                <SessionCard 
                  key={session.id} 
                  session={session} 
                  getHostName={getHostName}
                  getStatusColor={getStatusColor}
                  getPlatformIcon={getPlatformIcon}
                  copySessionCode={copySessionCode}
                  copiedCode={copiedCode}
                  isStaff={isStaff}
                  onEnd={handleEndSession}
                  onSelect={() => setSelectedSession(session)}
                  isActive
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Past Sessions */}
        <TabsContent value="past" className="space-y-4">
          {pastSessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No past sessions</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Completed sessions will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pastSessions.map((session) => (
                <SessionCard 
                  key={session.id} 
                  session={session} 
                  getHostName={getHostName}
                  getStatusColor={getStatusColor}
                  getPlatformIcon={getPlatformIcon}
                  copySessionCode={copySessionCode}
                  copiedCode={copiedCode}
                  isStaff={isStaff}
                  onSelect={() => setSelectedSession(session)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Recordings */}
        <TabsContent value="recordings" className="space-y-4">
          {recordingsAvailable.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Film className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No recordings available</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Session recordings will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recordingsAvailable.map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{session.title}</CardTitle>
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-600">
                        {session.remote_session_recordings?.length} Recording(s)
                      </Badge>
                    </div>
                    <CardDescription>
                      {session.scheduled_start && format(new Date(session.scheduled_start), 'PPp')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {session.remote_session_recordings?.map((recording: any) => (
                      <div key={recording.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <PlayCircle className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{recording.recording_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {recording.duration_seconds && `${Math.floor(recording.duration_seconds / 60)} min`}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={recording.recording_url} target="_blank" rel="noopener noreferrer">
                            <Play className="h-4 w-4 mr-1" />
                            Watch
                          </a>
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Session Dialog */}
      <Dialog open={showNewSession} onOpenChange={setShowNewSession}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Remote Session</DialogTitle>
            <DialogDescription>
              Schedule a new remote support session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Session Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Technical Support Session"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Session agenda or notes..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Session Type</Label>
                <Select
                  value={formData.session_type}
                  onValueChange={(value) => setFormData({ ...formData, session_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={formData.meeting_platform}
                  onValueChange={(value) => setFormData({ ...formData, meeting_platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="webex">Webex</SelectItem>
                    <SelectItem value="gotoresolve">GoTo Resolve</SelectItem>
                    <SelectItem value="teams">MS Teams</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_start">Scheduled Start</Label>
              <Input
                id="scheduled_start"
                type="datetime-local"
                value={formData.scheduled_start}
                onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_end">Scheduled End</Label>
              <Input
                id="scheduled_end"
                type="datetime-local"
                value={formData.scheduled_end}
                onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
              />
            </div>
            {formData.meeting_platform !== 'internal' && (
              <div className="space-y-2">
                <Label htmlFor="meeting_link">Meeting Link</Label>
                <Input
                  id="meeting_link"
                  value={formData.meeting_link}
                  onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSession(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createSessionMutation.mutate(formData)}
              disabled={!formData.title || createSessionMutation.isPending}
            >
              {createSessionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedSession?.title}</DialogTitle>
            <DialogDescription>
              Session Code: <span className="font-mono font-bold">{selectedSession?.session_code}</span>
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline" className={getStatusColor(selectedSession.status)}>
                    {selectedSession.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Platform</p>
                  <p className="font-medium">
                    {getPlatformIcon(selectedSession.meeting_platform)} {selectedSession.meeting_platform}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Host</p>
                  <p className="font-medium">{getHostName(selectedSession.host_id)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{selectedSession.session_type}</p>
                </div>
              </div>
              {selectedSession.scheduled_start && (
                <div>
                  <p className="text-muted-foreground text-sm">Scheduled</p>
                  <p className="font-medium">
                    {format(new Date(selectedSession.scheduled_start), 'PPp')}
                    {selectedSession.scheduled_end && ` - ${format(new Date(selectedSession.scheduled_end), 'p')}`}
                  </p>
                </div>
              )}
              {selectedSession.description && (
                <div>
                  <p className="text-muted-foreground text-sm">Description</p>
                  <p>{selectedSession.description}</p>
                </div>
              )}
              {selectedSession.meeting_link && (
                <div>
                  <p className="text-muted-foreground text-sm">Meeting Link</p>
                  <Button variant="outline" size="sm" asChild className="mt-1">
                    <a href={selectedSession.meeting_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join Meeting
                    </a>
                  </Button>
                </div>
              )}
              {selectedSession.remote_session_participants?.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Participants</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSession.remote_session_participants.map((p: any) => (
                      <Badge key={p.id} variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {p.participant_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSession(null)}>
              Close
            </Button>
            {selectedSession?.meeting_link && (
              <Button asChild>
                <a href={selectedSession.meeting_link} target="_blank" rel="noopener noreferrer">
                  <Video className="h-4 w-4 mr-2" />
                  Join Session
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Session Card Component
function SessionCard({ 
  session, 
  getHostName, 
  getStatusColor, 
  getPlatformIcon,
  copySessionCode,
  copiedCode,
  isStaff,
  onStart,
  onEnd,
  onSelect,
  isActive
}: any) {
  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{getPlatformIcon(session.meeting_platform)}</span>
              <Badge variant="outline" className={getStatusColor(session.status)}>
                {session.status === 'in_progress' ? 'Live' : session.status}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {session.session_type}
              </Badge>
            </div>
            <h3 className="font-medium">{session.title}</h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {getHostName(session.host_id)}
              </span>
              {session.scheduled_start && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(session.scheduled_start), 'MMM d, p')}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                copySessionCode(session.session_code);
              }}
              className="font-mono text-xs"
            >
              {copiedCode === session.session_code ? (
                <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {session.session_code}
            </Button>
            {isStaff && session.status === 'scheduled' && onStart && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStart(session);
                }}
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}
            {isStaff && isActive && onEnd && (
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onEnd(session);
                }}
              >
                <StopCircle className="h-4 w-4 mr-1" />
                End
              </Button>
            )}
            {session.meeting_link && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(session.meeting_link, '_blank');
                }}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Join
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
