import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Banknote, Download, TrendingUp, TrendingDown } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export function CashBook() {
  const { currentTenant } = useTenant();
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  // Fetch cash ledger and its transactions
  const { data: cashData, isLoading } = useQuery({
    queryKey: ["cash-book", currentTenant?.id, fromDate, toDate],
    queryFn: async () => {
      if (!currentTenant?.id) return { ledger: null, entries: [] };
      
      // Find cash ledger
      const { data: cashLedger } = await (supabase
        .from("ledger_accounts") as any)
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .ilike("name", "%cash%")
        .limit(1)
        .single();

      if (!cashLedger) return { ledger: null, entries: [] };

      // Fetch voucher entries for cash ledger
      const { data: entries, error } = await (supabase
        .from("voucher_entries") as any)
        .select(`
          *,
          voucher:vouchers(voucher_number, voucher_date, narration, voucher_type:voucher_types(name))
        `)
        .eq("ledger_id", cashLedger.id)
        .gte("voucher.voucher_date", fromDate)
        .lte("voucher.voucher_date", toDate)
        .order("created_at", { ascending: true });

      return { ledger: cashLedger, entries: entries || [] };
    },
    enabled: !!currentTenant?.id,
  });

  const entries = cashData?.entries || [];
  const openingBalance = cashData?.ledger?.opening_balance || 0;
  
  let runningBalance = openingBalance;
  const entriesWithBalance = entries.map((entry: any) => {
    runningBalance += (entry.debit_amount || 0) - (entry.credit_amount || 0);
    return { ...entry, balance: runningBalance };
  });

  const totalReceipts = entries.reduce((sum: number, e: any) => sum + (e.debit_amount || 0), 0);
  const totalPayments = entries.reduce((sum: number, e: any) => sum + (e.credit_amount || 0), 0);
  const closingBalance = openingBalance + totalReceipts - totalPayments;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6" />
            Cash Book
          </h2>
          <p className="text-muted-foreground">Cash receipts and payments register</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Banknote className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opening Balance</p>
                <p className="text-xl font-bold">₹{openingBalance.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-700 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Receipts</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">₹{totalReceipts.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-xl font-bold text-red-600">₹{totalPayments.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Banknote className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Closing Balance</p>
                <p className="text-xl font-bold">₹{closingBalance.toLocaleString("en-IN")}</p>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Voucher No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead className="text-right">Receipts (₹)</TableHead>
                <TableHead className="text-right">Payments (₹)</TableHead>
                <TableHead className="text-right">Balance (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/30">
                <TableCell colSpan={4}>Opening Balance</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right font-mono font-medium">
                  ₹{openingBalance.toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : entriesWithBalance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No cash transactions found for the selected period.
                  </TableCell>
                </TableRow>
              ) : (
                entriesWithBalance.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {entry.voucher?.voucher_date ? format(new Date(entry.voucher.voucher_date), "dd/MM/yyyy") : "-"}
                    </TableCell>
                    <TableCell className="font-mono">{entry.voucher?.voucher_number || "-"}</TableCell>
                    <TableCell>{entry.voucher?.voucher_type?.name || "-"}</TableCell>
                    <TableCell>{entry.voucher?.narration || "-"}</TableCell>
                    <TableCell className="text-right font-mono text-green-700 dark:text-green-400">
                      {entry.debit_amount > 0 ? `₹${entry.debit_amount.toLocaleString("en-IN")}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {entry.credit_amount > 0 ? `₹${entry.credit_amount.toLocaleString("en-IN")}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{entry.balance.toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={4}>Closing Balance</TableCell>
                <TableCell className="text-right font-mono text-green-700 dark:text-green-400">
                  ₹{totalReceipts.toLocaleString("en-IN")}
                </TableCell>
                <TableCell className="text-right font-mono text-red-600">
                  ₹{totalPayments.toLocaleString("en-IN")}
                </TableCell>
                <TableCell className="text-right font-mono">
                  ₹{closingBalance.toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
