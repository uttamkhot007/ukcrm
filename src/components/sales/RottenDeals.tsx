import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Clock, TrendingDown, ExternalLink, Loader2 } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  updated_at: string;
  assigned_to: string | null;
  created_at: string;
  contacts?: { name: string; company: string | null } | null;
}

const STAGE_LIMITS: Record<string, number> = {
  prospecting: 14,
  qualification: 21,
  proposal: 30,
  negotiation: 21,
  closed_won: 999,
  closed_lost: 999,
};

const stageLabels: Record<string, string> = {
  prospecting: "Prospecting",
  qualification: "Qualification",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export function RottenDeals() {
  const { formatCurrency } = useOrganizationSettings();

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["rotten-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, contacts:contact_id(name, company)")
        .not("stage", "in", "(closed_won,closed_lost)")
        .order("updated_at", { ascending: true });
      if (error) throw error;
      return data as Deal[];
    },
  });

  const getRottenStatus = (deal: Deal) => {
    const daysInStage = differenceInDays(new Date(), new Date(deal.updated_at));
    const limit = STAGE_LIMITS[deal.stage] || 30;
    
    if (daysInStage > limit * 1.5) return { status: "critical", color: "destructive", daysOver: daysInStage - limit };
    if (daysInStage > limit) return { status: "warning", color: "warning", daysOver: daysInStage - limit };
    if (daysInStage > limit * 0.8) return { status: "approaching", color: "secondary", daysOver: 0 };
    return null;
  };

  const rottenDeals = deals
    .map((deal) => ({ ...deal, rottenStatus: getRottenStatus(deal) }))
    .filter((deal) => deal.rottenStatus !== null)
    .sort((a, b) => {
      const aScore = a.rottenStatus?.status === "critical" ? 3 : a.rottenStatus?.status === "warning" ? 2 : 1;
      const bScore = b.rottenStatus?.status === "critical" ? 3 : b.rottenStatus?.status === "warning" ? 2 : 1;
      return bScore - aScore;
    });

  const criticalCount = rottenDeals.filter((d) => d.rottenStatus?.status === "critical").length;
  const warningCount = rottenDeals.filter((d) => d.rottenStatus?.status === "warning").length;
  const totalValue = rottenDeals.reduce((sum, d) => sum + d.value, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Rotten Deals</h2>
        <p className="text-muted-foreground">Deals that have been stuck in a stage too long</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">Deals over 50% past limit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warning</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warningCount}</div>
            <p className="text-xs text-muted-foreground">Deals past stage limit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk Value</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Total pipeline at risk</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deals Requiring Attention</CardTitle>
        </CardHeader>
        <CardContent>
          {rottenDeals.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No rotten deals found. All deals are progressing on time!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Deal</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Days in Stage</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rottenDeals.map((deal) => {
                  const daysInStage = differenceInDays(new Date(), new Date(deal.updated_at));
                  return (
                    <TableRow key={deal.id}>
                      <TableCell>
                        <Badge variant={deal.rottenStatus?.status === "critical" ? "destructive" : deal.rottenStatus?.status === "warning" ? "secondary" : "outline"}>
                          {deal.rottenStatus?.status === "critical" ? "Critical" : deal.rottenStatus?.status === "warning" ? "Warning" : "Approaching"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{deal.title}</p>
                          <p className="text-sm text-muted-foreground">{deal.contacts?.company || deal.contacts?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{stageLabels[deal.stage] || deal.stage}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={deal.rottenStatus?.status === "critical" ? "text-destructive font-medium" : ""}>{daysInStage} days</span>
                          {deal.rottenStatus?.daysOver && deal.rottenStatus.daysOver > 0 && (
                            <span className="text-xs text-destructive">(+{deal.rottenStatus.daysOver} over)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{deal.assigned_to ? "Assigned" : "Unassigned"}</TableCell>
                      <TableCell>{formatCurrency(deal.value)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
