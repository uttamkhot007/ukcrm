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
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Megaphone, Target, Mail, Users, BarChart3, Calendar,
  Plus, Search, Eye, TrendingUp, DollarSign, Zap, Globe, Share2,
  FileText, Image, Video, Loader2, PieChart
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface MarketingModuleProps {
  initialTab?: string;
}

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
  completed: "bg-muted text-muted-foreground",
  paused: "bg-yellow-500/20 text-yellow-600 border-yellow-500/20",
  draft: "bg-muted text-muted-foreground",
  published: "bg-green-500/20 text-green-600 border-green-500/20",
  review: "bg-orange-500/20 text-orange-600 border-orange-500/20",
};

export function MarketingModule({ initialTab = "campaigns" }: MarketingModuleProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [showNewContentDialog, setShowNewContentDialog] = useState(false);

  // New Campaign form state
  const [newCampaign, setNewCampaign] = useState({
    name: "", type: "email", start_date: "", end_date: "", budget: "", description: "",
  });

  // New Content form state
  const [newContent, setNewContent] = useState({
    title: "", type: "blog", description: "",
  });

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["marketing-campaigns", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("marketing_campaigns")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  // Fetch content
  const { data: content = [], isLoading: contentLoading } = useQuery({
    queryKey: ["marketing-content", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("marketing_content")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant,
  });

  // Create campaign mutation
  const createCampaign = useMutation({
    mutationFn: async (campaign: typeof newCampaign) => {
      const { error } = await supabase.from("marketing_campaigns").insert({
        tenant_id: currentTenant!.id,
        created_by: user!.id,
        name: campaign.name,
        type: campaign.type,
        status: "draft",
        budget: campaign.budget ? parseFloat(campaign.budget) : 0,
        start_date: campaign.start_date || null,
        end_date: campaign.end_date || null,
        description: campaign.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      toast.success("Campaign created successfully");
      setShowNewCampaignDialog(false);
      setNewCampaign({ name: "", type: "email", start_date: "", end_date: "", budget: "", description: "" });
    },
    onError: () => toast.error("Failed to create campaign"),
  });

  // Create content mutation
  const createContent = useMutation({
    mutationFn: async (item: typeof newContent) => {
      const { error } = await supabase.from("marketing_content").insert({
        tenant_id: currentTenant!.id,
        created_by: user!.id,
        title: item.title,
        type: item.type,
        status: "draft",
        author: "Marketing Team",
        description: item.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-content"] });
      toast.success("Content created successfully");
      setShowNewContentDialog(false);
      setNewContent({ title: "", type: "blog", description: "" });
    },
    onError: () => toast.error("Failed to create content"),
  });

  // Stats
  const totalBudget = campaigns.reduce((sum, c) => sum + Number(c.budget || 0), 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + Number(c.spent || 0), 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads_count || 0), 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions_count || 0), 0);
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
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-primary" />
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
            <div className="p-2 rounded-lg bg-primary/10">
              <Megaphone className="w-4 h-4 text-primary" />
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
              <p className="text-xl font-bold">₹{(totalBudget / 1000).toFixed(0)}K</p>
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
            <TabsTrigger value="campaigns" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Campaigns</TabsTrigger>
            <TabsTrigger value="content" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Content</TabsTrigger>
            <TabsTrigger value="leads" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Lead Nurturing</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Analytics</TabsTrigger>
            <TabsTrigger value="assets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Brand Assets</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search campaigns..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </div>

            {campaignsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filteredCampaigns.length === 0 ? (
              <Card className="p-12 text-center">
                <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-4">Create your first marketing campaign to get started</p>
                <Button onClick={() => setShowNewCampaignDialog(true)}><Plus className="w-4 h-4 mr-2" />New Campaign</Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredCampaigns.map((campaign) => {
                  const Icon = getCampaignTypeIcon(campaign.type);
                  const budget = Number(campaign.budget || 0);
                  const spent = Number(campaign.spent || 0);
                  const progress = budget > 0 ? (spent / budget) * 100 : 0;
                  return (
                    <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-primary/10">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{campaign.name}</h3>
                                <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[campaign.status] || "")}>
                                  {campaign.status}
                                </Badge>
                              </div>
                              {campaign.start_date && campaign.end_date && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {format(new Date(campaign.start_date), "MMM d")} - {format(new Date(campaign.end_date), "MMM d, yyyy")}
                                </p>
                              )}
                              <div className="flex items-center gap-6 mt-3 text-sm">
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span>{campaign.leads_count || 0} leads</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                  <span>{campaign.conversions_count || 0} conversions</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Budget</p>
                            <p className="font-semibold">₹{spent.toLocaleString()} / ₹{budget.toLocaleString()}</p>
                            <Progress value={progress} className="mt-2 h-2 w-32" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="p-4 md:p-6 mt-0 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search content..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline" className="gap-2" onClick={() => setShowNewContentDialog(true)}>
                <Plus className="w-4 h-4" />New Content
              </Button>
            </div>

            {contentLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filteredContent.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No content yet</h3>
                <p className="text-muted-foreground mb-4">Create your first content piece</p>
                <Button onClick={() => setShowNewContentDialog(true)}><Plus className="w-4 h-4 mr-2" />New Content</Button>
              </Card>
            ) : (
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
                          <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[item.status] || "")}>
                            {item.status}
                          </Badge>
                        </div>
                        {(item.views_count || 0) > 0 && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Eye className="w-3 h-3" />{item.views_count}
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold mt-3">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{item.author || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground mt-2">{format(new Date(item.created_at), "MMM d, yyyy")}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Lead Nurturing Tab */}
          <TabsContent value="leads" className="p-4 md:p-6 mt-0">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4" />Email Sequences</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50"><p className="font-medium text-sm">Welcome Series</p><p className="text-xs text-muted-foreground">5 emails • Auto-trigger on signup</p></div>
                  <div className="p-3 rounded-lg bg-muted/50"><p className="font-medium text-sm">Product Demo Follow-up</p><p className="text-xs text-muted-foreground">3 emails • After demo booking</p></div>
                  <div className="p-3 rounded-lg bg-muted/50"><p className="font-medium text-sm">Re-engagement Campaign</p><p className="text-xs text-muted-foreground">4 emails • Inactive users</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" />Lead Scoring</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm">Hot Leads (80+)</span><Badge className="bg-red-500/20 text-red-600">—</Badge></div>
                  <div className="flex items-center justify-between"><span className="text-sm">Warm Leads (50-79)</span><Badge className="bg-orange-500/20 text-orange-600">—</Badge></div>
                  <div className="flex items-center justify-between"><span className="text-sm">Cold Leads (&lt;50)</span><Badge className="bg-blue-500/20 text-blue-600">—</Badge></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4" />Automation Rules</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                    <div><p className="font-medium text-sm">Form Submission</p><p className="text-xs text-muted-foreground">Add to welcome sequence</p></div>
                    <Badge variant="outline" className="bg-green-500/20 text-green-600">Active</Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                    <div><p className="font-medium text-sm">Page Visit</p><p className="text-xs text-muted-foreground">Increase lead score</p></div>
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
                <CardHeader><CardTitle className="text-base">Campaign Performance</CardTitle></CardHeader>
                <CardContent>
                  {campaigns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No campaigns to analyze yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {campaigns.slice(0, 5).map((campaign) => (
                        <div key={campaign.id} className="flex items-center justify-between">
                          <div><p className="font-medium text-sm">{campaign.name}</p><p className="text-xs text-muted-foreground">{campaign.leads_count || 0} leads • {campaign.conversions_count || 0} conversions</p></div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">{(campaign.leads_count || 0) > 0 ? (((campaign.conversions_count || 0) / campaign.leads_count!) * 100).toFixed(1) : 0}%</p>
                            <p className="text-xs text-muted-foreground">Conv. Rate</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Channel Performance</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["email", "social", "content", "display"].map((type) => {
                      const typeCampaigns = campaigns.filter(c => c.type === type);
                      const typeLeads = typeCampaigns.reduce((s, c) => s + (c.leads_count || 0), 0);
                      const icon = type === "email" ? Mail : type === "social" ? Share2 : type === "content" ? FileText : Globe;
                      const Icon = icon;
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" /><span className="text-sm capitalize">{type}</span></div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm">{typeLeads} leads</span>
                            <span className="text-sm text-muted-foreground">{typeCampaigns.length} campaigns</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Brand Assets Tab */}
          <TabsContent value="assets" className="p-4 md:p-6 mt-0">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Image className="w-4 h-4" />Logos & Images</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="aspect-square rounded-lg bg-muted flex items-center justify-center"><Image className="w-8 h-8 text-muted-foreground" /></div>
                    <div className="aspect-square rounded-lg bg-muted flex items-center justify-center"><Image className="w-8 h-8 text-muted-foreground" /></div>
                  </div>
                  <Button variant="outline" className="w-full mt-4 gap-2"><Plus className="w-4 h-4" />Upload Asset</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />Templates</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50"><p className="font-medium text-sm">Email Newsletter</p><p className="text-xs text-muted-foreground">Reusable email template</p></div>
                  <div className="p-3 rounded-lg bg-muted/50"><p className="font-medium text-sm">Social Media Post</p><p className="text-xs text-muted-foreground">Brand-consistent format</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="w-4 h-4" />Brand Guidelines</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-primary" /><div><p className="font-medium text-sm">Primary Color</p><p className="text-xs text-muted-foreground font-mono">Brand Primary</p></div></div>
                  <div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-secondary" /><div><p className="font-medium text-sm">Secondary Color</p><p className="text-xs text-muted-foreground font-mono">Brand Secondary</p></div></div>
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
              <Input placeholder="Enter campaign name" value={newCampaign.name} onChange={(e) => setNewCampaign(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Campaign Type</Label>
              <Select value={newCampaign.type} onValueChange={(v) => setNewCampaign(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_TYPES.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={newCampaign.start_date} onChange={(e) => setNewCampaign(p => ({ ...p, start_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={newCampaign.end_date} onChange={(e) => setNewCampaign(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Budget (₹)</Label><Input type="number" placeholder="0" value={newCampaign.budget} onChange={(e) => setNewCampaign(p => ({ ...p, budget: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Campaign description..." value={newCampaign.description} onChange={(e) => setNewCampaign(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCampaignDialog(false)}>Cancel</Button>
            <Button onClick={() => createCampaign.mutate(newCampaign)} disabled={!newCampaign.name || createCampaign.isPending}>
              {createCampaign.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Content Dialog */}
      <Dialog open={showNewContentDialog} onOpenChange={setShowNewContentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Content</DialogTitle>
            <DialogDescription>Add a new content piece</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Title</Label><Input placeholder="Content title" value={newContent.title} onChange={(e) => setNewContent(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newContent.type} onValueChange={(v) => setNewContent(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">Blog Post</SelectItem>
                  <SelectItem value="case_study">Case Study</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="infographic">Infographic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Content description..." value={newContent.description} onChange={(e) => setNewContent(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewContentDialog(false)}>Cancel</Button>
            <Button onClick={() => createContent.mutate(newContent)} disabled={!newContent.title || createContent.isPending}>
              {createContent.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Create Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
