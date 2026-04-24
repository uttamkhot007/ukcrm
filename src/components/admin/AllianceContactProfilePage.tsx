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
  User, Mail, Phone, Building, Briefcase, Calendar, DollarSign, TrendingUp, 
  Loader2, Star, MapPin, Linkedin, PhoneCall, Video, Users, Target, 
  Trophy, XCircle, BarChart3, Clock, ArrowUpRight, ArrowDownRight,
  Pencil, Brain, ArrowLeft
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ContactIntelligence } from "./ContactIntelligence";

interface AllianceContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  role: string | null;
  designation?: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  organization_id: string | null;
  linkedin_url?: string | null;
  dob?: string | null;
  anniversary_date?: string | null;
}

interface AllianceOrganization {
  id: string;
  name: string;
  organization_type: string | null;
  industry: string | null;
  website: string | null;
  logo_url: string | null;
}

interface AllianceContactProfilePageProps {
  contact: AllianceContact;
  organization?: AllianceOrganization | null;
  onBack: () => void;
  onEdit?: (contact: AllianceContact) => void;
}

export function AllianceContactProfilePage({ 
  contact, 
  organization, 
  onBack,
  onEdit 
}: AllianceContactProfilePageProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { currentTenant } = useTenant();

  // Fetch deals associated with this contact
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["alliance-contact-deals", contact?.id],
    queryFn: async () => {
      if (!contact) return [];
      
      const { data: linkedContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("alliance_user_id", contact.id)
        .single();
      
      if (!linkedContact) return [];
      
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("contact_id", linkedContact.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!contact,
  });

  // Fetch calendar events/meetings with this contact
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ["alliance-contact-meetings", contact?.id],
    queryFn: async () => {
      if (!contact) return [];
      
      const { data: linkedContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("alliance_user_id", contact.id)
        .single();
      
      if (!linkedContact) return [];
      
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("related_contact_id", linkedContact.id)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!contact,
  });

  // Fetch deal activities for this contact
  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ["alliance-contact-activities", contact?.id],
    queryFn: async () => {
      if (!contact || !deals.length) return [];
      
      const dealIds = deals.map(d => d.id);
      const { data, error } = await supabase
        .from("deal_activities")
        .select("*")
        .in("deal_id", dealIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!contact && deals.length > 0,
  });

  // Calculate metrics
  const totalDeals = deals.length;
  const wonDeals = deals.filter(d => d.stage === "closed_won").length;
  const lostDeals = deals.filter(d => d.stage === "closed_lost").length;
  const activeDeals = deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage)).length;
  const winRate = totalDeals > 0 ? Math.round((wonDeals / (wonDeals + lostDeals || 1)) * 100) : 0;
  
  const totalDealValue = deals.reduce((sum, d) => sum + Number(d.value), 0);
  const wonDealValue = deals.filter(d => d.stage === "closed_won").reduce((sum, d) => sum + Number(d.value), 0);
  const pipelineValue = deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage)).reduce((sum, d) => sum + Number(d.value), 0);

  const totalMeetings = meetings.length;
  const completedMeetings = meetings.filter(m => m.status === "completed").length;
  const upcomingMeetings = meetings.filter(m => new Date(m.start_time) > new Date()).length;

  // Activity breakdown
  const callActivities = activities.filter(a => a.activity_type === "call").length;
  const meetingActivities = activities.filter(a => a.activity_type === "meeting").length;
  const emailActivities = activities.filter(a => a.activity_type === "email").length;

  // Last interaction
  const lastActivity = activities[0];
  const lastMeeting = meetings.find(m => new Date(m.start_time) < new Date());
  const daysSinceLastContact = lastActivity 
    ? differenceInDays(new Date(), new Date(lastActivity.created_at))
    : lastMeeting 
    ? differenceInDays(new Date(), new Date(lastMeeting.start_time))
    : null;

  const isChampion = contact.notes?.includes('[CHAMPION]');

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "closed_won": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "closed_lost": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "negotiation": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "proposal": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Contact Profile</h1>
        </div>
        
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarFallback className="text-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
              {contact.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">{contact.name}</h2>
              {isChampion && (
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Star className="h-3 w-3 mr-1 fill-amber-500" /> Champion
                </Badge>
              )}
              <Badge variant={contact.status === "active" ? "default" : "secondary"}>
                {contact.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {contact.role || contact.designation || "Contact"} 
              {organization && ` at ${organization.name}`}
            </p>
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 gap-1"
                onClick={() => onEdit(contact)}
              >
                <Pencil className="h-3 w-3" />
                Edit Contact
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b px-4 md:px-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="intelligence" className="gap-1">
            <Brain className="h-3 w-3" />
            Intelligence
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="p-4 md:p-6 space-y-6 mt-0">
            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contact.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${contact.phone}`} className="hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.location}</span>
                  </div>
                )}
                {contact.linkedin_url && (
                  <div className="flex items-center gap-3 text-sm">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      LinkedIn Profile
                    </a>
                  </div>
                )}
                {organization && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{organization.name}</span>
                    {organization.organization_type && (
                      <Badge variant="outline" className="text-xs">
                        {organization.organization_type}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Deals</p>
                    <p className="text-lg font-bold">{totalDeals}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Trophy className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                    <p className="text-lg font-bold">{winRate}%</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Won Value</p>
                    <p className="text-lg font-bold">{formatCurrency(wonDealValue)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Video className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Meetings</p>
                    <p className="text-lg font-bold">{totalMeetings}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Notes */}
            {contact.notes && !contact.notes.includes('[CHAMPION]') && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{contact.notes.replace('[CHAMPION]', '').trim()}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="engagement" className="p-4 md:p-6 space-y-6 mt-0">
            {/* Engagement Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Engagement Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {daysSinceLastContact !== null && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Last Contact</span>
                    </div>
                    <Badge variant={daysSinceLastContact > 30 ? "destructive" : daysSinceLastContact > 14 ? "secondary" : "default"}>
                      {daysSinceLastContact === 0 ? "Today" : `${daysSinceLastContact} days ago`}
                    </Badge>
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 text-blue-500" />
                      <span>Calls</span>
                    </div>
                    <span className="font-medium">{callActivities}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-green-500" />
                      <span>Meetings</span>
                    </div>
                    <span className="font-medium">{meetingActivities + completedMeetings}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-amber-500" />
                      <span>Emails</span>
                    </div>
                    <span className="font-medium">{emailActivities}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opportunity Performance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Opportunity Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Win/Loss Ratio</span>
                    <span className="font-medium">{wonDeals} / {lostDeals}</span>
                  </div>
                  <Progress value={winRate} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">{winRate}% success rate</p>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-green-500">
                      <Trophy className="h-4 w-4" />
                      <span className="text-lg font-bold">{wonDeals}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Won</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-amber-500">
                      <Target className="h-4 w-4" />
                      <span className="text-lg font-bold">{activeDeals}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-red-500">
                      <XCircle className="h-4 w-4" />
                      <span className="text-lg font-bold">{lostDeals}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Lost</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deals" className="p-4 md:p-6 space-y-4 mt-0">
            {dealsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : deals.length === 0 ? (
              <Card className="p-8 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No deals found for this contact</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {deals.map(deal => (
                  <Card key={deal.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{deal.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {deal.description || "No description"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold">{formatCurrency(deal.value)}</p>
                        <Badge className={getStageColor(deal.stage)}>
                          {deal.stage.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                    {deal.expected_close_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
                        <Calendar className="h-3 w-3" />
                        Expected close: {format(new Date(deal.expected_close_date), "MMM d, yyyy")}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activities" className="p-4 md:p-6 space-y-4 mt-0">
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No activities recorded for this contact</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {activities.map(activity => (
                  <Card key={activity.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        activity.activity_type === "call" ? "bg-blue-500/10" :
                        activity.activity_type === "meeting" ? "bg-green-500/10" :
                        activity.activity_type === "email" ? "bg-amber-500/10" :
                        "bg-muted"
                      }`}>
                        {activity.activity_type === "call" ? <PhoneCall className="h-4 w-4 text-blue-500" /> :
                         activity.activity_type === "meeting" ? <Video className="h-4 w-4 text-green-500" /> :
                         activity.activity_type === "email" ? <Mail className="h-4 w-4 text-amber-500" /> :
                         <Clock className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {activity.activity_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(activity.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{activity.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="intelligence" className="p-4 md:p-6 mt-0">
            <ContactIntelligence 
              contactId={contact.id} 
              contactName={contact.name}
              organizationName={organization?.name}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
