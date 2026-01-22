import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Plus, Download, FileText, IndianRupee, Percent } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

const TDS_SECTIONS = [
  { code: "194A", description: "Interest other than interest on securities", rate: 10 },
  { code: "194C", description: "Payment to Contractors", rate: 1 },
  { code: "194H", description: "Commission or Brokerage", rate: 5 },
  { code: "194I", description: "Rent", rate: 10 },
  { code: "194J", description: "Professional/Technical Services", rate: 10 },
  { code: "194Q", description: "Purchase of Goods", rate: 0.1 },
];

const TCS_SECTIONS = [
  { code: "206C(1)", description: "Sale of Scrap", rate: 1 },
  { code: "206C(1H)", description: "Sale of Goods", rate: 0.1 },
  { code: "206C(1G)", description: "Foreign Remittance", rate: 5 },
];

export function TDSTCSModule() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("tds");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  
  const [formData, setFormData] = useState({
    transaction_type: "tds",
    section_code: "",
    section_description: "",
    deductee_pan: "",
    deductee_name: "",
    deductee_type: "individual",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
    gross_amount: 0,
    tax_rate: 0,
    tax_amount: 0,
    notes: ""
  });

  // Fetch TDS/TCS transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["tds-tcs-transactions", currentTenant?.id, activeTab, fromDate, toDate],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("tds_tcs_transactions") as any)
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .eq("transaction_type", activeTab)
        .gte("transaction_date", fromDate)
        .lte("transaction_date", toDate)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Calculate tax amount when gross amount or rate changes
  const calculateTax = (grossAmount: number, rate: number) => {
    return (grossAmount * rate) / 100;
  };

  // Add transaction mutation
  const addTransaction = useMutation({
    mutationFn: async () => {
      const taxAmount = calculateTax(formData.gross_amount, formData.tax_rate);
      
      const { data, error } = await (supabase
        .from("tds_tcs_transactions") as any)
        .insert({
          tenant_id: currentTenant?.id,
          ...formData,
          tax_amount: taxAmount,
          total_tax: taxAmount,
          status: "pending"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tds-tcs-transactions"] });
      toast.success(`${activeTab.toUpperCase()} entry added successfully`);
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to add ${activeTab.toUpperCase()} entry`);
      console.error(error);
    }
  });

  const resetForm = () => {
    setFormData({
      transaction_type: activeTab,
      section_code: "",
      section_description: "",
      deductee_pan: "",
      deductee_name: "",
      deductee_type: "individual",
      transaction_date: format(new Date(), "yyyy-MM-dd"),
      gross_amount: 0,
      tax_rate: 0,
      tax_amount: 0,
      notes: ""
    });
  };

  const handleSectionChange = (code: string) => {
    const sections = activeTab === "tds" ? TDS_SECTIONS : TCS_SECTIONS;
    const section = sections.find(s => s.code === code);
    if (section) {
      setFormData({
        ...formData,
        section_code: section.code,
        section_description: section.description,
        tax_rate: section.rate
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "paid":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "filed":
        return <Badge className="bg-blue-500">Filed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totals = {
    grossAmount: transactions.reduce((sum: number, t: any) => sum + (t.gross_amount || 0), 0),
    taxAmount: transactions.reduce((sum: number, t: any) => sum + (t.tax_amount || 0), 0),
    pending: transactions.filter((t: any) => t.status === "pending").length,
    paid: transactions.filter((t: any) => t.status === "paid").length
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            TDS / TCS Management
          </h2>
          <p className="text-muted-foreground">Tax Deducted at Source & Tax Collected at Source</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Gross Amount</div>
            <div className="text-2xl font-bold">{formatCurrency(totals.grossAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Tax Deducted/Collected</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totals.taxAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Pending Payment</div>
            <div className="text-2xl font-bold text-orange-600">{totals.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Paid</div>
            <div className="text-2xl font-bold text-green-600">{totals.paid}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tds">TDS (Tax Deducted at Source)</TabsTrigger>
          <TabsTrigger value="tcs">TCS (Tax Collected at Source)</TabsTrigger>
          <TabsTrigger value="rates">Rate Master</TabsTrigger>
        </TabsList>

        <TabsContent value="tds">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>From</Label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <Label>To</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Deductee</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead className="text-right">Gross (₹)</TableHead>
                    <TableHead className="text-right">Rate %</TableHead>
                    <TableHead className="text-right">TDS (₹)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No TDS entries found for the selected period
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((txn: any) => (
                      <TableRow key={txn.id}>
                        <TableCell>{format(new Date(txn.transaction_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{txn.section_code}</Badge>
                        </TableCell>
                        <TableCell>{txn.deductee_name}</TableCell>
                        <TableCell className="font-mono">{txn.deductee_pan || "-"}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(txn.gross_amount)}</TableCell>
                        <TableCell className="text-right font-mono">{txn.tax_rate}%</TableCell>
                        <TableCell className="text-right font-mono text-primary">{formatCurrency(txn.tax_amount)}</TableCell>
                        <TableCell>{getStatusBadge(txn.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  {transactions.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(totals.grossAmount)}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-mono text-primary">{formatCurrency(totals.taxAmount)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tcs">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>From</Label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <Label>To</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Collectee</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                    <TableHead className="text-right">Rate %</TableHead>
                    <TableHead className="text-right">TCS (₹)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No TCS entries found for the selected period
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((txn: any) => (
                      <TableRow key={txn.id}>
                        <TableCell>{format(new Date(txn.transaction_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{txn.section_code}</Badge>
                        </TableCell>
                        <TableCell>{txn.deductee_name}</TableCell>
                        <TableCell className="font-mono">{txn.deductee_pan || "-"}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(txn.gross_amount)}</TableCell>
                        <TableCell className="text-right font-mono">{txn.tax_rate}%</TableCell>
                        <TableCell className="text-right font-mono text-primary">{formatCurrency(txn.tax_amount)}</TableCell>
                        <TableCell>{getStatusBadge(txn.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>TDS Rate Chart (FY 2024-25)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section</TableHead>
                      <TableHead>Nature of Payment</TableHead>
                      <TableHead className="text-right">Rate %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TDS_SECTIONS.map((section) => (
                      <TableRow key={section.code}>
                        <TableCell className="font-mono">{section.code}</TableCell>
                        <TableCell>{section.description}</TableCell>
                        <TableCell className="text-right font-mono">{section.rate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>TCS Rate Chart (FY 2024-25)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section</TableHead>
                      <TableHead>Nature of Collection</TableHead>
                      <TableHead className="text-right">Rate %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TCS_SECTIONS.map((section) => (
                      <TableRow key={section.code}>
                        <TableCell className="font-mono">{section.code}</TableCell>
                        <TableCell>{section.description}</TableCell>
                        <TableCell className="text-right font-mono">{section.rate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Entry Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New {activeTab.toUpperCase()} Entry</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Section</Label>
              <Select value={formData.section_code} onValueChange={handleSectionChange}>
                <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                <SelectContent>
                  {(activeTab === "tds" ? TDS_SECTIONS : TCS_SECTIONS).map((section) => (
                    <SelectItem key={section.code} value={section.code}>
                      {section.code} - {section.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction Date</Label>
              <Input
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              />
            </div>
            <div>
              <Label>{activeTab === "tds" ? "Deductee" : "Collectee"} Name</Label>
              <Input
                value={formData.deductee_name}
                onChange={(e) => setFormData({ ...formData, deductee_name: e.target.value })}
              />
            </div>
            <div>
              <Label>PAN</Label>
              <Input
                value={formData.deductee_pan}
                onChange={(e) => setFormData({ ...formData, deductee_pan: e.target.value.toUpperCase() })}
                placeholder="AAAAA0000A"
                maxLength={10}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={formData.deductee_type} onValueChange={(v) => setFormData({ ...formData, deductee_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="firm">Firm</SelectItem>
                  <SelectItem value="huf">HUF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gross Amount (₹)</Label>
              <Input
                type="number"
                value={formData.gross_amount}
                onChange={(e) => setFormData({ ...formData, gross_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                step="0.1"
              />
            </div>
            <div>
              <Label>Tax Amount (₹)</Label>
              <Input
                value={formatCurrency(calculateTax(formData.gross_amount, formData.tax_rate))}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => addTransaction.mutate()} disabled={addTransaction.isPending || !formData.section_code || !formData.deductee_name}>
              {addTransaction.isPending ? "Saving..." : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
