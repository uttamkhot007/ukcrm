import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Megaphone, Target, Mail, Users, BarChart3, Calendar,
  Plus, Search, Eye, Edit2, Trash2, Send, Clock, CheckCircle,
  TrendingUp, MousePointer, DollarSign, Zap, Globe, Share2,
  FileText, Image, Video, Loader2, RefreshCw, PieChart
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface MarketingModuleProps {
  initialTab?: string;
}

// Mock data for campaigns
const MOCK_CAMPAIGNS = [
  { id: "1", name: "Q4 Product Launch", type: "email", status: "active", budget: 15000, spent: 8500, leads: 234, conversions: 45, startDate: "2024-10-01", endDate: "2024-12-31" },
  { id: "2", name: "Holiday Sale 2024", type: "social", status: "scheduled", budget: 8000, spent: 0, leads: 0, conversions: 0, startDate: "2024-12-15", endDate: "2024-12-31" },
  { id: "3", name: "Webinar Series", type: "content", status: "active", budget: 5000, spent: 3200, leads: 156, conversions: 28, startDate: "2024-09-01", endDate: "2024-11-30" },
  { id: "4", name: "Brand Awareness", type: "display", status: "completed", budget: 20000, spent: 19800, leads: 890, conversions: 102, startDate: "2024-07-01", endDate: "2024-09-30" },
];

const MOCK_CONTENT = [
  { id: "1", title: "Product Update Blog", type: "blog", status: "published", author: "Marketing Team", date: "2024-11-15", views: 1245 },
  { id: "2", title: "Customer Success Story", type: "case_study", status: "draft", author: "Content Team", date: "2024-11-18", views: 0 },
  { id: "3", title: "How-to Video Tutorial", type: "video", status: "published", author: "Video Team", date: "2024-11-10", views: 3456 },
  { id: "4", title: "Infographic: Industry Trends", type: "infographic", status: "review", author: "Design Team", date: "2024-11-20", views: 0 },
];

const CAMPAIGN_TYPES = [
  { value: "email", label: "Email Campaign", icon: Mail },
  { value: "social", label: "Social Media", icon: Share2 },
  { value: "content", label: "Content Marketing", icon: FileText },
  { value: "display", label: "Display Ads", icon: Globe },
  { value: "event", label: "Event Marketing", icon: Calendar },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-600 border-green-500/20",
  scheduled: "bg-blue-500/20 text-blue-600 border-blue-500/20",
  completed: "bg-gray-500/20 text-gray-600 border-gray-500/20",
  paused: "bg-yellow-500/20 text-yellow-600 border-yellow-500/20",
  draft: "bg-gray-500/20 text-gray-600 border-gray-500/20",
  published: "bg-green-500/20 text-green-600 border-green-500/20",
  review: "bg-orange-500/20 text-orange-600 border-orange-500/20",
};

export function MarketingModule({ initialTab = "campaigns" }: MarketingModuleProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [campaigns] = useState(MOCK_CAMPAIGNS);
  const [content] = useState(MOCK_CONTENT);

  // Stats calculations
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContent = content.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCampaignTypeIcon = (type: string) => {
    const typeConfig = CAMPAIGN_TYPES.find(t => t.value === type);
    return typeConfig?.icon || Megaphone;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-marketing/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-marketing" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Marketing</h1>
              <p className="text-sm text-muted-foreground">Campaigns, content & analytics</p>
            </div>
          </div>
          <Button onClick={() => setShowNewCampaignDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-marketing/10">
              <Megaphone className="w-4 h-4 text-marketing" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Campaigns</p>
              <p className="text-xl font-bold">{activeCampaigns}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <DollarSign className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="text-xl font-bold">${(totalBudget / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Leads Generated</p>
              <p className="text-xl font-bold">{totalLeads}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conversions</p>
              <p className="text-xl font-bold">{totalConversions}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <PieChart className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ROI</p>
              <p className="text-xl font-bold">{totalSpent > 0 ? ((totalConversions * 500 / totalSpent) * 100).toFixed(0) : 0}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 md:px-6 border-b">
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger value="campaigns" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="content" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Content
            </TabsTrigger>
            <TabsTrigger value="leads" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Lead Nurturing
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="assets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Brand Assets
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {filteredCampaigns.map((campaign) => {
                const Icon = getCampaignTypeIcon(campaign.type);
                const progress = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0;
                return (
                  <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-marketing/10">
                            <Icon className="w-5 h-5 text-marketing" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{campaign.name}</h3>
                              <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[campaign.status])}>
                                {campaign.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {format(new Date(campaign.startDate), "MMM d")} - {format(new Date(campaign.endDate), "MMM d, yyyy")}
                            </p>
                            <div className="flex items-center gap-6 mt-3 text-sm">
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span>{campaign.leads} leads</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                <span>{campaign.conversions} conversions</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Budget</p>
                          <p className="font-semibold">${campaign.spent.toLocaleString()} / ${campaign.budget.toLocaleString()}</p>
                          <Progress value={progress} className="mt-2 h-2 w-32" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                New Content
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContent.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {item.type === "blog" && <FileText className="w-4 h-4 text-blue-500" />}
                        {item.type === "video" && <Video className="w-4 h-4 text-red-500" />}
                        {item.type === "case_study" && <FileText className="w-4 h-4 text-green-500" />}
                        {item.type === "infographic" && <Image className="w-4 h-4 text-purple-500" />}
                        <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[item.status])}>
                          {item.status}
                        </Badge>
                      </div>
                      {item.views > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Eye className="w-3 h-3" />
                          {item.views}
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold mt-3">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.author}</p>
                    <p className="text-xs text-muted-foreground mt-2">{format(new Date(item.date), "MMM d, yyyy")}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Lead Nurturing Tab */}
          <TabsContent value="leads" className="p-4 md:p-6 mt-0">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Sequences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">Welcome Series</p>
                    <p className="text-xs text-muted-foreground">5 emails • 234 active</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">Product Demo Follow-up</p>
                    <p className="text-xs text-muted-foreground">3 emails • 89 active</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">Re-engagement Campaign</p>
                    <p className="text-xs text-muted-foreground">4 emails • 156 active</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Lead Scoring
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Hot Leads (80+)</span>
                    <Badge className="bg-red-500/20 text-red-600">45</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Warm Leads (50-79)</span>
                    <Badge className="bg-orange-500/20 text-orange-600">128</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cold Leads (&lt;50)</span>
                    <Badge className="bg-blue-500/20 text-blue-600">312</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Automation Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Form Submission</p>
                      <p className="text-xs text-muted-foreground">Add to welcome sequence</p>
                    </div>
                    <Badge variant="outline" className="bg-green-500/20 text-green-600">Active</Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Page Visit</p>
                      <p className="text-xs text-muted-foreground">Increase lead score</p>
                    </div>
                    <Badge variant="outline" className="bg-green-500/20 text-green-600">Active</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="p-4 md:p-6 mt-0">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Campaign Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {campaigns.slice(0, 3).map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground">{campaign.leads} leads • {campaign.conversions} conversions</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{campaign.leads > 0 ? ((campaign.conversions / campaign.leads) * 100).toFixed(1) : 0}%</p>
                          <p className="text-xs text-muted-foreground">Conv. Rate</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Channel Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">Email</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">42% open rate</span>
                        <Progress value={42} className="w-20 h-2" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">Social</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">3.2% CTR</span>
                        <Progress value={32} className="w-20 h-2" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Display</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">0.8% CTR</span>
                        <Progress value={8} className="w-20 h-2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Brand Assets Tab */}
          <TabsContent value="assets" className="p-4 md:p-6 mt-0">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Logos & Images
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4 gap-2">
                    <Plus className="w-4 h-4" />
                    Upload Asset
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Templates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">Email Newsletter</p>
                    <p className="text-xs text-muted-foreground">Last updated 2 days ago</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">Social Media Post</p>
                    <p className="text-xs text-muted-foreground">Last updated 1 week ago</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Megaphone className="w-4 h-4" />
                    Brand Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary" />
                    <div>
                      <p className="font-medium text-sm">Primary Color</p>
                      <p className="text-xs text-muted-foreground font-mono">#7C3AED</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-secondary" />
                    <div>
                      <p className="font-medium text-sm">Secondary Color</p>
                      <p className="text-xs text-muted-foreground font-mono">#F3F4F6</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* New Campaign Dialog */}
      <Dialog open={showNewCampaignDialog} onOpenChange={setShowNewCampaignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>Set up a new marketing campaign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input placeholder="Enter campaign name" />
            </div>
            <div className="space-y-2">
              <Label>Campaign Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Budget</Label>
              <Input type="number" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Campaign description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCampaignDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success("Campaign created successfully");
              setShowNewCampaignDialog(false);
            }}>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}