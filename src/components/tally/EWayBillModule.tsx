import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
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
import { Truck, Plus, Download, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, MapPin } from "lucide-react";
import { format, addDays, isBefore } from "date-fns";
import { toast } from "sonner";

export function EWayBillModule() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    doc_type: "INV",
    doc_number: "",
    doc_date: format(new Date(), "yyyy-MM-dd"),
    from_gstin: "",
    from_name: "",
    from_address: "",
    from_place: "",
    from_state_code: "",
    from_pincode: "",
    to_gstin: "",
    to_name: "",
    to_address: "",
    to_place: "",
    to_state_code: "",
    to_pincode: "",
    transporter_id: "",
    transporter_name: "",
    trans_mode: "road",
    vehicle_number: "",
    vehicle_type: "regular",
    distance_km: 0,
    total_value: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0
  });

  // Fetch e-way bills
  const { data: ewayBills = [], isLoading } = useQuery({
    queryKey: ["eway-bills", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("eway_bills") as any)
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Generate e-way bill mutation
  const generateEWayBill = useMutation({
    mutationFn: async () => {
      const ewayBillNumber = `EWB${Date.now()}`;
      const validityDays = formData.distance_km <= 100 ? 1 : Math.ceil(formData.distance_km / 100);
      
      const { data, error } = await (supabase
        .from("eway_bills") as any)
        .insert({
          tenant_id: currentTenant?.id,
          eway_bill_number: ewayBillNumber,
          eway_bill_date: new Date().toISOString(),
          valid_until: addDays(new Date(), validityDays).toISOString(),
          ...formData,
          status: "active"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eway-bills"] });
      toast.success("E-Way Bill generated successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to generate E-Way Bill");
      console.error(error);
    }
  });

  // Extend e-way bill mutation
  const extendEWayBill = useMutation({
    mutationFn: async (id: string) => {
      const bill = ewayBills.find((b: any) => b.id === id);
      const newValidUntil = addDays(new Date(bill.valid_until), 1);
      
      const { data, error } = await (supabase
        .from("eway_bills") as any)
        .update({
          valid_until: newValidUntil.toISOString(),
          extended_times: (bill.extended_times || 0) + 1,
          status: "extended"
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eway-bills"] });
      toast.success("E-Way Bill extended");
    }
  });

  // Cancel e-way bill mutation
  const cancelEWayBill = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase
        .from("eway_bills") as any)
        .update({ status: "cancelled" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eway-bills"] });
      toast.success("E-Way Bill cancelled");
    }
  });

  const resetForm = () => {
    setFormData({
      doc_type: "INV",
      doc_number: "",
      doc_date: format(new Date(), "yyyy-MM-dd"),
      from_gstin: "",
      from_name: "",
      from_address: "",
      from_place: "",
      from_state_code: "",
      from_pincode: "",
      to_gstin: "",
      to_name: "",
      to_address: "",
      to_place: "",
      to_state_code: "",
      to_pincode: "",
      transporter_id: "",
      transporter_name: "",
      trans_mode: "road",
      vehicle_number: "",
      vehicle_type: "regular",
      distance_km: 0,
      total_value: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0
    });
  };

  const getStatusBadge = (bill: any) => {
    const isExpired = isBefore(new Date(bill.valid_until), new Date());
    if (bill.status === "cancelled") {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
    }
    if (isExpired) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    if (bill.status === "extended") {
      return <Badge className="bg-orange-500"><RefreshCw className="h-3 w-3 mr-1" />Extended</Badge>;
    }
    return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
  };

  const stats = {
    total: ewayBills.length,
    active: ewayBills.filter((b: any) => b.status === "active" && !isBefore(new Date(b.valid_until), new Date())).length,
    expired: ewayBills.filter((b: any) => isBefore(new Date(b.valid_until), new Date()) && b.status !== "cancelled").length,
    cancelled: ewayBills.filter((b: any) => b.status === "cancelled").length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            E-Way Bill
          </h2>
          <p className="text-muted-foreground">Generate and manage E-Way Bills for goods transport</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["eway-bills"] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New E-Way Bill
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total E-Way Bills</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Active</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Expired</div>
            <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Cancelled</div>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* E-Way Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle>E-Way Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-Way Bill No.</TableHead>
                <TableHead>Doc No.</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Value (₹)</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : ewayBills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No E-Way Bills found. Create your first one.
                  </TableCell>
                </TableRow>
              ) : (
                ewayBills.map((bill: any) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-mono">{bill.eway_bill_number}</TableCell>
                    <TableCell>{bill.doc_number || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="text-sm">{bill.from_place || bill.from_name || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="text-sm">{bill.to_place || bill.to_name || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{bill.vehicle_number || "-"}</TableCell>
                    <TableCell className="font-mono">₹{bill.total_value?.toLocaleString("en-IN")}</TableCell>
                    <TableCell>{format(new Date(bill.valid_until), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell>{getStatusBadge(bill)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        {bill.status === "active" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => extendEWayBill.mutate(bill.id)}
                              disabled={bill.extended_times >= 2}
                              title={bill.extended_times >= 2 ? "Max extensions reached" : "Extend validity"}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => cancelEWayBill.mutate(bill.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
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

      {/* New E-Way Bill Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate New E-Way Bill</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Document Details */}
            <div className="space-y-4">
              <h3 className="font-semibold">Document Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Document Type</Label>
                  <Select value={formData.doc_type} onValueChange={(v) => setFormData({ ...formData, doc_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INV">Invoice</SelectItem>
                      <SelectItem value="CHL">Challan</SelectItem>
                      <SelectItem value="BIL">Bill of Supply</SelectItem>
                      <SelectItem value="BOE">Bill of Entry</SelectItem>
                      <SelectItem value="OTH">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Document Number</Label>
                  <Input value={formData.doc_number} onChange={(e) => setFormData({ ...formData, doc_number: e.target.value })} />
                </div>
                <div>
                  <Label>Document Date</Label>
                  <Input type="date" value={formData.doc_date} onChange={(e) => setFormData({ ...formData, doc_date: e.target.value })} />
                </div>
                <div>
                  <Label>Total Value (₹)</Label>
                  <Input type="number" value={formData.total_value} onChange={(e) => setFormData({ ...formData, total_value: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            </div>

            {/* Transport Details */}
            <div className="space-y-4">
              <h3 className="font-semibold">Transport Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Transport Mode</Label>
                  <Select value={formData.trans_mode} onValueChange={(v) => setFormData({ ...formData, trans_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="road">Road</SelectItem>
                      <SelectItem value="rail">Rail</SelectItem>
                      <SelectItem value="air">Air</SelectItem>
                      <SelectItem value="ship">Ship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vehicle Number</Label>
                  <Input value={formData.vehicle_number} onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value.toUpperCase() })} placeholder="MH01AB1234" />
                </div>
                <div>
                  <Label>Transporter Name</Label>
                  <Input value={formData.transporter_name} onChange={(e) => setFormData({ ...formData, transporter_name: e.target.value })} />
                </div>
                <div>
                  <Label>Distance (KM)</Label>
                  <Input type="number" value={formData.distance_km} onChange={(e) => setFormData({ ...formData, distance_km: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>

            {/* From Address */}
            <div className="space-y-4">
              <h3 className="font-semibold">From (Consignor)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>GSTIN</Label>
                  <Input value={formData.from_gstin} onChange={(e) => setFormData({ ...formData, from_gstin: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={formData.from_name} onChange={(e) => setFormData({ ...formData, from_name: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input value={formData.from_address} onChange={(e) => setFormData({ ...formData, from_address: e.target.value })} />
                </div>
                <div>
                  <Label>Place</Label>
                  <Input value={formData.from_place} onChange={(e) => setFormData({ ...formData, from_place: e.target.value })} />
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input value={formData.from_pincode} onChange={(e) => setFormData({ ...formData, from_pincode: e.target.value })} />
                </div>
              </div>
            </div>

            {/* To Address */}
            <div className="space-y-4">
              <h3 className="font-semibold">To (Consignee)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>GSTIN</Label>
                  <Input value={formData.to_gstin} onChange={(e) => setFormData({ ...formData, to_gstin: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={formData.to_name} onChange={(e) => setFormData({ ...formData, to_name: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input value={formData.to_address} onChange={(e) => setFormData({ ...formData, to_address: e.target.value })} />
                </div>
                <div>
                  <Label>Place</Label>
                  <Input value={formData.to_place} onChange={(e) => setFormData({ ...formData, to_place: e.target.value })} />
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input value={formData.to_pincode} onChange={(e) => setFormData({ ...formData, to_pincode: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => generateEWayBill.mutate()} disabled={generateEWayBill.isPending}>
              {generateEWayBill.isPending ? "Generating..." : "Generate E-Way Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
