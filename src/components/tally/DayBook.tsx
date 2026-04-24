import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileSpreadsheet, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export function DayBook() {
  const { currentTenant } = useTenant();
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["day-book", currentTenant?.id, fromDate, toDate],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("day_book_entries") as any)
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .gte("entry_date", fromDate)
        .lte("entry_date", toDate)
        .order("entry_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  const totalDebit = entries.reduce((sum: number, e: any) => sum + (e.debit_amount || 0), 0);
  const totalCredit = entries.reduce((sum: number, e: any) => sum + (e.credit_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Day Book
          </h2>
          <p className="text-muted-foreground">Daily transaction register</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
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
                <TableHead>Voucher Type</TableHead>
                <TableHead>Voucher No.</TableHead>
                <TableHead>Party Name</TableHead>
                <TableHead className="text-right">Debit (₹)</TableHead>
                <TableHead className="text-right">Credit (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No entries found for the selected period.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.entry_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.voucher_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{entry.voucher_number}</TableCell>
                    <TableCell>{entry.party_name || "-"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.debit_amount > 0 ? `₹${entry.debit_amount.toLocaleString("en-IN")}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.credit_amount > 0 ? `₹${entry.credit_amount.toLocaleString("en-IN")}` : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {entries.length > 0 && (
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell className="text-right font-mono">
                    ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ₹{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
