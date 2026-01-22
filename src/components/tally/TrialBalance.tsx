import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { format, endOfMonth } from "date-fns";

export function TrialBalance() {
  const { currentTenant } = useTenant();
  const [asOnDate, setAsOnDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const { data: ledgers = [], isLoading } = useQuery({
    queryKey: ["trial-balance", currentTenant?.id, asOnDate],
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

  // Calculate totals
  const ledgersWithBalances = ledgers.map((ledger: any) => {
    const balance = ledger.current_balance || 0;
    const isDebit = ledger.balance_type === 'debit' || 
      ['assets', 'expenses'].includes(ledger.group?.nature) && balance >= 0;
    
    return {
      ...ledger,
      debit: isDebit ? Math.abs(balance) : 0,
      credit: !isDebit ? Math.abs(balance) : 0,
    };
  }).filter((l: any) => l.debit > 0 || l.credit > 0);

  const totalDebit = ledgersWithBalances.reduce((sum: number, l: any) => sum + l.debit, 0);
  const totalCredit = ledgersWithBalances.reduce((sum: number, l: any) => sum + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  // Group by nature
  const groupedLedgers = {
    assets: ledgersWithBalances.filter((l: any) => l.group?.nature === 'assets'),
    liabilities: ledgersWithBalances.filter((l: any) => l.group?.nature === 'liabilities'),
    capital: ledgersWithBalances.filter((l: any) => l.group?.nature === 'capital'),
    income: ledgersWithBalances.filter((l: any) => l.group?.nature === 'income'),
    expenses: ledgersWithBalances.filter((l: any) => l.group?.nature === 'expenses'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Trial Balance
          </h2>
          <p className="text-muted-foreground">Statement of all ledger balances</p>
        </div>
        <div className="flex items-center gap-4">
          {isBalanced ? (
            <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Balanced
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Not Balanced (Diff: ₹{Math.abs(totalDebit - totalCredit).toLocaleString("en-IN")})
            </Badge>
          )}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Particulars</TableHead>
                <TableHead>Group</TableHead>
                <TableHead className="text-right">Debit (₹)</TableHead>
                <TableHead className="text-right">Credit (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : ledgersWithBalances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No ledger accounts with balances found.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {Object.entries(groupedLedgers).map(([nature, ledgers]) => (
                    ledgers.length > 0 && (
                      <>
                        <TableRow className="bg-muted/30" key={nature}>
                          <TableCell colSpan={4} className="font-semibold capitalize">
                            {nature}
                          </TableCell>
                        </TableRow>
                        {ledgers.map((ledger: any) => (
                          <TableRow key={ledger.id}>
                            <TableCell className="pl-8">{ledger.name}</TableCell>
                            <TableCell className="text-muted-foreground">{ledger.group?.name || "-"}</TableCell>
                            <TableCell className="text-right font-mono">
                              {ledger.debit > 0 ? `₹${ledger.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {ledger.credit > 0 ? `₹${ledger.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )
                  ))}
                  <TableRow className="bg-muted/50 font-bold border-t-2">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
