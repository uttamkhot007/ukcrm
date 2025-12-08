import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock, Building2 } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { useTenant } from "@/contexts/TenantContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SolutionExpiry {
  id: string;
  organization_name: string;
  solution_name: string;
  expiry_date: string;
  days_until_expiry: number;
  status: 'critical' | 'warning' | 'upcoming';
}

export function SolutionExpiryWidget() {
  const { currentTenant } = useTenant();

  const { data: expiringItems = [], isLoading } = useQuery({
    queryKey: ['solution-expiries', currentTenant],
    queryFn: async () => {
      // Fetch organizations with solution configs that have expiry dates
      const { data: orgs, error } = await supabase
        .from('alliance_organizations')
        .select('id, name, solution_configs')
        .eq('tenant_id', currentTenant?.id)
        .not('solution_configs', 'is', null);

      if (error) throw error;

      const expiries: SolutionExpiry[] = [];
      const today = new Date();

      orgs?.forEach(org => {
        const configs = org.solution_configs as Record<string, any>;
        if (configs) {
          Object.entries(configs).forEach(([solutionName, config]) => {
            if (config && typeof config === 'object' && config.expiryDate) {
              const expiryDate = new Date(config.expiryDate);
              const daysUntil = differenceInDays(expiryDate, today);
              
              // Only show items expiring within 90 days or already expired
              if (daysUntil <= 90) {
                let status: 'critical' | 'warning' | 'upcoming' = 'upcoming';
                if (daysUntil <= 0) status = 'critical';
                else if (daysUntil <= 30) status = 'warning';

                expiries.push({
                  id: `${org.id}-${solutionName}`,
                  organization_name: org.name,
                  solution_name: solutionName,
                  expiry_date: config.expiryDate,
                  days_until_expiry: daysUntil,
                  status
                });
              }
            }
          });
        }
      });

      // Sort by days until expiry (most urgent first)
      return expiries.sort((a, b) => a.days_until_expiry - b.days_until_expiry);
    },
    enabled: !!currentTenant?.id,
  });

  const getStatusBadge = (status: SolutionExpiry['status'], days: number) => {
    switch (status) {
      case 'critical':
        return (
          <Badge variant="destructive" className="text-xs">
            {days < 0 ? `Expired ${Math.abs(days)}d ago` : 'Expires today'}
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="text-xs border-orange-500 text-orange-600 dark:text-orange-400">
            {days}d remaining
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            {days}d remaining
          </Badge>
        );
    }
  };

  const criticalCount = expiringItems.filter(item => item.status === 'critical').length;
  const warningCount = expiringItems.filter(item => item.status === 'warning').length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Solution Expiry Alerts
          </CardTitle>
          {(criticalCount > 0 || warningCount > 0) && (
            <div className="flex gap-1">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalCount} critical
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                  {warningCount} warning
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : expiringItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming expirations</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-3">
              {expiringItems.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${
                    item.status === 'critical' 
                      ? 'border-destructive/50 bg-destructive/5' 
                      : item.status === 'warning'
                      ? 'border-orange-500/50 bg-orange-500/5'
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {item.organization_name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.solution_name}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(new Date(item.expiry_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(item.status, item.days_until_expiry)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
