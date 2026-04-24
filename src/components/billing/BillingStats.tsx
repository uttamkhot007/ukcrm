import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, FileText, Clock, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useExchangeRates } from "@/hooks/useExchangeRates";

export function BillingStats() {
  const { formatCurrency, settings } = useOrganizationSettings();
  const { convert, isLoading: isLoadingRates } = useExchangeRates();
  const orgCurrency = settings?.currency || "INR";
  const alternateCurrency = orgCurrency === "INR" ? "USD" : "INR";
  
  const { data: stats } = useQuery({
    queryKey: ["billing-stats"],
    queryFn: async () => {
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("status, total, amount_paid, due_date");

      if (error) throw error;

      const now = new Date();
      const total = invoices?.length || 0;
      const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
      const collected = invoices?.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0) || 0;
      const outstanding = totalRevenue - collected;
      const overdue = invoices?.filter(inv => 
        inv.status !== "paid" && inv.status !== "cancelled" && 
        inv.due_date && new Date(inv.due_date) < now
      ).length || 0;
      const paid = invoices?.filter(inv => inv.status === "paid").length || 0;

      return { total, totalRevenue, collected, outstanding, overdue, paid };
    },
  });

  const statCards = [
    { 
      title: "Total Revenue", 
      value: formatCurrency(stats?.totalRevenue || 0), 
      converted: !isLoadingRates && stats?.totalRevenue ? formatCurrency(convert(stats.totalRevenue, orgCurrency, alternateCurrency)!, alternateCurrency) : null,
      icon: DollarSign, 
      color: "text-blue-500" 
    },
    { 
      title: "Collected", 
      value: formatCurrency(stats?.collected || 0), 
      converted: !isLoadingRates && stats?.collected ? formatCurrency(convert(stats.collected, orgCurrency, alternateCurrency)!, alternateCurrency) : null,
      icon: CheckCircle, 
      color: "text-green-500" 
    },
    { 
      title: "Outstanding", 
      value: formatCurrency(stats?.outstanding || 0), 
      converted: !isLoadingRates && stats?.outstanding ? formatCurrency(convert(stats.outstanding, orgCurrency, alternateCurrency)!, alternateCurrency) : null,
      icon: Clock, 
      color: "text-amber-500" 
    },
    { title: "Overdue", value: stats?.overdue || 0, converted: null, icon: AlertTriangle, color: "text-red-500" },
    { title: "Total Invoices", value: stats?.total || 0, converted: null, icon: FileText, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                {stat.converted && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    {stat.converted}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{stat.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
