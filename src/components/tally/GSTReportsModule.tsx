import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, Download, Search, AlertCircle, CheckCircle, 
  ArrowUpDown, Calculator, BarChart3, FileCheck, RefreshCw, 
  IndianRupee, Scale, ArrowRight, Clock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export function GSTReportsModule() {
  const { currentTenant } = useTenant();
  const [activeReport, setActiveReport] = useState("gstr2a");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), "yyyy"));

  const startDate = startOfMonth(new Date(selectedMonth + "-01"));
  const endDate = endOfMonth(new Date(selectedMonth + "-01"));

  // Fetch all GST transactions for the period
  const { data: gstTransactions = [], isLoading } = useQuery({
    queryKey: ["gst-report-transactions", currentTenant?.id, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gst_transactions")
        .select("*, voucher:vouchers(*)")
        .eq("tenant_id", currentTenant?.id)
        .gte("invoice_date", format(startDate, "yyyy-MM-dd"))
        .lte("invoice_date", format(endDate, "yyyy-MM-dd"))
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch annual transactions for GSTR-9
  const { data: annualTransactions = [] } = useQuery({
    queryKey: ["gst-annual-transactions", currentTenant?.id, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gst_transactions")
        .select("*")
        .eq("tenant_id", currentTenant?.id)
       .gte("invoice_date", `${selectedYear}-04-01`)
       .lte("invoice_date", `${parseInt(selectedYear) + 1}-03-31`)
       .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id && activeReport === "gstr9",
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount);

  // GSTR-2A/2B calculations (Purchase side - ITC available)
  const purchaseTransactions = gstTransactions.filter(t => t.transaction_type === "purchase");
  const gstr2Summary = {
    b2b: purchaseTransactions.filter(t => t.gstin).reduce((sum, t) => sum + (t.taxable_value || 0), 0),
    totalIGST: purchaseTransactions.reduce((sum, t) => sum + (t.igst_amount || 0), 0),
    totalCGST: purchaseTransactions.reduce((sum, t) => sum + (t.cgst_amount || 0), 0),
    totalSGST: purchaseTransactions.reduce((sum, t) => sum + (t.sgst_amount || 0), 0),
    reverseCharge: purchaseTransactions.filter(t => t.reverse_charge).reduce((sum, t) => sum + (t.taxable_value || 0), 0),
    matched: purchaseTransactions.filter(t => t.gstin).length,
    unmatched: purchaseTransactions.filter(t => !t.gstin).length,
  };

  // Credit/Debit Note calculations
  const creditNotes = gstTransactions.filter(t => t.transaction_type === "credit_note" || t.transaction_type === "debit_note");

  // ITC Reconciliation
  const salesTax = gstTransactions.filter(t => t.transaction_type === "sale").reduce((s, t) => s + (t.cgst_amount || 0) + (t.sgst_amount || 0) + (t.igst_amount || 0), 0);
  const purchaseTax = purchaseTransactions.reduce((s, t) => s + (t.cgst_amount || 0) + (t.sgst_amount || 0) + (t.igst_amount || 0), 0);
  const rcmTax = purchaseTransactions.filter(t => t.reverse_charge).reduce((s, t) => s + (t.cgst_amount || 0) + (t.sgst_amount || 0) + (t.igst_amount || 0), 0);

  // HSN-wise summary
  const hsnSummary = gstTransactions.reduce((acc, t) => {
    const key = t.hsn_code || "Unclassified";
    if (!acc[key]) acc[key] = { hsn: key, taxableValue: 0, igst: 0, cgst: 0, sgst: 0, count: 0 };
    acc[key].taxableValue += t.taxable_value || 0;
    acc[key].igst += t.igst_amount || 0;
    acc[key].cgst += t.cgst_amount || 0;
    acc[key].sgst += t.sgst_amount || 0;
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { hsn: string; taxableValue: number; igst: number; cgst: number; sgst: number; count: number }>);

  // GSTR-9 Annual Summary
  const annualSalesTx = annualTransactions.filter(t => t.transaction_type === "sale");
  const annualPurchaseTx = annualTransactions.filter(t => t.transaction_type === "purchase");
  const annualSummary = {
    totalSales: annualSalesTx.reduce((s, t) => s + (t.taxable_value || 0), 0),
    totalPurchases: annualPurchaseTx.reduce((s, t) => s + (t.taxable_value || 0), 0),
    totalOutputTax: annualSalesTx.reduce((s, t) => s + (t.cgst_amount || 0) + (t.sgst_amount || 0) + (t.igst_amount || 0), 0),
    totalInputTax: annualPurchaseTx.reduce((s, t) => s + (t.cgst_amount || 0) + (t.sgst_amount || 0) + (t.igst_amount || 0), 0),
    b2bSales: annualSalesTx.filter(t => t.gstin).reduce((s, t) => s + (t.taxable_value || 0), 0),
    b2cSales: annualSalesTx.filter(t => !t.gstin).reduce((s, t) => s + (t.taxable_value || 0), 0),
    exportSales: annualTransactions.filter(t => t.transaction_type === "export").reduce((s, t) => s + (t.taxable_value || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            GST Reports & Returns
          </h2>
          <p className="text-muted-foreground">Comprehensive GST reporting — GSTR-2A/2B, GSTR-9, ITC Reconciliation & more</p>
        </div>
        <div className="flex items-center gap-2">
          {activeReport === "gstr9" ? (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...Array(5)].map((_, i) => {
                  const yr = (new Date().getFullYear() - i).toString();
                  return <SelectItem key={yr} value={yr}>FY {yr}-{(parseInt(yr) + 1).toString().slice(2)}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          ) : (
            <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-40" />
          )}
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>
      </div>

      <Tabs value={activeReport} onValueChange={setActiveReport}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="gstr2a" className="text-xs">GSTR-2A/2B</TabsTrigger>
          <TabsTrigger value="gstr9" className="text-xs">GSTR-9</TabsTrigger>
          <TabsTrigger value="itc-recon" className="text-xs">ITC Recon</TabsTrigger>
          <TabsTrigger value="credit-debit" className="text-xs">CR/DR Notes</TabsTrigger>
          <TabsTrigger value="hsn-summary" className="text-xs">HSN Summary</TabsTrigger>
          <TabsTrigger value="computation" className="text-xs">GST Computation</TabsTrigger>
        </TabsList>

        {/* GSTR-2A/2B - Purchase Register */}
        <TabsContent value="gstr2a" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">B2B Purchases</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatCurrency(gstr2Summary.b2b)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total ITC Available</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(gstr2Summary.totalCGST + gstr2Summary.totalSGST + gstr2Summary.totalIGST)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Reverse Charge</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatCurrency(gstr2Summary.reverseCharge)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Matching Status</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="default">{gstr2Summary.matched} Matched</Badge>
                  {gstr2Summary.unmatched > 0 && <Badge variant="destructive">{gstr2Summary.unmatched} Unmatched</Badge>}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inward Supplies from Registered Persons (GSTR-2A/2B)</CardTitle>
              <CardDescription>Auto-populated from supplier GSTR-1 filings</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Supplier GSTIN</TableHead>
                    <TableHead>HSN/SAC</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseTransactions.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No purchase transactions for this period</TableCell></TableRow>
                  ) : purchaseTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{format(new Date(t.invoice_date || t.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{t.invoice_number}</TableCell>
                      <TableCell className="font-mono text-sm">{t.gstin || "—"}</TableCell>
                      <TableCell>{t.hsn_code || "—"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(t.taxable_value || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(t.cgst_amount || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(t.sgst_amount || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(t.igst_amount || 0)}</TableCell>
                      <TableCell className="text-center">
                        {t.gstin ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <AlertCircle className="h-4 w-4 text-orange-500 mx-auto" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GSTR-9 Annual Return */}
        <TabsContent value="gstr9" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5" /> GSTR-9 Annual Return — FY {selectedYear}-{(parseInt(selectedYear) + 1).toString().slice(2)}</CardTitle>
              <CardDescription>Annual return summarizing all GST transactions for the financial year</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Part II - Outward Supplies */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2"><span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm">Part II</span> Details of Outward Supplies</h4>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Nature</TableHead><TableHead className="text-right">Taxable Value</TableHead><TableHead className="text-right">Tax Paid</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    <TableRow><TableCell>Supplies to registered persons (B2B)</TableCell><TableCell className="text-right">{formatCurrency(annualSummary.b2bSales)}</TableCell><TableCell className="text-right">{formatCurrency(annualSalesTx.filter(t => t.gstin).reduce((s, t) => s + (t.cgst_amount || 0) + (t.sgst_amount || 0) + (t.igst_amount || 0), 0))}</TableCell></TableRow>
                    <TableRow><TableCell>Supplies to unregistered persons (B2C)</TableCell><TableCell className="text-right">{formatCurrency(annualSummary.b2cSales)}</TableCell><TableCell className="text-right">{formatCurrency(annualSalesTx.filter(t => !t.gstin).reduce((s, t) => s + (t.cgst_amount || 0) + (t.sgst_amount || 0) + (t.igst_amount || 0), 0))}</TableCell></TableRow>
                    <TableRow><TableCell>Export supplies</TableCell><TableCell className="text-right">{formatCurrency(annualSummary.exportSales)}</TableCell><TableCell className="text-right">{formatCurrency(0)}</TableCell></TableRow>
                    <TableRow className="font-bold bg-muted/50"><TableCell>Total Outward Supplies</TableCell><TableCell className="text-right">{formatCurrency(annualSummary.totalSales)}</TableCell><TableCell className="text-right">{formatCurrency(annualSummary.totalOutputTax)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Part III - Inward Supplies */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2"><span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm">Part III</span> Details of Inward Supplies</h4>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Nature</TableHead><TableHead className="text-right">Taxable Value</TableHead><TableHead className="text-right">ITC Claimed</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    <TableRow><TableCell>Inward supplies from registered persons</TableCell><TableCell className="text-right">{formatCurrency(annualSummary.totalPurchases)}</TableCell><TableCell className="text-right">{formatCurrency(annualSummary.totalInputTax)}</TableCell></TableRow>
                    <TableRow className="font-bold bg-muted/50"><TableCell>Total Inward Supplies</TableCell><TableCell className="text-right">{formatCurrency(annualSummary.totalPurchases)}</TableCell><TableCell className="text-right">{formatCurrency(annualSummary.totalInputTax)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Part IV - Tax Paid */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2"><span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm">Part IV</span> Tax Paid & Payable</h4>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-destructive/5 border-destructive/20"><CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Output Tax</p><p className="text-xl font-bold text-destructive">{formatCurrency(annualSummary.totalOutputTax)}</p>
                  </CardContent></Card>
                  <Card className="bg-green-500/5 border-green-500/20"><CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Input Tax Credit</p><p className="text-xl font-bold text-green-600">{formatCurrency(annualSummary.totalInputTax)}</p>
                  </CardContent></Card>
                  <Card className="bg-primary/5 border-primary/20"><CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Net Tax Payable</p><p className="text-xl font-bold">{formatCurrency(Math.max(0, annualSummary.totalOutputTax - annualSummary.totalInputTax))}</p>
                  </CardContent></Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ITC Reconciliation */}
        <TabsContent value="itc-recon" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-destructive/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Output Tax Liability</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-destructive">{formatCurrency(salesTax)}</p></CardContent>
            </Card>
            <Card className="border-green-500/20">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">ITC Available (Books)</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(purchaseTax)}</p></CardContent>
            </Card>
            <Card className={`${salesTax - purchaseTax > 0 ? "border-destructive/20" : "border-green-500/20"}`}>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net Tax {salesTax - purchaseTax > 0 ? "Payable" : "Credit"}</CardTitle></CardHeader>
              <CardContent><p className={`text-2xl font-bold ${salesTax - purchaseTax > 0 ? "text-destructive" : "text-green-600"}`}>{formatCurrency(Math.abs(salesTax - purchaseTax))}</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" /> ITC Reconciliation Statement</CardTitle>
              <CardDescription>Reconciliation between ITC as per books vs ITC as per GSTR-2A/2B</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Particulars</TableHead><TableHead className="text-right">IGST</TableHead><TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST/UTGST</TableHead><TableHead className="text-right">Total</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">ITC as per Books (Purchase Register)</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseTransactions.reduce((s, t) => s + (t.igst_amount || 0), 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseTransactions.reduce((s, t) => s + (t.cgst_amount || 0), 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseTransactions.reduce((s, t) => s + (t.sgst_amount || 0), 0))}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(purchaseTax)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">ITC as per GSTR-2A/2B (Matched)</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseTransactions.filter(t => t.gstin).reduce((s, t) => s + (t.igst_amount || 0), 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseTransactions.filter(t => t.gstin).reduce((s, t) => s + (t.cgst_amount || 0), 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseTransactions.filter(t => t.gstin).reduce((s, t) => s + (t.sgst_amount || 0), 0))}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(purchaseTransactions.filter(t => t.gstin).reduce((s, t) => s + (t.cgst_amount || 0) + (t.sgst_amount || 0) + (t.igst_amount || 0), 0))}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Reverse Charge ITC</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseTransactions.filter(t => t.reverse_charge).reduce((s, t) => s + (t.igst_amount || 0), 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseTransactions.filter(t => t.reverse_charge).reduce((s, t) => s + (t.cgst_amount || 0), 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseTransactions.filter(t => t.reverse_charge).reduce((s, t) => s + (t.sgst_amount || 0), 0))}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(rcmTax)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Difference (Books vs GSTR-2A/2B)</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseTransactions.filter(t => !t.gstin).reduce((s, t) => s + (t.igst_amount || 0), 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseTransactions.filter(t => !t.gstin).reduce((s, t) => s + (t.cgst_amount || 0), 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseTransactions.filter(t => !t.gstin).reduce((s, t) => s + (t.sgst_amount || 0), 0))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseTransactions.filter(t => !t.gstin).reduce((s, t) => s + (t.cgst_amount || 0) + (t.sgst_amount || 0) + (t.igst_amount || 0), 0))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit/Debit Notes */}
        <TabsContent value="credit-debit" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Credit Notes Issued</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(creditNotes.filter(t => t.transaction_type === "credit_note").reduce((s, t) => s + (t.taxable_value || 0), 0))}</p><p className="text-xs text-muted-foreground mt-1">{creditNotes.filter(t => t.transaction_type === "credit_note").length} notes</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Debit Notes Issued</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-destructive">{formatCurrency(creditNotes.filter(t => t.transaction_type === "debit_note").reduce((s, t) => s + (t.taxable_value || 0), 0))}</p><p className="text-xs text-muted-foreground mt-1">{creditNotes.filter(t => t.transaction_type === "debit_note").length} notes</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Credit/Debit Note Register</CardTitle><CardDescription>All credit and debit notes issued during the period</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Note No.</TableHead><TableHead>Type</TableHead><TableHead>Party GSTIN</TableHead><TableHead>Original Invoice</TableHead><TableHead className="text-right">Taxable Value</TableHead><TableHead className="text-right">Tax Amount</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {creditNotes.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No credit/debit notes for this period</TableCell></TableRow>
                  ) : creditNotes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell>{format(new Date(note.invoice_date || note.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{note.invoice_number}</TableCell>
                      <TableCell><Badge variant={note.transaction_type === "credit_note" ? "default" : "destructive"}>{note.transaction_type === "credit_note" ? "Credit Note" : "Debit Note"}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{note.gstin || "—"}</TableCell>
                      <TableCell>{note.invoice_number || "—"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(note.taxable_value || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency((note.cgst_amount || 0) + (note.sgst_amount || 0) + (note.igst_amount || 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HSN-wise Summary */}
        <TabsContent value="hsn-summary" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>HSN-wise Summary of Outward Supplies</CardTitle><CardDescription>As required in GSTR-1 Table 12</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>HSN/SAC</TableHead><TableHead className="text-center">No. of Invoices</TableHead><TableHead className="text-right">Taxable Value</TableHead><TableHead className="text-right">IGST</TableHead><TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">Total Tax</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {Object.values(hsnSummary).length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions to summarize</TableCell></TableRow>
                  ) : Object.values(hsnSummary).sort((a, b) => b.taxableValue - a.taxableValue).map((item) => (
                    <TableRow key={item.hsn}>
                      <TableCell className="font-mono font-medium">{item.hsn}</TableCell>
                      <TableCell className="text-center">{item.count}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.taxableValue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.igst)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.cgst)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.sgst)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.igst + item.cgst + item.sgst)}</TableCell>
                    </TableRow>
                  ))}
                  {Object.values(hsnSummary).length > 0 && (
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-center">{Object.values(hsnSummary).reduce((s, i) => s + i.count, 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Object.values(hsnSummary).reduce((s, i) => s + i.taxableValue, 0))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Object.values(hsnSummary).reduce((s, i) => s + i.igst, 0))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Object.values(hsnSummary).reduce((s, i) => s + i.cgst, 0))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Object.values(hsnSummary).reduce((s, i) => s + i.sgst, 0))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Object.values(hsnSummary).reduce((s, i) => s + i.igst + i.cgst + i.sgst, 0))}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GST Computation */}
        <TabsContent value="computation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> GST Computation Report</CardTitle>
              <CardDescription>Month-wise computation of GST liability — {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">A. Output Tax Liability</h4>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Particulars</TableHead><TableHead className="text-right">IGST</TableHead><TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">Total</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>On Outward Supplies</TableCell>
                        <TableCell className="text-right">{formatCurrency(gstTransactions.filter(t => t.transaction_type === "sale").reduce((s, t) => s + (t.igst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(gstTransactions.filter(t => t.transaction_type === "sale").reduce((s, t) => s + (t.cgst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(gstTransactions.filter(t => t.transaction_type === "sale").reduce((s, t) => s + (t.sgst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(salesTax)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>On Reverse Charge</TableCell>
                        <TableCell className="text-right">{formatCurrency(purchaseTransactions.filter(t => t.reverse_charge).reduce((s, t) => s + (t.igst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(purchaseTransactions.filter(t => t.reverse_charge).reduce((s, t) => s + (t.cgst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(purchaseTransactions.filter(t => t.reverse_charge).reduce((s, t) => s + (t.sgst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(rcmTax)}</TableCell>
                      </TableRow>
                      <TableRow className="font-bold bg-destructive/5">
                        <TableCell>Total Output Tax (A)</TableCell>
                        <TableCell className="text-right">{formatCurrency(gstTransactions.filter(t => t.transaction_type === "sale").reduce((s, t) => s + (t.igst_amount || 0), 0) + purchaseTransactions.filter(t => t.reverse_charge).reduce((s, t) => s + (t.igst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(gstTransactions.filter(t => t.transaction_type === "sale").reduce((s, t) => s + (t.cgst_amount || 0), 0) + purchaseTransactions.filter(t => t.reverse_charge).reduce((s, t) => s + (t.cgst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(gstTransactions.filter(t => t.transaction_type === "sale").reduce((s, t) => s + (t.sgst_amount || 0), 0) + purchaseTransactions.filter(t => t.reverse_charge).reduce((s, t) => s + (t.sgst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(salesTax + rcmTax)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">B. Input Tax Credit</h4>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Particulars</TableHead><TableHead className="text-right">IGST</TableHead><TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">Total</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>ITC on Inputs & Input Services</TableCell>
                        <TableCell className="text-right">{formatCurrency(purchaseTransactions.reduce((s, t) => s + (t.igst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(purchaseTransactions.reduce((s, t) => s + (t.cgst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(purchaseTransactions.reduce((s, t) => s + (t.sgst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(purchaseTax)}</TableCell>
                      </TableRow>
                      <TableRow className="font-bold bg-green-500/5">
                        <TableCell>Total ITC (B)</TableCell>
                        <TableCell className="text-right">{formatCurrency(purchaseTransactions.reduce((s, t) => s + (t.igst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(purchaseTransactions.reduce((s, t) => s + (t.cgst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(purchaseTransactions.reduce((s, t) => s + (t.sgst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(purchaseTax)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="border rounded-lg p-4 bg-primary/5">
                  <h4 className="font-semibold mb-3">C. Net Tax Payable / (Refundable) = A - B</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">IGST</p><p className="text-lg font-bold">{formatCurrency(
                      gstTransactions.filter(t => t.transaction_type === "sale").reduce((s, t) => s + (t.igst_amount || 0), 0) + purchaseTransactions.filter(t => t.reverse_charge).reduce((s, t) => s + (t.igst_amount || 0), 0) - purchaseTransactions.reduce((s, t) => s + (t.igst_amount || 0), 0)
                    )}</p></CardContent></Card>
                    <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">CGST</p><p className="text-lg font-bold">{formatCurrency(
                      gstTransactions.filter(t => t.transaction_type === "sale").reduce((s, t) => s + (t.cgst_amount || 0), 0) + purchaseTransactions.filter(t => t.reverse_charge).reduce((s, t) => s + (t.cgst_amount || 0), 0) - purchaseTransactions.reduce((s, t) => s + (t.cgst_amount || 0), 0)
                    )}</p></CardContent></Card>
                    <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">SGST</p><p className="text-lg font-bold">{formatCurrency(
                      gstTransactions.filter(t => t.transaction_type === "sale").reduce((s, t) => s + (t.sgst_amount || 0), 0) + purchaseTransactions.filter(t => t.reverse_charge).reduce((s, t) => s + (t.sgst_amount || 0), 0) - purchaseTransactions.reduce((s, t) => s + (t.sgst_amount || 0), 0)
                    )}</p></CardContent></Card>
                    <Card className={`${salesTax + rcmTax - purchaseTax > 0 ? "border-destructive" : "border-green-500"}`}><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Net Total</p><p className={`text-lg font-bold ${salesTax + rcmTax - purchaseTax > 0 ? "text-destructive" : "text-green-600"}`}>{formatCurrency(Math.abs(salesTax + rcmTax - purchaseTax))}{salesTax + rcmTax - purchaseTax < 0 ? " (Credit)" : ""}</p></CardContent></Card>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
