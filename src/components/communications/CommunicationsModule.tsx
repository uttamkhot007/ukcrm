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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  MessageSquare, Newspaper, Users, Globe, Mic, Camera,
  Plus, Search, Send, Clock, CheckCircle, AlertCircle,
  FileText, Image, Video, Calendar, Bell, Share2,
  Mail, Phone, Building2, ExternalLink, Edit2, Eye
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CommunicationsModuleProps {
  initialTab?: string;
}

// Mock data
const MOCK_PRESS_RELEASES = [
  { id: "1", title: "Q4 2024 Financial Results", status: "published", date: "2024-11-15", outlet: "PR Newswire", author: "Communications Team" },
  { id: "2", title: "New Product Launch Announcement", status: "draft", date: "2024-11-20", outlet: "", author: "PR Team" },
  { id: "3", title: "Strategic Partnership with TechCorp", status: "scheduled", date: "2024-11-25", outlet: "Business Wire", author: "Communications Team" },
  { id: "4", title: "Sustainability Initiative 2025", status: "review", date: "2024-11-22", outlet: "", author: "CSR Team" },
];

const MOCK_MEDIA_CONTACTS = [
  { id: "1", name: "Sarah Johnson", outlet: "Tech Today", role: "Senior Reporter", email: "sarah@techtoday.com", beat: "Enterprise Software", lastContact: "2024-11-10" },
  { id: "2", name: "Michael Chen", outlet: "Business Weekly", role: "Editor", email: "mchen@bweekly.com", beat: "Technology", lastContact: "2024-10-28" },
  { id: "3", name: "Emily Davis", outlet: "Industry Insights", role: "Journalist", email: "emily.d@insights.com", beat: "Cybersecurity", lastContact: "2024-11-05" },
];

const MOCK_ANNOUNCEMENTS = [
  { id: "1", title: "Office Holiday Schedule", type: "internal", status: "active", date: "2024-11-18", audience: "All Employees" },
  { id: "2", title: "New Benefits Program", type: "internal", status: "draft", date: "2024-11-20", audience: "Full-time Employees" },
  { id: "3", title: "Q4 Town Hall Meeting", type: "event", status: "scheduled", date: "2024-12-01", audience: "All Employees" },
];

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-500/20 text-green-600 border-green-500/20",
  draft: "bg-gray-500/20 text-gray-600 border-gray-500/20",
  scheduled: "bg-blue-500/20 text-blue-600 border-blue-500/20",
  review: "bg-orange-500/20 text-orange-600 border-orange-500/20",
  active: "bg-green-500/20 text-green-600 border-green-500/20",
};

export function CommunicationsModule({ initialTab = "press" }: CommunicationsModuleProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewPRDialog, setShowNewPRDialog] = useState(false);
  const [showNewAnnouncementDialog, setShowNewAnnouncementDialog] = useState(false);

  const filteredPressReleases = MOCK_PRESS_RELEASES.filter(pr =>
    pr.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMediaContacts = MOCK_MEDIA_CONTACTS.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.outlet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Communications</h1>
              <p className="text-sm text-muted-foreground">PR, media relations & internal comms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Newspaper className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Press Releases</p>
              <p className="text-xl font-bold">{MOCK_PRESS_RELEASES.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Media Contacts</p>
              <p className="text-xl font-bold">{MOCK_MEDIA_CONTACTS.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Bell className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Announcements</p>
              <p className="text-xl font-bold">{MOCK_ANNOUNCEMENTS.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Globe className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Media Mentions</p>
              <p className="text-xl font-bold">156</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 md:px-6 border-b">
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger value="press" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Press Releases
            </TabsTrigger>
            <TabsTrigger value="media" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Media Relations
            </TabsTrigger>
            <TabsTrigger value="internal" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Internal Comms
            </TabsTrigger>
            <TabsTrigger value="crisis" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Crisis Management
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* Press Releases Tab */}
          <TabsContent value="press" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search press releases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setShowNewPRDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                New Press Release
              </Button>
            </div>

            <div className="grid gap-4">
              {filteredPressReleases.map((pr) => (
                <Card key={pr.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-blue-500/10">
                          <Newspaper className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{pr.title}</h3>
                            <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[pr.status])}>
                              {pr.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">By {pr.author}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(pr.date), "MMM d, yyyy")}
                            </span>
                            {pr.outlet && (
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {pr.outlet}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Media Relations Tab */}
          <TabsContent value="media" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search media contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Contact
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMediaContacts.map((contact) => (
                <Card key={contact.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-500/10 text-blue-500">
                          {contact.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{contact.name}</h3>
                        <p className="text-sm text-muted-foreground">{contact.role}</p>
                        <p className="text-sm text-primary">{contact.outlet}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        <span>Beat: {contact.beat}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Last contact: {format(new Date(contact.lastContact), "MMM d")}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1">
                        <Mail className="w-3 h-3" />
                        Email
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1">
                        <Phone className="w-3 h-3" />
                        Call
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Internal Communications Tab */}
          <TabsContent value="internal" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Internal Announcements</h2>
              <Button onClick={() => setShowNewAnnouncementDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                New Announcement
              </Button>
            </div>

            <div className="grid gap-4">
              {MOCK_ANNOUNCEMENTS.map((announcement) => (
                <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-purple-500/10">
                          <Bell className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{announcement.title}</h3>
                            <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[announcement.status])}>
                              {announcement.status}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {announcement.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(announcement.date), "MMM d, yyyy")}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {announcement.audience}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Send className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Quick Broadcast</CardTitle>
                <CardDescription>Send a quick message to all employees</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea placeholder="Type your message..." className="mb-4" />
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Schedule</Button>
                  <Button className="gap-2">
                    <Send className="w-4 h-4" />
                    Send Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Crisis Management Tab */}
          <TabsContent value="crisis" className="p-4 md:p-6 mt-0">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Crisis Response Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">Step 1: Assess & Contain</p>
                    <p className="text-xs text-muted-foreground">Evaluate the situation and limit immediate impact</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">Step 2: Activate Response Team</p>
                    <p className="text-xs text-muted-foreground">Notify key stakeholders and crisis team</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">Step 3: Draft Communications</p>
                    <p className="text-xs text-muted-foreground">Prepare internal and external messaging</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">Step 4: Monitor & Adjust</p>
                    <p className="text-xs text-muted-foreground">Track response and adapt as needed</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Crisis Response Team
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">CEO</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">CEO</p>
                      <p className="text-xs text-muted-foreground">Executive Sponsor</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">PR</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">PR Director</p>
                      <p className="text-xs text-muted-foreground">Communications Lead</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">LG</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">Legal Counsel</p>
                      <p className="text-xs text-muted-foreground">Legal Advisor</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Active Incidents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p className="font-medium">No Active Incidents</p>
                    <p className="text-sm">All systems operating normally</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* New Press Release Dialog */}
      <Dialog open={showNewPRDialog} onOpenChange={setShowNewPRDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Press Release</DialogTitle>
            <DialogDescription>Draft a new press release for distribution</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="Press release title" />
            </div>
            <div className="space-y-2">
              <Label>Distribution Channel</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pr_newswire">PR Newswire</SelectItem>
                  <SelectItem value="business_wire">Business Wire</SelectItem>
                  <SelectItem value="direct">Direct Distribution</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea placeholder="Press release content..." rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPRDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success("Press release created");
              setShowNewPRDialog(false);
            }}>Create Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Announcement Dialog */}
      <Dialog open={showNewAnnouncementDialog} onOpenChange={setShowNewAnnouncementDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>Create an internal announcement</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="Announcement title" />
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  <SelectItem value="fulltime">Full-time Employees</SelectItem>
                  <SelectItem value="managers">Managers Only</SelectItem>
                  <SelectItem value="department">Specific Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea placeholder="Announcement content..." rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAnnouncementDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success("Announcement created");
              setShowNewAnnouncementDialog(false);
            }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}