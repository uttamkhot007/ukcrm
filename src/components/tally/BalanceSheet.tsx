import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PiggyBank, Download, Scale } from "lucide-react";
import { format, endOfYear } from "date-fns";

export function BalanceSheet() {
  const { currentTenant } = useTenant();
  const [asOnDate, setAsOnDate] = useState(format(endOfYear(new Date()), "yyyy-MM-dd"));

  const { data: ledgers = [], isLoading } = useQuery({
    queryKey: ["balance-sheet-ledgers", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("ledger_accounts") as any)
        .select("*, group:account_groups(name, nature)")
        .eq("tenant_id", currentTenant.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Filter for balance sheet accounts
  const assetLedgers = ledgers.filter((l: any) => l.group?.nature === 'assets' && l.current_balance !== 0);
  const liabilityLedgers = ledgers.filter((l: any) => l.group?.nature === 'liabilities' && l.current_balance !== 0);
  const capitalLedgers = ledgers.filter((l: any) => l.group?.nature === 'capital' && l.current_balance !== 0);

  // Calculate P&L for closing capital
  const incomeLedgers = ledgers.filter((l: any) => l.group?.nature === 'income');
  const expenseLedgers = ledgers.filter((l: any) => l.group?.nature === 'expenses');
  const totalIncome = incomeLedgers.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
  const totalExpenses = expenseLedgers.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
  const netProfit = totalIncome - totalExpenses;

  const totalAssets = assetLedgers.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
  const totalLiabilities = liabilityLedgers.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
  const totalCapital = capitalLedgers.reduce((sum: number, l: any) => sum + Math.abs(l.current_balance || 0), 0);
  const totalLiabilitiesAndCapital = totalLiabilities + totalCapital + netProfit;

  const formatAmount = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  };

  // Group assets by sub-groups
  const currentAssets = assetLedgers.filter((l: any) => 
    l.group?.name?.toLowerCase().includes('current') || 
    l.name?.toLowerCase().includes('cash') ||
    l.name?.toLowerCase().includes('bank') ||
    l.name?.toLowerCase().includes('receivable')
  );
  const fixedAssets = assetLedgers.filter((l: any) => 
    l.group?.name?.toLowerCase().includes('fixed') ||
    !currentAssets.includes(l)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PiggyBank className="h-6 w-6" />
            Balance Sheet
          </h2>
          <p className="text-muted-foreground">Statement of assets and liabilities</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            <span className={Math.abs(totalAssets - totalLiabilitiesAndCapital) < 0.01 ? "text-green-700 dark:text-green-400" : "text-red-600"}>
              {Math.abs(totalAssets - totalLiabilitiesAndCapital) < 0.01 ? "Balanced" : "Not Balanced"}
            </span>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>As on Date</Label>
              <Input
                type="date"
                value={asOnDate}
                onChange={(e) => setAsOnDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            {/* Liabilities & Capital Side */}
            <div>
              <h3 className="font-semibold text-lg mb-4 pb-2 border-b">Liabilities & Capital</h3>
              <Table>
                <TableBody>
                  {/* Capital */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="font-semibold">Capital Account</TableCell>
                  </TableRow>
                  {capitalLedgers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground pl-6">No capital accounts</TableCell>
                    </TableRow>
                  ) : (
                    capitalLedgers.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="pl-6">{l.name}</TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(l.current_balance || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  {netProfit !== 0 && (
                    <TableRow>
                      <TableCell className="pl-6">
                        {netProfit > 0 ? "Add: Net Profit" : "Less: Net Loss"}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${netProfit > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
                        {formatAmount(netProfit)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="font-medium bg-muted/20">
                    <TableCell className="pl-6">Total Capital</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(totalCapital + netProfit)}</TableCell>
                  </TableRow>

                  {/* Liabilities */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="font-semibold pt-4">Liabilities</TableCell>
                  </TableRow>
                  {liabilityLedgers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground pl-6">No liabilities</TableCell>
                    </TableRow>
                  ) : (
                    liabilityLedgers.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="pl-6">{l.name}</TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(l.current_balance || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  
                  <TableRow className="bg-muted/50 font-bold border-t-2">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(totalLiabilitiesAndCapital)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Assets Side */}
            <div>
              <h3 className="font-semibold text-lg mb-4 pb-2 border-b">Assets</h3>
              <Table>
                <TableBody>
                  {/* Fixed Assets */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="font-semibold">Fixed Assets</TableCell>
                  </TableRow>
                  {fixedAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground pl-6">No fixed assets</TableCell>
                    </TableRow>
                  ) : (
                    fixedAssets.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="pl-6">{l.name}</TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(l.current_balance || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}

                  {/* Current Assets */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="font-semibold pt-4">Current Assets</TableCell>
                  </TableRow>
                  {currentAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground pl-6">No current assets</TableCell>
                    </TableRow>
                  ) : (
                    currentAssets.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="pl-6">{l.name}</TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(l.current_balance || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}

                  <TableRow className="bg-muted/50 font-bold border-t-2">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(totalAssets)}</TableCell>
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
