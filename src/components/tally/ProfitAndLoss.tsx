import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { TrendingUp, Download, ArrowUp, ArrowDown } from "lucide-react";
import { format, startOfYear, endOfYear } from "date-fns";

export function ProfitAndLoss() {
  const { currentTenant } = useTenant();
  const [fromDate, setFromDate] = useState(format(startOfYear(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfYear(new Date()), "yyyy-MM-dd"));

  const { data: ledgers = [], isLoading } = useQuery({
    queryKey: ["pnl-ledgers", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("ledger_accounts") as any)
        .select("*, group:account_groups(name, nature, affects_gross_profit)")
        .eq("tenant_id", currentTenant.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Filter for P&L accounts (income and expenses)
  const incomeLedgers = ledgers.filter((l: any) => l.group?.nature === 'income');
  const expenseLedgers = ledgers.filter((l: any) => l.group?.nature === 'expenses');

  // Separate direct and indirect
  const directIncome = incomeLedgers.filter((l: any) => l.group?.affects_gross_profit);
  const indirectIncome = incomeLedgers.filter((l: any) => !l.group?.affects_gross_profit);
  const directExpenses = expenseLedgers.filter((l: any) => l.group?.affects_gross_profit);
  const indirectExpenses = expenseLedgers.filter((l: any) => !l.group?.affects_gross_profit);

  const totalDirectIncome = directIncome.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
  const totalIndirectIncome = indirectIncome.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
  const totalDirectExpenses = directExpenses.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
  const totalIndirectExpenses = indirectExpenses.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);

  const grossProfit = totalDirectIncome - totalDirectExpenses;
  const netProfit = grossProfit + totalIndirectIncome - totalIndirectExpenses;

  const formatAmount = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Profit & Loss Account
          </h2>
          <p className="text-muted-foreground">Income and expenditure statement</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <ArrowUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-xl font-bold text-green-600">
                  {formatAmount(totalDirectIncome + totalIndirectIncome)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <ArrowDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold text-red-600">
                  {formatAmount(totalDirectExpenses + totalIndirectExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <TrendingUp className={`h-5 w-5 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net {netProfit >= 0 ? 'Profit' : 'Loss'}</p>
                <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatAmount(netProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>From</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label>To</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            {/* Expenses Side */}
            <div>
              <h3 className="font-semibold text-lg mb-4 pb-2 border-b">Expenses</h3>
              <Table>
                <TableBody>
                  {/* Direct Expenses */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="font-semibold">Trading Account (Direct Expenses)</TableCell>
                  </TableRow>
                  {directExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground pl-6">No direct expenses</TableCell>
                    </TableRow>
                  ) : (
                    directExpenses.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="pl-6">{l.name}</TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(l.current_balance || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="font-medium">
                    <TableCell className="pl-6">Gross Profit c/d</TableCell>
                    <TableCell className="text-right font-mono">
                      {grossProfit > 0 ? formatAmount(grossProfit) : "-"}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(totalDirectIncome)}</TableCell>
                  </TableRow>

                  {/* Indirect Expenses */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="font-semibold pt-6">P&L Account (Indirect Expenses)</TableCell>
                  </TableRow>
                  {indirectExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground pl-6">No indirect expenses</TableCell>
                    </TableRow>
                  ) : (
                    indirectExpenses.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="pl-6">{l.name}</TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(l.current_balance || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="font-medium">
                    <TableCell className="pl-6">Net Profit</TableCell>
                    <TableCell className="text-right font-mono">
                      {netProfit > 0 ? formatAmount(netProfit) : "-"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Income Side */}
            <div>
              <h3 className="font-semibold text-lg mb-4 pb-2 border-b">Income</h3>
              <Table>
                <TableBody>
                  {/* Direct Income */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="font-semibold">Trading Account (Direct Income)</TableCell>
                  </TableRow>
                  {directIncome.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground pl-6">No direct income</TableCell>
                    </TableRow>
                  ) : (
                    directIncome.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="pl-6">{l.name}</TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(l.current_balance || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="font-medium">
                    <TableCell className="pl-6">Gross Loss c/d</TableCell>
                    <TableCell className="text-right font-mono">
                      {grossProfit < 0 ? formatAmount(grossProfit) : "-"}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(totalDirectIncome)}</TableCell>
                  </TableRow>

                  {/* Indirect Income */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="font-semibold pt-6">P&L Account (Indirect Income)</TableCell>
                  </TableRow>
                  <TableRow className="font-medium">
                    <TableCell className="pl-6">Gross Profit b/d</TableCell>
                    <TableCell className="text-right font-mono">
                      {grossProfit > 0 ? formatAmount(grossProfit) : "-"}
                    </TableCell>
                  </TableRow>
                  {indirectIncome.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="pl-6">{l.name}</TableCell>
                      <TableCell className="text-right font-mono">{formatAmount(l.current_balance || 0)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium">
                    <TableCell className="pl-6">Net Loss</TableCell>
                    <TableCell className="text-right font-mono">
                      {netProfit < 0 ? formatAmount(netProfit) : "-"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
