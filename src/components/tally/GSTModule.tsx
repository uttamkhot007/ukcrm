import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Receipt, FileText, Download, Search, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { format, startOfMonth, endOfMonth } from "date-fns";

export function GSTModule() {
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState("gstr1");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch GST transactions
  const { data: gstTransactions = [], isLoading } = useQuery({
    queryKey: ["gst-transactions", currentTenant?.id, selectedMonth],
    queryFn: async () => {
      const startDate = startOfMonth(new Date(selectedMonth + "-01"));
      const endDate = endOfMonth(new Date(selectedMonth + "-01"));
      
      const { data, error } = await supabase
        .from("gst_transactions")
        .select("*, voucher:vouchers(*)")
        .eq("tenant_id", currentTenant?.id)
        .gte("transaction_date", format(startDate, "yyyy-MM-dd"))
        .lte("transaction_date", format(endDate, "yyyy-MM-dd"))
        .order("transaction_date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch HSN/SAC codes
  const { data: hsnCodes = [] } = useQuery({
    queryKey: ["hsn-codes", currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hsn_sac_master")
        .select("*")
        .eq("tenant_id", currentTenant?.id)
        .order("code");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Calculate GSTR-1 summary
  const gstr1Summary = {
    b2b: gstTransactions.filter(t => t.transaction_type === "sale" && t.gstin).reduce((sum, t) => sum + (t.taxable_value || 0), 0),
    b2c: gstTransactions.filter(t => t.transaction_type === "sale" && !t.gstin).reduce((sum, t) => sum + (t.taxable_value || 0), 0),
    exports: gstTransactions.filter(t => t.transaction_type === "export").reduce((sum, t) => sum + (t.taxable_value || 0), 0),
    totalTax: gstTransactions.filter(t => t.transaction_type === "sale").reduce((sum, t) => 
      sum + (t.cgst_amount || 0) + (t.sgst_amount || 0) + (t.igst_amount || 0), 0),
  };

  // Calculate GSTR-3B summary
  const gstr3bSummary = {
    outputTax: gstTransactions.filter(t => t.transaction_type === "sale").reduce((sum, t) => 
      sum + (t.cgst_amount || 0) + (t.sgst_amount || 0) + (t.igst_amount || 0), 0),
    inputTax: gstTransactions.filter(t => t.transaction_type === "purchase").reduce((sum, t) => 
      sum + (t.cgst_amount || 0) + (t.sgst_amount || 0) + (t.igst_amount || 0), 0),
    reverseCharge: gstTransactions.filter(t => t.reverse_charge).reduce((sum, t) => 
      sum + (t.cgst_amount || 0) + (t.sgst_amount || 0) + (t.igst_amount || 0), 0),
    netTax: 0,
  };
  gstr3bSummary.netTax = gstr3bSummary.outputTax - gstr3bSummary.inputTax + gstr3bSummary.reverseCharge;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const filteredTransactions = gstTransactions.filter(t =>
    t.gstin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.hsn_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            GST Module
          </h2>
          <p className="text-muted-foreground">GSTR-1, GSTR-3B, HSN codes, and tax reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40"
          />
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="gstr1">GSTR-1</TabsTrigger>
          <TabsTrigger value="gstr3b">GSTR-3B</TabsTrigger>
          <TabsTrigger value="hsn">HSN/SAC Master</TabsTrigger>
          <TabsTrigger value="reports">Tax Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="gstr1" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">B2B Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(gstr1Summary.b2b)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">B2C Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(gstr1Summary.b2c)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Exports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(gstr1Summary.exports)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tax</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{formatCurrency(gstr1Summary.totalTax)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Outward Supplies (B2B)</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search GSTIN/HSN..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Party GSTIN</TableHead>
                    <TableHead>HSN/SAC</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : filteredTransactions.filter(t => t.transaction_type === "sale" && t.gstin).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No B2B transactions found for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions
                      .filter(t => t.transaction_type === "sale" && t.gstin)
                      .map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{format(new Date(transaction.invoice_date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{transaction.invoice_number}</TableCell>
                          <TableCell className="font-mono text-sm">{transaction.gstin}</TableCell>
                          <TableCell>{transaction.hsn_code}</TableCell>
                          <TableCell className="text-right">{formatCurrency(transaction.taxable_value || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(transaction.cgst_amount || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(transaction.sgst_amount || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(transaction.igst_amount || 0)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency((transaction.taxable_value || 0) + (transaction.cgst_amount || 0) + (transaction.sgst_amount || 0) + (transaction.igst_amount || 0))}</TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gstr3b" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Output Tax Liability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(gstr3bSummary.outputTax)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Input Tax Credit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(gstr3bSummary.inputTax)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Reverse Charge</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(gstr3bSummary.reverseCharge)}</p>
              </CardContent>
            </Card>
            <Card className={gstr3bSummary.netTax >= 0 ? "border-destructive" : "border-green-500"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Tax Payable</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${gstr3bSummary.netTax >= 0 ? "text-destructive" : "text-green-600"}`}>
                  {formatCurrency(Math.abs(gstr3bSummary.netTax))}
                  {gstr3bSummary.netTax < 0 && " (Credit)"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>GSTR-3B Summary - {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">3.1 Details of Outward Supplies and Inward Supplies liable to Reverse Charge</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nature of Supplies</TableHead>
                        <TableHead className="text-right">Taxable Value</TableHead>
                        <TableHead className="text-right">IGST</TableHead>
                        <TableHead className="text-right">CGST</TableHead>
                        <TableHead className="text-right">SGST/UTGST</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Outward taxable supplies (other than zero rated, nil rated)</TableCell>
                        <TableCell className="text-right">{formatCurrency(gstr1Summary.b2b + gstr1Summary.b2c)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(gstTransactions.filter(t => t.transaction_type === "sale").reduce((s, t) => s + (t.igst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(gstTransactions.filter(t => t.transaction_type === "sale").reduce((s, t) => s + (t.cgst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(gstTransactions.filter(t => t.transaction_type === "sale").reduce((s, t) => s + (t.sgst_amount || 0), 0))}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Outward taxable supplies (zero rated)</TableCell>
                        <TableCell className="text-right">{formatCurrency(gstr1Summary.exports)}</TableCell>
                        <TableCell className="text-right">₹0.00</TableCell>
                        <TableCell className="text-right">₹0.00</TableCell>
                        <TableCell className="text-right">₹0.00</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">4. Eligible ITC</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Details</TableHead>
                        <TableHead className="text-right">IGST</TableHead>
                        <TableHead className="text-right">CGST</TableHead>
                        <TableHead className="text-right">SGST/UTGST</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>ITC Available</TableCell>
                        <TableCell className="text-right">{formatCurrency(gstTransactions.filter(t => t.transaction_type === "purchase").reduce((s, t) => s + (t.igst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(gstTransactions.filter(t => t.transaction_type === "purchase").reduce((s, t) => s + (t.cgst_amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(gstTransactions.filter(t => t.transaction_type === "purchase").reduce((s, t) => s + (t.sgst_amount || 0), 0))}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hsn" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>HSN/SAC Master</CardTitle>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add HSN/SAC
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">GST Rate (%)</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hsnCodes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No HSN/SAC codes configured. Add codes to classify your products/services.
                      </TableCell>
                    </TableRow>
                  ) : (
                    hsnCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono">{code.code}</TableCell>
                        <TableCell>
                          <Badge variant={code.hsn_type === "hsn" ? "default" : "secondary"}>
                            {code.hsn_type?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{code.description}</TableCell>
                        <TableCell className="text-right">{code.gst_rate}%</TableCell>
                        <TableCell className="text-center">
                          {code.is_active ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  HSN-wise Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Summary of outward supplies based on HSN/SAC codes</p>
                <Button variant="outline" className="mt-4">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  B2B Invoice Register
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Complete list of B2B invoices with GSTIN details</p>
                <Button variant="outline" className="mt-4">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  ITC Register
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Input Tax Credit claimed against purchases</p>
                <Button variant="outline" className="mt-4">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Tax Payment Challan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Generate GST payment challan for the period</p>
                <Button variant="outline" className="mt-4">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Challan
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
