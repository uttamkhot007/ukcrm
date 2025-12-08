import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface RevenueChartProps {
  onNavigate?: (module: string) => void;
}

export function RevenueChart({ onNavigate }: RevenueChartProps) {
  const { formatCurrency, getCurrencySymbol } = useOrganizationSettings();

  const { data: chartData, isLoading } = useQuery({
    queryKey: ["revenue-chart-data"],
    queryFn: async () => {
      // Get invoices from last 12 months
      const now = new Date();
      const months = [];
      
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        
        months.push({
          month: format(monthDate, "MMM"),
          start,
          end,
        });
      }

      const { data: invoices } = await supabase
        .from("invoices")
        .select("total, status, issue_date")
        .gte("issue_date", format(months[0].start, "yyyy-MM-dd"))
        .lte("issue_date", format(months[11].end, "yyyy-MM-dd"));

      return months.map(({ month, start, end }) => {
        const monthInvoices = invoices?.filter(inv => {
          const invDate = new Date(inv.issue_date);
          return invDate >= start && invDate <= end;
        }) || [];

        const revenue = monthInvoices
          .filter(inv => inv.status === "paid")
          .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

        return {
          month,
          revenue: revenue / 1000, // Convert to K for display
        };
      });
    },
  });

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-6 border border-border animate-fade-in">
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasData = chartData?.some(d => d.revenue > 0);
  
  return (
    <div 
      className="glass rounded-xl p-6 border border-border animate-fade-in cursor-pointer hover:border-primary/30 transition-colors"
      onClick={() => onNavigate?.("billing")}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Revenue Trend</h3>
          <p className="text-sm text-muted-foreground">
            Monthly revenue from paid invoices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-finance" />
          <span className="text-sm text-muted-foreground">Revenue</span>
        </div>
      </div>

      {!hasData ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <p>No revenue data available yet</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
              <XAxis
                dataKey="month"
                stroke="hsl(215, 20%, 55%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(215, 20%, 55%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${getCurrencySymbol()}${value}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 47%, 8%)",
                  border: "1px solid hsl(217, 33%, 17%)",
                  borderRadius: "8px",
                  color: "hsl(210, 40%, 98%)",
                }}
                formatter={(value: number) => [formatCurrency(value * 1000), "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
