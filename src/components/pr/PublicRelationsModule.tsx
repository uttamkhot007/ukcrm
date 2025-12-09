import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Globe, Users, Star, TrendingUp, BarChart3, Handshake,
  Plus, Search, ExternalLink, Calendar, Clock, Building2,
  Award, Heart, Target, Share2, MessageSquare, Eye,
  ThumbsUp, ThumbsDown, Minus, FileText, Camera, Video
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PublicRelationsModuleProps {
  initialTab?: string;
}

// Mock data
const MOCK_MEDIA_COVERAGE = [
  { id: "1", headline: "Company Named Top Innovator 2024", outlet: "Tech Weekly", sentiment: "positive", date: "2024-11-15", reach: 450000, author: "John Smith" },
  { id: "2", headline: "New Product Launch Receives Mixed Reviews", outlet: "Industry Today", sentiment: "neutral", date: "2024-11-12", reach: 280000, author: "Lisa Chen" },
  { id: "3", headline: "Quarterly Earnings Beat Expectations", outlet: "Business News", sentiment: "positive", date: "2024-11-10", reach: 890000, author: "Mike Johnson" },
  { id: "4", headline: "Security Concerns Raised by Analysts", outlet: "Security Weekly", sentiment: "negative", date: "2024-11-08", reach: 120000, author: "Sarah Davis" },
];

const MOCK_EVENTS = [
  { id: "1", name: "Tech Conference 2024", type: "conference", status: "upcoming", date: "2024-12-05", location: "San Francisco", role: "Speaker" },
  { id: "2", name: "Industry Awards Gala", type: "awards", status: "upcoming", date: "2024-12-15", location: "New York", role: "Nominee" },
  { id: "3", name: "Partner Summit", type: "summit", status: "planning", date: "2025-01-20", location: "Chicago", role: "Host" },
  { id: "4", name: "Product Launch Event", type: "launch", status: "completed", date: "2024-11-01", location: "Virtual", role: "Host" },
];

const MOCK_PARTNERSHIPS = [
  { id: "1", partner: "TechCorp Global", type: "Strategic", status: "active", startDate: "2024-01-15", value: "High" },
  { id: "2", partner: "Innovation Labs", type: "Technology", status: "active", startDate: "2024-06-01", value: "Medium" },
  { id: "3", partner: "SecureNet Inc", type: "Integration", status: "negotiating", startDate: "", value: "High" },
];

const SENTIMENT_CONFIG = {
  positive: { icon: ThumbsUp, color: "text-green-500", bg: "bg-green-500/10" },
  neutral: { icon: Minus, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  negative: { icon: ThumbsDown, color: "text-red-500", bg: "bg-red-500/10" },
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-600",
  upcoming: "bg-blue-500/20 text-blue-600",
  planning: "bg-purple-500/20 text-purple-600",
  completed: "bg-gray-500/20 text-gray-600",
  negotiating: "bg-orange-500/20 text-orange-600",
};

export function PublicRelationsModule({ initialTab = "coverage" }: PublicRelationsModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);

  // Calculate sentiment stats
  const positiveCount = MOCK_MEDIA_COVERAGE.filter(m => m.sentiment === "positive").length;
  const neutralCount = MOCK_MEDIA_COVERAGE.filter(m => m.sentiment === "neutral").length;
  const negativeCount = MOCK_MEDIA_COVERAGE.filter(m => m.sentiment === "negative").length;
  const totalReach = MOCK_MEDIA_COVERAGE.reduce((sum, m) => sum + m.reach, 0);
  const sentimentScore = Math.round(((positiveCount * 100) + (neutralCount * 50)) / MOCK_MEDIA_COVERAGE.length);

  const filteredCoverage = MOCK_MEDIA_COVERAGE.filter(m =>
    m.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.outlet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Public Relations</h1>
              <p className="text-sm text-muted-foreground">Media coverage, events & partnerships</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <BarChart3 className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Media Mentions</p>
              <p className="text-xl font-bold">{MOCK_MEDIA_COVERAGE.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Reach</p>
              <p className="text-xl font-bold">{(totalReach / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Star className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sentiment Score</p>
              <p className="text-xl font-bold">{sentimentScore}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Calendar className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Upcoming Events</p>
              <p className="text-xl font-bold">{MOCK_EVENTS.filter(e => e.status === "upcoming").length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 md:px-6 border-b">
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger value="coverage" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Media Coverage
            </TabsTrigger>
            <TabsTrigger value="events" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Events & Speaking
            </TabsTrigger>
            <TabsTrigger value="partnerships" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Partnerships
            </TabsTrigger>
            <TabsTrigger value="reputation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Reputation
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* Media Coverage Tab */}
          <TabsContent value="coverage" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search coverage..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 gap-1">
                  <ThumbsUp className="w-3 h-3" /> {positiveCount}
                </Badge>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 gap-1">
                  <Minus className="w-3 h-3" /> {neutralCount}
                </Badge>
                <Badge variant="outline" className="bg-red-500/10 text-red-600 gap-1">
                  <ThumbsDown className="w-3 h-3" /> {negativeCount}
                </Badge>
              </div>
            </div>

            <div className="grid gap-4">
              {filteredCoverage.map((coverage) => {
                const SentimentIcon = SENTIMENT_CONFIG[coverage.sentiment as keyof typeof SENTIMENT_CONFIG].icon;
                return (
                  <Card key={coverage.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={cn("p-3 rounded-lg", SENTIMENT_CONFIG[coverage.sentiment as keyof typeof SENTIMENT_CONFIG].bg)}>
                            <SentimentIcon className={cn("w-5 h-5", SENTIMENT_CONFIG[coverage.sentiment as keyof typeof SENTIMENT_CONFIG].color)} />
                          </div>
                          <div>
                            <h3 className="font-semibold">{coverage.headline}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{coverage.outlet} • by {coverage.author}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(coverage.date), "MMM d, yyyy")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {(coverage.reach / 1000).toFixed(0)}K reach
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Events & Speaking Engagements</h2>
              <Button onClick={() => setShowNewEventDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Event
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {MOCK_EVENTS.map((event) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[event.status])}>
                          {event.status}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">{event.type}</Badge>
                      </div>
                      <Badge variant="outline">{event.role}</Badge>
                    </div>
                    <h3 className="font-semibold mt-3">{event.name}</h3>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(event.date), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Partnerships Tab */}
          <TabsContent value="partnerships" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Strategic Partnerships</h2>
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Partnership
              </Button>
            </div>

            <div className="grid gap-4">
              {MOCK_PARTNERSHIPS.map((partnership) => (
                <Card key={partnership.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <Handshake className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{partnership.partner}</h3>
                            <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[partnership.status])}>
                              {partnership.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Type: {partnership.type}</span>
                            <span>Value: {partnership.value}</span>
                            {partnership.startDate && (
                              <span>Since: {format(new Date(partnership.startDate), "MMM yyyy")}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Reputation Tab */}
          <TabsContent value="reputation" className="p-4 md:p-6 mt-0">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Brand Sentiment Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-green-600">Positive</span>
                      <span className="text-sm font-medium">{Math.round((positiveCount / MOCK_MEDIA_COVERAGE.length) * 100)}%</span>
                    </div>
                    <Progress value={(positiveCount / MOCK_MEDIA_COVERAGE.length) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-yellow-600">Neutral</span>
                      <span className="text-sm font-medium">{Math.round((neutralCount / MOCK_MEDIA_COVERAGE.length) * 100)}%</span>
                    </div>
                    <Progress value={(neutralCount / MOCK_MEDIA_COVERAGE.length) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-red-600">Negative</span>
                      <span className="text-sm font-medium">{Math.round((negativeCount / MOCK_MEDIA_COVERAGE.length) * 100)}%</span>
                    </div>
                    <Progress value={(negativeCount / MOCK_MEDIA_COVERAGE.length) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Brand Health Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span className="text-sm">Brand Awareness</span>
                    </div>
                    <span className="font-semibold">78%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-sm">Brand Favorability</span>
                    </div>
                    <span className="font-semibold">65%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Share of Voice</span>
                    </div>
                    <span className="font-semibold">23%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Message Penetration</span>
                    </div>
                    <span className="font-semibold">54%</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Awards & Recognition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-amber-500/10 text-center">
                      <Award className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <p className="font-semibold">Top Innovator 2024</p>
                      <p className="text-xs text-muted-foreground">Tech Awards</p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-500/10 text-center">
                      <Award className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="font-semibold">Best Workplace</p>
                      <p className="text-xs text-muted-foreground">HR Excellence</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-500/10 text-center">
                      <Award className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="font-semibold">Sustainability Leader</p>
                      <p className="text-xs text-muted-foreground">Green Business</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* New Event Dialog */}
      <Dialog open={showNewEventDialog} onOpenChange={setShowNewEventDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
            <DialogDescription>Add a new event or speaking engagement</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input placeholder="Event name" />
            </div>
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="summit">Summit</SelectItem>
                  <SelectItem value="awards">Awards</SelectItem>
                  <SelectItem value="launch">Product Launch</SelectItem>
                  <SelectItem value="webinar">Webinar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="Location" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Our Role</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="speaker">Speaker</SelectItem>
                  <SelectItem value="sponsor">Sponsor</SelectItem>
                  <SelectItem value="host">Host</SelectItem>
                  <SelectItem value="attendee">Attendee</SelectItem>
                  <SelectItem value="nominee">Nominee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEventDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success("Event added successfully");
              setShowNewEventDialog(false);
            }}>Add Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}