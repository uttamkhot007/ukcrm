import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCcw, 
  DollarSign, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Target
} from "lucide-react";
import { format, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import { TeamCalendarWidget } from "./TeamCalendarWidget";
import { TeamRemindersWidget } from "./TeamRemindersWidget";
import { TargetProgressWidget } from "./TargetProgressWidget";

interface RenewalDashboardProps {
  onNavigate: (module: string) => void;
}

export function RenewalDashboard({ onNavigate }: RenewalDashboardProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { formatCurrency } = useOrganizationSettings();

  // Fetch renewals (deals with deal_type = "renewal")
  const { data: renewals = [] } = useQuery({
    queryKey: ["my-renewals", user?.id, currentTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("deals")
        .select("*")
        .eq("deal_type", "renewal")
        .or(`user_id.eq.${user?.id},assigned_to.eq.${user?.id}`)
        .order("expected_close_date", { ascending: true });

      if (currentTenant?.id) {
        query = query.eq("tenant_id", currentTenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Use urgent renewals as proxy for expiring contracts
  const expiringContracts = renewals.filter(r => {
    const closeDate = r.expected_close_date ? new Date(r.expected_close_date) : null;
    const daysUntil = closeDate ? differenceInDays(closeDate, new Date()) : Infinity;
    return daysUntil >= 0 && daysUntil <= 90 && !["closed_won", "closed_lost"].includes(r.stage);
  });

  // Calculate stats
  const activeRenewals = renewals.filter(r => !["closed_won", "closed_lost"].includes(r.stage));
  const wonRenewals = renewals.filter(r => r.stage === "closed_won");
  const lostRenewals = renewals.filter(r => r.stage === "closed_lost");

  const totalRenewalValue = activeRenewals.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
  const wonRenewalValue = wonRenewals.reduce((sum, r) => sum + (Number(r.value) || 0), 0);

  // This month's renewals
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const thisMonthRenewals = renewals.filter(r => {
    const closeDate = r.expected_close_date ? new Date(r.expected_close_date) : null;
    return closeDate && closeDate >= monthStart && closeDate <= monthEnd;
  });

  // Urgent renewals (due in 30 days)
  const urgentRenewals = activeRenewals.filter(r => {
    const closeDate = r.expected_close_date ? new Date(r.expected_close_date) : null;
    const daysUntil = closeDate ? differenceInDays(closeDate, new Date()) : Infinity;
    return daysUntil >= 0 && daysUntil <= 30;
  });

  // Renewal rate
  const totalClosed = wonRenewals.length + lostRenewals.length;
  const renewalRate = totalClosed > 0 ? (wonRenewals.length / totalClosed) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Renewals</p>
                <p className="text-2xl font-bold">{activeRenewals.length}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(totalRenewalValue)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <RefreshCcw className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due in 30 Days</p>
                <p className="text-2xl font-bold">{urgentRenewals.length}</p>
                <p className="text-xs text-muted-foreground">urgent</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Won Renewals</p>
                <p className="text-2xl font-bold">{wonRenewals.length}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(wonRenewalValue)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-700 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiring Contracts</p>
                <p className="text-2xl font-bold">{expiringContracts.length}</p>
                <p className="text-xs text-muted-foreground">next 90 days</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Progress */}
      <TargetProgressWidget teamType="sales" showFullBreakdown />

      {/* Renewal Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Renewal Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Renewal Rate</span>
              <span className="text-sm text-muted-foreground">{renewalRate.toFixed(1)}%</span>
            </div>
            <Progress value={renewalRate} className="h-3" />
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {wonRenewals.length} renewed
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                {lostRenewals.length} lost
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Renewals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Urgent Renewals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {urgentRenewals.slice(0, 5).map((renewal) => {
                const daysUntil = renewal.expected_close_date 
                  ? differenceInDays(new Date(renewal.expected_close_date), new Date())
                  : 0;
                return (
                  <div
                    key={renewal.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onNavigate("renewals")}
                  >
                    <p className="font-medium text-sm truncate">{renewal.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${daysUntil <= 7 ? 'text-red-500' : 'text-orange-500'}`}>
                        {daysUntil} days left
                      </span>
                      <span className="text-xs font-medium">
                        {formatCurrency(renewal.value)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {urgentRenewals.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No urgent renewals
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              Expiring Soon (90 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {expiringContracts.slice(0, 5).map((contract) => {
                const daysUntil = contract.expected_close_date 
                  ? differenceInDays(new Date(contract.expected_close_date), new Date())
                  : 0;
                return (
                  <div
                    key={contract.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onNavigate("renewals")}
                  >
                    <p className="font-medium text-sm truncate">{contract.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${daysUntil <= 30 ? 'text-red-500' : 'text-orange-500'}`}>
                        Due in {daysUntil} days
                      </span>
                      <span className="text-xs font-medium">
                        {formatCurrency(contract.value)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {expiringContracts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No contracts expiring soon
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reminders */}
        <TeamRemindersWidget />
      </div>

      {/* Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamCalendarWidget 
          teamType="renewals" 
          title="My Calendar" 
        />
        <TeamCalendarWidget 
          teamType="sales" 
          title="Sales Team Calendar" 
        />
      </div>
    </div>
  );
}
