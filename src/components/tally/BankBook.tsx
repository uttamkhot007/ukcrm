import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Building2, Download, TrendingUp, TrendingDown } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export function BankBook() {
  const { currentTenant } = useTenant();
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedBank, setSelectedBank] = useState<string>("");

  // Fetch bank ledgers
  const { data: bankLedgers = [] } = useQuery({
    queryKey: ["bank-ledgers", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("ledger_accounts") as any)
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .eq("is_bank_account", true)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch bank transactions
  const { data: bankData, isLoading } = useQuery({
    queryKey: ["bank-book", currentTenant?.id, selectedBank, fromDate, toDate],
    queryFn: async () => {
      if (!currentTenant?.id || !selectedBank) return { ledger: null, entries: [] };
      
      const bankLedger = bankLedgers.find((b: any) => b.id === selectedBank);
      if (!bankLedger) return { ledger: null, entries: [] };

      const { data: entries, error } = await (supabase
        .from("voucher_entries") as any)
        .select(`
          *,
          voucher:vouchers(voucher_number, voucher_date, narration, reference_number, voucher_type:voucher_types(name))
        `)
        .eq("ledger_id", selectedBank)
        .order("created_at", { ascending: true });

      const filteredEntries = (entries || []).filter((e: any) => {
        if (!e.voucher?.voucher_date) return false;
        const date = e.voucher.voucher_date;
        return date >= fromDate && date <= toDate;
      });

      return { ledger: bankLedger, entries: filteredEntries };
    },
    enabled: !!currentTenant?.id && !!selectedBank,
  });

  const entries = bankData?.entries || [];
  const openingBalance = bankData?.ledger?.opening_balance || 0;
  
  let runningBalance = openingBalance;
  const entriesWithBalance = entries.map((entry: any) => {
    runningBalance += (entry.debit_amount || 0) - (entry.credit_amount || 0);
    return { ...entry, balance: runningBalance };
  });

  const totalDeposits = entries.reduce((sum: number, e: any) => sum + (e.debit_amount || 0), 0);
  const totalWithdrawals = entries.reduce((sum: number, e: any) => sum + (e.credit_amount || 0), 0);
  const closingBalance = openingBalance + totalDeposits - totalWithdrawals;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Bank Book
          </h2>
          <p className="text-muted-foreground">Bank transactions register</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {selectedBank && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
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
                  <p className="text-sm text-muted-foreground">Total Deposits</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">₹{totalDeposits.toLocaleString("en-IN")}</p>
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
                  <p className="text-sm text-muted-foreground">Total Withdrawals</p>
                  <p className="text-xl font-bold text-red-600">₹{totalWithdrawals.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Closing Balance</p>
                  <p className="text-xl font-bold">₹{closingBalance.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label>Bank Account</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankLedgers.map((bank: any) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name} {bank.bank_account_number ? `(${bank.bank_account_number})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          {!selectedBank ? (
            <p className="text-center py-8 text-muted-foreground">
              Select a bank account to view transactions.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Voucher No.</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cheque/Ref No.</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead className="text-right">Deposits (₹)</TableHead>
                  <TableHead className="text-right">Withdrawals (₹)</TableHead>
                  <TableHead className="text-right">Balance (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={5}>Opening Balance</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    ₹{openingBalance.toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : entriesWithBalance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No bank transactions found for the selected period.
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
                      <TableCell>{entry.voucher?.reference_number || "-"}</TableCell>
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
                  <TableCell colSpan={5}>Closing Balance</TableCell>
                  <TableCell className="text-right font-mono text-green-700 dark:text-green-400">
                    ₹{totalDeposits.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600">
                    ₹{totalWithdrawals.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ₹{closingBalance.toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
