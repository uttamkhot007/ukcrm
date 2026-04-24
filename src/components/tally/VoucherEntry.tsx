import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, Trash2, Calculator, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface VoucherEntry {
  id?: string;
  ledger_id: string;
  ledger_name?: string;
  debit_amount: number;
  credit_amount: number;
  narration?: string;
}

export function VoucherEntry() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVoucherType, setSelectedVoucherType] = useState<string>("");
  const [voucherDate, setVoucherDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [narration, setNarration] = useState("");
  const [entries, setEntries] = useState<VoucherEntry[]>([
    { ledger_id: "", debit_amount: 0, credit_amount: 0 },
    { ledger_id: "", debit_amount: 0, credit_amount: 0 },
  ]);

  // Fetch voucher types
  const { data: voucherTypes = [] } = useQuery({
    queryKey: ["voucher-types", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("voucher_types") as any)
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch ledger accounts
  const { data: ledgers = [] } = useQuery({
    queryKey: ["ledger-accounts-for-voucher", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("ledger_accounts") as any)
        .select("id, name, account_code, current_balance")
        .eq("tenant_id", currentTenant.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Fetch recent vouchers
  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ["vouchers", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await (supabase
        .from("vouchers") as any)
        .select("*, voucher_type:voucher_types(name, voucher_class), party_ledger:ledger_accounts(name)")
        .eq("tenant_id", currentTenant.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenant?.id,
  });

  // Create voucher mutation
  const createVoucherMutation = useMutation({
    mutationFn: async () => {
      // Validate entries
      const validEntries = entries.filter(e => e.ledger_id && (e.debit_amount > 0 || e.credit_amount > 0));
      if (validEntries.length < 2) {
        throw new Error("At least 2 entries are required");
      }

      const totalDebit = validEntries.reduce((sum, e) => sum + e.debit_amount, 0);
      const totalCredit = validEntries.reduce((sum, e) => sum + e.credit_amount, 0);
      
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error("Debits and Credits must be equal");
      }

      // Create voucher
      const { data: voucher, error: voucherError } = await (supabase
        .from("vouchers") as any)
        .insert({
          tenant_id: currentTenant?.id,
          voucher_type_id: selectedVoucherType,
          voucher_date: voucherDate,
          amount: totalDebit,
          narration,
          created_by: user?.id,
          is_posted: true,
        })
        .select()
        .single();

      if (voucherError) throw voucherError;

      // Create voucher entries
      const entryRows = validEntries.map((e, idx) => ({
        voucher_id: voucher.id,
        ledger_id: e.ledger_id,
        debit_amount: e.debit_amount,
        credit_amount: e.credit_amount,
        narration: e.narration,
        entry_order: idx,
      }));

      const { error: entriesError } = await (supabase
        .from("voucher_entries") as any)
        .insert(entryRows);

      if (entriesError) throw entriesError;

      return voucher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-accounts"] });
      toast.success("Voucher created successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetForm = () => {
    setSelectedVoucherType("");
    setVoucherDate(format(new Date(), "yyyy-MM-dd"));
    setNarration("");
    setEntries([
      { ledger_id: "", debit_amount: 0, credit_amount: 0 },
      { ledger_id: "", debit_amount: 0, credit_amount: 0 },
    ]);
  };

  const addEntry = () => {
    setEntries([...entries, { ledger_id: "", debit_amount: 0, credit_amount: 0 }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof VoucherEntry, value: any) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const totalDebit = entries.reduce((sum, e) => sum + (e.debit_amount || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.credit_amount || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const voucherClassColors: Record<string, string> = {
    payment: "bg-red-100 text-red-800",
    receipt: "bg-green-100 text-green-800",
    contra: "bg-blue-100 text-blue-800",
    journal: "bg-purple-100 text-purple-800",
    sales: "bg-emerald-100 text-emerald-800",
    purchase: "bg-orange-100 text-orange-800",
    debit_note: "bg-pink-100 text-pink-800",
    credit_note: "bg-cyan-100 text-cyan-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Voucher Entry</h2>
          <p className="text-muted-foreground">Create and manage accounting vouchers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Voucher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Voucher</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Voucher Type</Label>
                  <Select value={selectedVoucherType} onValueChange={setSelectedVoucherType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {voucherTypes.map((vt: any) => (
                        <SelectItem key={vt.id} value={vt.id}>
                          {vt.name} ({vt.voucher_class})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reference Number</Label>
                  <Input placeholder="Optional reference" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Entries</Label>
                  <Button variant="outline" size="sm" onClick={addEntry}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Ledger Account</TableHead>
                      <TableHead className="text-right">Debit (₹)</TableHead>
                      <TableHead className="text-right">Credit (₹)</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select 
                            value={entry.ledger_id} 
                            onValueChange={(v) => updateEntry(index, "ledger_id", v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select ledger" />
                            </SelectTrigger>
                            <SelectContent>
                              {ledgers.map((l: any) => (
                                <SelectItem key={l.id} value={l.id}>
                                  {l.account_code ? `${l.account_code} - ` : ""}{l.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="text-right"
                            value={entry.debit_amount || ""}
                            onChange={(e) => updateEntry(index, "debit_amount", parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="text-right"
                            value={entry.credit_amount || ""}
                            onChange={(e) => updateEntry(index, "credit_amount", parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeEntry(index)}
                            disabled={entries.length <= 2}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {isBalanced ? (
                          <Badge variant="default" className="bg-green-500">Balanced</Badge>
                        ) : (
                          <Badge variant="destructive">Unbalanced</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2">
                <Label>Narration</Label>
                <Textarea 
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="Enter narration for this voucher..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createVoucherMutation.mutate()}
                  disabled={!isBalanced || !selectedVoucherType || createVoucherMutation.isPending}
                >
                  {createVoucherMutation.isPending ? "Saving..." : "Save Voucher"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Vouchers</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="receipt">Receipt</TabsTrigger>
          <TabsTrigger value="contra">Contra</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Voucher No.</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : vouchers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No vouchers found. Create your first voucher to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vouchers.map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell>{format(new Date(v.voucher_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-mono">{v.voucher_number}</TableCell>
                        <TableCell>
                          <Badge className={voucherClassColors[v.voucher_type?.voucher_class] || ""}>
                            {v.voucher_type?.name || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>{v.party_ledger?.name || "-"}</TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{v.amount?.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{v.narration || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={v.is_posted ? "default" : "secondary"}>
                            {v.is_cancelled ? "Cancelled" : v.is_posted ? "Posted" : "Draft"}
                          </Badge>
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
    </div>
  );
}
