import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  PhoneOutgoing,
  Calendar,
  AlertTriangle,
  Clock,
  Building2,
  ChevronRight,
  Loader2,
  Bell,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/api/client";
import { cn } from "@/lib/utils";
import { useTenant } from "@/contexts/TenantContext";

interface RenewalItem {
  id: string;
  name: string;
  type: string;
  expiry_date: string;
  vendor: string | null;
  cost: number;
}

interface ProspectItem {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  original_deal_title: string;
  follow_up_date: string | null;
  status: string;
  priority: string;
}

interface FollowUpItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  daysUntil: number;
  type: "renewal" | "prospect";
  priority?: string;
  status?: string;
}

export function UpcomingFollowUps({ onNavigate }: { onNavigate?: (module: string) => void }) {
  const { currentTenant } = useTenant();
  const [renewals, setRenewals] = useState<RenewalItem[]>([]);
  const [prospects, setProspects] = useState<ProspectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const today = new Date();

  useEffect(() => {
    fetchData();
  }, [currentTenant?.id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch renewals expiring in next 30 days
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      let renewalsQuery = supabase
        .from("renewals")
        .select("id, name, type, expiry_date, vendor, cost")
        .lte("expiry_date", thirtyDaysFromNow.toISOString().split("T")[0])
        .neq("status", "renewed")
        .neq("status", "cancelled")
        .order("expiry_date", { ascending: true })
        .limit(10);

      let prospectsQuery = supabase
        .from("inside_sales_prospects")
        .select("id, company_name, contact_name, original_deal_title, follow_up_date, status, priority")
        .not("status", "in", '("converted","archived","not_interested")')
        .not("follow_up_date", "is", null)
        .lte("follow_up_date", thirtyDaysFromNow.toISOString().split("T")[0])
        .order("follow_up_date", { ascending: true })
        .limit(10);

      if (currentTenant?.id) {
        renewalsQuery = renewalsQuery.eq("tenant_id", currentTenant.id);
        prospectsQuery = prospectsQuery.eq("tenant_id", currentTenant.id);
      }

      const [renewalsRes, prospectsRes] = await Promise.all([renewalsQuery, prospectsQuery]);

      if (renewalsRes.error) throw renewalsRes.error;
      if (prospectsRes.error) throw prospectsRes.error;

      setRenewals(renewalsRes.data || []);
      setProspects(prospectsRes.data || []);
    } catch (error) {
      console.error("Error fetching follow-ups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Transform data into unified format
  const allFollowUps: FollowUpItem[] = [
    ...renewals.map((r) => ({
      id: r.id,
      title: r.name,
      subtitle: r.vendor || r.type,
      date: r.expiry_date,
      daysUntil: differenceInDays(new Date(r.expiry_date), today),
      type: "renewal" as const,
    })),
    ...prospects.map((p) => ({
      id: p.id,
      title: p.company_name || p.original_deal_title,
      subtitle: p.contact_name || "No contact",
      date: p.follow_up_date!,
      daysUntil: differenceInDays(new Date(p.follow_up_date!), today),
      type: "prospect" as const,
      priority: p.priority,
      status: p.status,
    })),
  ].sort((a, b) => a.daysUntil - b.daysUntil);

  const renewalFollowUps = allFollowUps.filter((f) => f.type === "renewal");
  const prospectFollowUps = allFollowUps.filter((f) => f.type === "prospect");

  const getDisplayItems = () => {
    switch (activeTab) {
      case "renewals":
        return renewalFollowUps;
      case "prospects":
        return prospectFollowUps;
      default:
        return allFollowUps.slice(0, 8);
    }
  };

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil < 0) return "text-red-500 bg-red-500/10";
    if (daysUntil <= 7) return "text-orange-500 bg-orange-500/10";
    if (daysUntil <= 14) return "text-yellow-500 bg-yellow-500/10";
    return "text-muted-foreground bg-muted";
  };

  const getUrgencyBadge = (daysUntil: number) => {
    if (daysUntil < 0) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    }
    if (daysUntil === 0) {
      return <Badge variant="destructive" className="text-xs">Today</Badge>;
    }
    if (daysUntil <= 7) {
      return <Badge className="text-xs bg-orange-500">This Week</Badge>;
    }
    return null;
  };

  const stats = {
    total: allFollowUps.length,
    overdue: allFollowUps.filter((f) => f.daysUntil < 0).length,
    thisWeek: allFollowUps.filter((f) => f.daysUntil >= 0 && f.daysUntil <= 7).length,
    renewalsCount: renewalFollowUps.length,
    prospectsCount: prospectFollowUps.length,
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Upcoming Follow-ups
          </CardTitle>
          <div className="flex items-center gap-2">
            {stats.overdue > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {stats.overdue} Overdue
              </Badge>
            )}
            {stats.thisWeek > 0 && (
              <Badge variant="outline" className="gap-1 border-orange-500 text-orange-500">
                <Clock className="w-3 h-3" />
                {stats.thisWeek} This Week
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all" className="gap-1">
              All
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{stats.total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="renewals" className="gap-1">
              <RefreshCw className="w-3 h-3" />
              Renewals
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{stats.renewalsCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="prospects" className="gap-1">
              <PhoneOutgoing className="w-3 h-3" />
              Prospects
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{stats.prospectsCount}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="space-y-2">
            {getDisplayItems().length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No upcoming follow-ups</p>
              </div>
            ) : (
              getDisplayItems().map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer",
                    item.daysUntil < 0 && "border-red-500/30 bg-red-500/5"
                  )}
                  onClick={() => onNavigate?.(item.type === "renewal" ? "renewals" : "inside-sales")}
                >
                  <div className={cn("p-2 rounded-lg", getUrgencyColor(item.daysUntil))}>
                    {item.type === "renewal" ? (
                      <RefreshCw className="w-4 h-4" />
                    ) : (
                      <PhoneOutgoing className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{item.title}</p>
                      {getUrgencyBadge(item.daysUntil)}
                      {item.priority === "high" && (
                        <Badge variant="outline" className="text-xs border-red-500 text-red-500">High</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="truncate">{item.subtitle}</span>
                      <span>•</span>
                      <span className="capitalize">{item.type}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn(
                      "text-sm font-medium",
                      item.daysUntil < 0 ? "text-red-500" : item.daysUntil <= 7 ? "text-orange-500" : "text-muted-foreground"
                    )}>
                      {item.daysUntil < 0 
                        ? `${Math.abs(item.daysUntil)}d ago`
                        : item.daysUntil === 0 
                        ? "Today"
                        : `${item.daysUntil}d`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.date), "MMM d")}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))
            )}
          </div>

          {getDisplayItems().length > 0 && (
            <div className="mt-4 flex gap-2">
              {activeTab !== "renewals" && stats.renewalsCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onNavigate?.("renewals")}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  View All Renewals
                </Button>
              )}
              {activeTab !== "prospects" && stats.prospectsCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onNavigate?.("inside-sales")}
                >
                  <PhoneOutgoing className="w-4 h-4 mr-2" />
                  View All Prospects
                </Button>
              )}
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
