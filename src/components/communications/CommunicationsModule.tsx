import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  MessageSquare, Newspaper, Users, Globe,
  Plus, Search, Clock, CheckCircle, AlertCircle,
  FileText, Calendar, Bell, Mail, Phone, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CommunicationsModuleProps {
  initialTab?: string;
}

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-500/20 text-green-600 border-green-500/20",
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/20 text-blue-600 border-blue-500/20",
  review: "bg-orange-500/20 text-orange-600 border-orange-500/20",
  active: "bg-green-500/20 text-green-600 border-green-500/20",
};

export function CommunicationsModule({ initialTab = "press" }: CommunicationsModuleProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewReleaseDialog, setShowNewReleaseDialog] = useState(false);
  const [showNewAnnouncementDialog, setShowNewAnnouncementDialog] = useState(false);
  const [newRelease, setNewRelease] = useState({ title: "", distribution_outlet: "", content: "" });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", type: "internal", audience: "All Employees", content: "" });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch releases
  const { data: releases = [], isLoading: releasesLoading } = useQuery({
    queryKey: ["comms-releases", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase.from("communications_releases").select("*").eq("tenant_id", currentTenant.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  // Fetch media contacts
  const { data: mediaContacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["media-contacts", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase.from("media_contacts").select("*").eq("tenant_id", currentTenant.id).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  // Fetch announcements
  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ["comms-announcements", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase.from("communications_announcements").select("*").eq("tenant_id", currentTenant.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  // Create release
  const createRelease = useMutation({
    mutationFn: async (r: typeof newRelease) => {
      const { error } = await supabase.from("communications_releases").insert({
        tenant_id: currentTenant!.id, created_by: user!.id,
        title: r.title, status: "draft", distribution_outlet: r.distribution_outlet || null, content: r.content || null, author: "Communications Team",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comms-releases"] });
      toast.success("Press release created");
      setShowNewReleaseDialog(false);
      setNewRelease({ title: "", distribution_outlet: "", content: "" });
    },
    onError: () => toast.error("Failed to create release"),
  });

  // Create announcement
  const createAnnouncement = useMutation({
    mutationFn: async (a: typeof newAnnouncement) => {
      const { error } = await supabase.from("communications_announcements").insert({
        tenant_id: currentTenant!.id, created_by: user!.id,
        title: a.title, type: a.type, status: "draft", audience: a.audience, content: a.content || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comms-announcements"] });
      toast.success("Announcement created");
      setShowNewAnnouncementDialog(false);
      setNewAnnouncement({ title: "", type: "internal", audience: "All Employees", content: "" });
    },
    onError: () => toast.error("Failed to create announcement"),
  });

  const filteredReleases = releases.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredContacts = mediaContacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.outlet || "").toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Communications</h1>
              <p className="text-sm text-muted-foreground">PR, media relations & internal comms</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Newspaper className="w-4 h-4 text-blue-500" /></div>
            <div><p className="text-xs text-muted-foreground">Press Releases</p><p className="text-xl font-bold">{releases.length}</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><Users className="w-4 h-4 text-green-500" /></div>
            <div><p className="text-xs text-muted-foreground">Media Contacts</p><p className="text-xl font-bold">{mediaContacts.length}</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><Bell className="w-4 h-4 text-purple-500" /></div>
            <div><p className="text-xs text-muted-foreground">Announcements</p><p className="text-xl font-bold">{announcements.length}</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Globe className="w-4 h-4 text-amber-500" /></div>
            <div><p className="text-xs text-muted-foreground">Published</p><p className="text-xl font-bold">{releases.filter(r => r.status === "published").length}</p></div>
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 md:px-6 border-b">
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger value="press" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Press Releases</TabsTrigger>
            <TabsTrigger value="media" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Media Contacts</TabsTrigger>
            <TabsTrigger value="internal" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Internal Comms</TabsTrigger>
            <TabsTrigger value="crisis" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Crisis Mgmt</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* Press Releases */}
          <TabsContent value="press" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search releases..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Button className="gap-2" onClick={() => setShowNewReleaseDialog(true)}><Plus className="w-4 h-4" />New Release</Button>
            </div>
            {releasesLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filteredReleases.length === 0 ? (
              <Card className="p-12 text-center">
                <Newspaper className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No press releases yet</h3>
                <p className="text-muted-foreground mb-4">Create your first press release</p>
                <Button onClick={() => setShowNewReleaseDialog(true)}><Plus className="w-4 h-4 mr-2" />New Release</Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredReleases.map((pr) => (
                  <Card key={pr.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-blue-500/10"><FileText className="w-4 h-4 text-blue-500" /></div>
                        <div>
                          <h3 className="font-medium">{pr.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            {pr.distribution_outlet && <span>{pr.distribution_outlet}</span>}
                            <span>{format(new Date(pr.created_at), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[pr.status] || "")}>{pr.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Media Contacts */}
          <TabsContent value="media" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search contacts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </div>
            {contactsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filteredContacts.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No media contacts yet</h3>
                <p className="text-muted-foreground">Add media contacts to manage your press relationships</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContacts.map((contact) => (
                  <Card key={contact.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar><AvatarFallback className="bg-primary/10 text-primary">{contact.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                        <div className="flex-1">
                          <h3 className="font-medium">{contact.name}</h3>
                          <p className="text-sm text-muted-foreground">{contact.role} at {contact.outlet}</p>
                          {contact.beat && <Badge variant="secondary" className="mt-1 text-xs">{contact.beat}</Badge>}
                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {contact.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</div>}
                            {contact.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</div>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Internal Comms */}
          <TabsContent value="internal" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-medium">Announcements</h3>
              <Button className="gap-2" onClick={() => setShowNewAnnouncementDialog(true)}><Plus className="w-4 h-4" />New Announcement</Button>
            </div>
            {announcementsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : announcements.length === 0 ? (
              <Card className="p-12 text-center">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No announcements yet</h3>
                <p className="text-muted-foreground mb-4">Create internal announcements for your team</p>
                <Button onClick={() => setShowNewAnnouncementDialog(true)}><Plus className="w-4 h-4 mr-2" />New Announcement</Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <Card key={ann.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-purple-500/10"><Bell className="w-4 h-4 text-purple-500" /></div>
                        <div>
                          <h3 className="font-medium">{ann.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span>{ann.audience || "All"}</span>
                            <span>{format(new Date(ann.created_at), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{ann.type}</Badge>
                        <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[ann.status] || "")}>{ann.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Crisis Management */}
          <TabsContent value="crisis" className="p-4 md:p-6 mt-0">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" />Crisis Response Plan</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50"><p className="font-medium text-sm">Tier 1 — Minor Issue</p><p className="text-xs text-muted-foreground">Social media response within 1 hour</p></div>
                  <div className="p-3 rounded-lg bg-muted/50"><p className="font-medium text-sm">Tier 2 — Moderate Crisis</p><p className="text-xs text-muted-foreground">Press statement within 4 hours</p></div>
                  <div className="p-3 rounded-lg bg-muted/50"><p className="font-medium text-sm">Tier 3 — Major Crisis</p><p className="text-xs text-muted-foreground">Full team activation, CEO briefing</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Current Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                    <h3 className="text-lg font-semibold text-green-600">All Clear</h3>
                    <p className="text-sm text-muted-foreground mt-1">No active crises detected</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* New Release Dialog */}
      <Dialog open={showNewReleaseDialog} onOpenChange={setShowNewReleaseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Press Release</DialogTitle><DialogDescription>Create a new press release</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Title</Label><Input placeholder="Press release title" value={newRelease.title} onChange={(e) => setNewRelease(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Distribution Channel</Label>
              <Select value={newRelease.distribution_outlet} onValueChange={(v) => setNewRelease(p => ({ ...p, distribution_outlet: v }))}>
                <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PR Newswire">PR Newswire</SelectItem>
                  <SelectItem value="Business Wire">Business Wire</SelectItem>
                  <SelectItem value="Direct">Direct Distribution</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Content</Label><Textarea placeholder="Release content..." rows={4} value={newRelease.content} onChange={(e) => setNewRelease(p => ({ ...p, content: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewReleaseDialog(false)}>Cancel</Button>
            <Button onClick={() => createRelease.mutate(newRelease)} disabled={!newRelease.title || createRelease.isPending}>
              {createRelease.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Create Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Announcement Dialog */}
      <Dialog open={showNewAnnouncementDialog} onOpenChange={setShowNewAnnouncementDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Announcement</DialogTitle><DialogDescription>Create an internal announcement</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Title</Label><Input placeholder="Announcement title" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newAnnouncement.type} onValueChange={(v) => setNewAnnouncement(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={newAnnouncement.audience} onValueChange={(v) => setNewAnnouncement(p => ({ ...p, audience: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Employees">All Employees</SelectItem>
                  <SelectItem value="Full-time Employees">Full-time</SelectItem>
                  <SelectItem value="Managers Only">Managers</SelectItem>
                  <SelectItem value="Specific Department">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Content</Label><Textarea placeholder="Announcement content..." rows={3} value={newAnnouncement.content} onChange={(e) => setNewAnnouncement(p => ({ ...p, content: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAnnouncementDialog(false)}>Cancel</Button>
            <Button onClick={() => createAnnouncement.mutate(newAnnouncement)} disabled={!newAnnouncement.title || createAnnouncement.isPending}>
              {createAnnouncement.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
