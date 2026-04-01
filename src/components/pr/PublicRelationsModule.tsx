import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Globe, Users, TrendingUp,
  Plus, Search, Calendar, Clock,
  Award, Heart, ThumbsUp, ThumbsDown, Minus, Loader2, Eye
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PublicRelationsModuleProps {
  initialTab?: string;
}

const SENTIMENT_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  positive: { icon: ThumbsUp, color: "text-green-500", bg: "bg-green-500/10" },
  neutral: { icon: Minus, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  negative: { icon: ThumbsDown, color: "text-red-500", bg: "bg-red-500/10" },
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-500/20 text-blue-600",
  planning: "bg-yellow-500/20 text-yellow-600",
  completed: "bg-green-500/20 text-green-600",
  cancelled: "bg-red-500/20 text-red-600",
};

export function PublicRelationsModule({ initialTab = "coverage" }: PublicRelationsModuleProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewCoverageDialog, setShowNewCoverageDialog] = useState(false);
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  const [newCoverage, setNewCoverage] = useState({ headline: "", outlet: "", sentiment: "neutral", reach: "", author_name: "" });
  const [newEvent, setNewEvent] = useState({ name: "", type: "conference", event_date: "", location: "", role: "Speaker" });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch media coverage
  const { data: coverage = [], isLoading: coverageLoading } = useQuery({
    queryKey: ["pr-coverage", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase.from("pr_media_coverage").select("*").eq("tenant_id", currentTenant.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  // Fetch PR events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["pr-events", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase.from("pr_events").select("*").eq("tenant_id", currentTenant.id).order("event_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  // Create coverage
  const createCoverage = useMutation({
    mutationFn: async (c: typeof newCoverage) => {
      const { error } = await supabase.from("pr_media_coverage").insert({
        tenant_id: currentTenant!.id, created_by: user!.id,
        headline: c.headline, outlet: c.outlet || null, sentiment: c.sentiment,
        reach: c.reach ? parseInt(c.reach) : 0, author_name: c.author_name || null,
        coverage_date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pr-coverage"] });
      toast.success("Coverage added");
      setShowNewCoverageDialog(false);
      setNewCoverage({ headline: "", outlet: "", sentiment: "neutral", reach: "", author_name: "" });
    },
    onError: () => toast.error("Failed to add coverage"),
  });

  // Create event
  const createEvent = useMutation({
    mutationFn: async (e: typeof newEvent) => {
      const { error } = await supabase.from("pr_events").insert({
        tenant_id: currentTenant!.id, created_by: user!.id,
        name: e.name, type: e.type, status: "planning",
        event_date: e.event_date || null, location: e.location || null, role: e.role || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pr-events"] });
      toast.success("Event created");
      setShowNewEventDialog(false);
      setNewEvent({ name: "", type: "conference", event_date: "", location: "", role: "Speaker" });
    },
    onError: () => toast.error("Failed to create event"),
  });

  const positiveCoverage = coverage.filter(c => c.sentiment === "positive").length;
  const totalReach = coverage.reduce((sum, c) => sum + (c.reach || 0), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Public Relations</h1>
              <p className="text-sm text-muted-foreground">Media coverage, events & reputation</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Eye className="w-4 h-4 text-blue-500" /></div>
            <div><p className="text-xs text-muted-foreground">Total Coverage</p><p className="text-xl font-bold">{coverage.length}</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><ThumbsUp className="w-4 h-4 text-green-500" /></div>
            <div><p className="text-xs text-muted-foreground">Positive</p><p className="text-xl font-bold">{positiveCoverage}</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><TrendingUp className="w-4 h-4 text-purple-500" /></div>
            <div><p className="text-xs text-muted-foreground">Total Reach</p><p className="text-xl font-bold">{totalReach > 1000 ? `${(totalReach / 1000).toFixed(0)}K` : totalReach}</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Calendar className="w-4 h-4 text-amber-500" /></div>
            <div><p className="text-xs text-muted-foreground">Upcoming Events</p><p className="text-xl font-bold">{events.filter(e => e.status !== "completed").length}</p></div>
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 md:px-6 border-b">
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger value="coverage" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Media Coverage</TabsTrigger>
            <TabsTrigger value="events" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Events</TabsTrigger>
            <TabsTrigger value="partnerships" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Partnerships</TabsTrigger>
            <TabsTrigger value="reputation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Reputation</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* Coverage */}
          <TabsContent value="coverage" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search coverage..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Button className="gap-2" onClick={() => setShowNewCoverageDialog(true)}><Plus className="w-4 h-4" />Add Coverage</Button>
            </div>
            {coverageLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : coverage.length === 0 ? (
              <Card className="p-12 text-center">
                <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No media coverage tracked yet</h3>
                <p className="text-muted-foreground mb-4">Start tracking your media mentions</p>
                <Button onClick={() => setShowNewCoverageDialog(true)}><Plus className="w-4 h-4 mr-2" />Add Coverage</Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {coverage.filter(c => c.headline.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => {
                  const sentimentConfig = SENTIMENT_CONFIG[item.sentiment || "neutral"];
                  const Icon = sentimentConfig.icon;
                  return (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn("p-2 rounded-lg", sentimentConfig.bg)}><Icon className={cn("w-4 h-4", sentimentConfig.color)} /></div>
                          <div>
                            <h3 className="font-medium">{item.headline}</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              {item.outlet && <span>{item.outlet}</span>}
                              {item.author_name && <span>by {item.author_name}</span>}
                              {item.coverage_date && <span>{format(new Date(item.coverage_date), "MMM d, yyyy")}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{(item.reach || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">reach</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Events */}
          <TabsContent value="events" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">PR Events</h3>
              <Button className="gap-2" onClick={() => setShowNewEventDialog(true)}><Plus className="w-4 h-4" />New Event</Button>
            </div>
            {eventsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : events.length === 0 ? (
              <Card className="p-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No events yet</h3>
                <p className="text-muted-foreground mb-4">Plan your first PR event</p>
                <Button onClick={() => setShowNewEventDialog(true)}><Plus className="w-4 h-4 mr-2" />New Event</Button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {events.map((event) => (
                  <Card key={event.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{event.name}</h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            {event.event_date && <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(event.event_date), "MMM d, yyyy")}</div>}
                            {event.location && <span>• {event.location}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs capitalize">{event.type}</Badge>
                            {event.role && <Badge variant="outline" className="text-xs">{event.role}</Badge>}
                          </div>
                        </div>
                        <Badge className={cn("text-xs", STATUS_COLORS[event.status || "planning"] || "")}>{event.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Partnerships */}
          <TabsContent value="partnerships" className="p-4 md:p-6 mt-0">
            <Card className="p-12 text-center">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Partnership Management</h3>
              <p className="text-muted-foreground">Track strategic partnerships and collaborations</p>
            </Card>
          </TabsContent>

          {/* Reputation */}
          <TabsContent value="reputation" className="p-4 md:p-6 mt-0">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Sentiment Breakdown</CardTitle></CardHeader>
                <CardContent>
                  {coverage.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No coverage data to analyze yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {["positive", "neutral", "negative"].map((s) => {
                        const count = coverage.filter(c => c.sentiment === s).length;
                        const pct = coverage.length > 0 ? (count / coverage.length) * 100 : 0;
                        const config = SENTIMENT_CONFIG[s];
                        const Icon = config.icon;
                        return (
                          <div key={s} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2"><Icon className={cn("w-4 h-4", config.color)} /><span className="text-sm capitalize">{s}</span></div>
                              <span className="text-sm font-medium">{count} ({pct.toFixed(0)}%)</span>
                            </div>
                            <Progress value={pct} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Brand Health Score</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-4xl font-bold text-primary">{coverage.length > 0 ? Math.round((positiveCoverage / coverage.length) * 100) : "—"}</div>
                    <p className="text-sm text-muted-foreground mt-2">Based on sentiment analysis</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* New Coverage Dialog */}
      <Dialog open={showNewCoverageDialog} onOpenChange={setShowNewCoverageDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Media Coverage</DialogTitle><DialogDescription>Track a media mention</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Headline</Label><Input placeholder="Article headline" value={newCoverage.headline} onChange={(e) => setNewCoverage(p => ({ ...p, headline: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Outlet</Label><Input placeholder="Publication name" value={newCoverage.outlet} onChange={(e) => setNewCoverage(p => ({ ...p, outlet: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Author</Label><Input placeholder="Author name" value={newCoverage.author_name} onChange={(e) => setNewCoverage(p => ({ ...p, author_name: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sentiment</Label>
                <Select value={newCoverage.sentiment} onValueChange={(v) => setNewCoverage(p => ({ ...p, sentiment: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Estimated Reach</Label><Input type="number" placeholder="0" value={newCoverage.reach} onChange={(e) => setNewCoverage(p => ({ ...p, reach: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCoverageDialog(false)}>Cancel</Button>
            <Button onClick={() => createCoverage.mutate(newCoverage)} disabled={!newCoverage.headline || createCoverage.isPending}>
              {createCoverage.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Add Coverage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Event Dialog */}
      <Dialog open={showNewEventDialog} onOpenChange={setShowNewEventDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New PR Event</DialogTitle><DialogDescription>Plan a new event</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Event Name</Label><Input placeholder="Event name" value={newEvent.name} onChange={(e) => setNewEvent(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newEvent.type} onValueChange={(v) => setNewEvent(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="summit">Summit</SelectItem>
                    <SelectItem value="awards">Awards</SelectItem>
                    <SelectItem value="launch">Product Launch</SelectItem>
                    <SelectItem value="webinar">Webinar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={newEvent.event_date} onChange={(e) => setNewEvent(p => ({ ...p, event_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Location</Label><Input placeholder="City or Virtual" value={newEvent.location} onChange={(e) => setNewEvent(p => ({ ...p, location: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newEvent.role} onValueChange={(v) => setNewEvent(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Speaker">Speaker</SelectItem>
                    <SelectItem value="Sponsor">Sponsor</SelectItem>
                    <SelectItem value="Host">Host</SelectItem>
                    <SelectItem value="Nominee">Nominee</SelectItem>
                    <SelectItem value="Attendee">Attendee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEventDialog(false)}>Cancel</Button>
            <Button onClick={() => createEvent.mutate(newEvent)} disabled={!newEvent.name || createEvent.isPending}>
              {createEvent.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
