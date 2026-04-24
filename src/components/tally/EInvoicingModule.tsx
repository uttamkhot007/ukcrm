import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, QrCode, Download, RefreshCw, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function EInvoicingModule() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Fetch e-invoices
  const { data: eInvoices = [], isLoading } = useQuery({
    queryKey: ["e-invoices", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("e_invoices") as any)
        .select(`
          *,
          invoice:invoices(*)
        `)
        .eq("tenant_id", currentTenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch pending invoices (not yet e-invoiced)
  const { data: pendingInvoices = [] } = useQuery({
    queryKey: ["pending-e-invoices", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data: invoices, error } = await (supabase
        .from("invoices") as any)
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .in("status", ["sent", "paid"])
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Filter out invoices that already have e-invoices
      const eInvoiceIds = eInvoices.map((e: any) => e.invoice_id);
      return (invoices || []).filter((inv: any) => !eInvoiceIds.includes(inv.id));
    },
    enabled: !!currentTenant?.id && eInvoices.length >= 0,
  });

  // Generate e-invoice mutation
  const generateEInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      // Simulate e-invoice generation (in real implementation, call GST API)
      const irn = `IRN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const ackNumber = `ACK${Date.now()}`;
      
      const { data, error } = await (supabase
        .from("e_invoices") as any)
        .insert({
          tenant_id: currentTenant?.id,
          invoice_id: invoiceId,
          irn,
          ack_number: ackNumber,
          ack_date: new Date().toISOString(),
          qr_code: `QR_${irn}`, // Placeholder for actual QR code
          status: "generated"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["e-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["pending-e-invoices"] });
      toast.success("E-Invoice generated successfully");
    },
    onError: (error) => {
      toast.error("Failed to generate e-invoice");
      console.error(error);
    }
  });

  // Cancel e-invoice mutation
  const cancelEInvoice = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await (supabase
        .from("e_invoices") as any)
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["e-invoices"] });
      toast.success("E-Invoice cancelled");
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "generated":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Generated</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredEInvoices = eInvoices.filter((einv: any) =>
    einv.irn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    einv.invoice?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: eInvoices.length,
    generated: eInvoices.filter((e: any) => e.status === "generated").length,
    cancelled: eInvoices.filter((e: any) => e.status === "cancelled").length,
    pending: pendingInvoices.length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            E-Invoicing (IRN)
          </h2>
          <p className="text-muted-foreground">GST E-Invoice generation and management</p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["e-invoices"] })}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total E-Invoices</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Generated</div>
            <div className="text-2xl font-bold text-green-600">{stats.generated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Cancelled</div>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Pending Generation</div>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="generated">
        <TabsList>
          <TabsTrigger value="generated">Generated E-Invoices</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
        </TabsList>

        <TabsContent value="generated">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by IRN or Invoice Number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>IRN</TableHead>
                    <TableHead>Ack No.</TableHead>
                    <TableHead>Ack Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : filteredEInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No e-invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEInvoices.map((einv: any) => (
                      <TableRow key={einv.id}>
                        <TableCell className="font-mono">{einv.invoice?.invoice_number || "-"}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate" title={einv.irn}>
                          {einv.irn}
                        </TableCell>
                        <TableCell className="font-mono">{einv.ack_number}</TableCell>
                        <TableCell>{einv.ack_date ? format(new Date(einv.ack_date), "dd/MM/yyyy HH:mm") : "-"}</TableCell>
                        <TableCell>{getStatusBadge(einv.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(einv)}>
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            {einv.status === "generated" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                                onClick={() => cancelEInvoice.mutate({ id: einv.id, reason: "User requested cancellation" })}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Invoices Pending E-Invoice Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        All invoices have e-invoices generated
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingInvoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                        <TableCell>{format(new Date(inv.invoice_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-mono">₹{inv.total_amount?.toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{inv.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => generateEInvoice.mutate(inv.id)}
                            disabled={generateEInvoice.isPending}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Generate IRN
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>E-Invoice QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 p-4">
            <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
              <QrCode className="h-32 w-32 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-mono text-sm break-all">{selectedInvoice?.irn}</p>
              <p className="text-sm text-muted-foreground">
                Ack No: {selectedInvoice?.ack_number}
              </p>
            </div>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
