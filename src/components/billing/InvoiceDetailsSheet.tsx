import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { User, Building, CreditCard, Calendar } from "lucide-react";
import { toast } from "sonner";

interface InvoiceDetailsSheetProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-slate-500",
  sent: "bg-blue-500",
  paid: "bg-green-500",
  overdue: "bg-red-500",
  cancelled: "bg-slate-400",
  partially_paid: "bg-amber-500",
};

export function InvoiceDetailsSheet({ invoiceId, open, onOpenChange }: InvoiceDetailsSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const { data: invoice } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          contact:contacts(name, company, email, phone)
        `)
        .eq("id", invoiceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });

  const { data: items } = useQuery({
    queryKey: ["invoice-items", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });

  const { data: payments } = useQuery({
    queryKey: ["invoice-payments", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const { data, error } = await supabase
        .from("payment_records")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;
    try {
      const { error } = await supabase.from("invoices").update({ status: newStatus as "draft" | "sent" | "paid" | "overdue" | "cancelled" | "partially_paid" }).eq("id", invoice.id);
      if (error) throw error;
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-stats"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRecordPayment = async () => {
    if (!invoice || !user || !paymentAmount) return;
    try {
      const amount = parseFloat(paymentAmount);
      const { error: paymentError } = await supabase.from("payment_records").insert({
        invoice_id: invoice.id,
        amount,
        payment_method: paymentMethod,
        recorded_by: user.id,
      });
      if (paymentError) throw paymentError;

      const newAmountPaid = Number(invoice.amount_paid || 0) + amount;
      const newStatus = newAmountPaid >= invoice.total ? "paid" : "partially_paid";
      
      const { error: updateError } = await supabase
        .from("invoices")
        .update({ amount_paid: newAmountPaid, status: newStatus })
        .eq("id", invoice.id);
      if (updateError) throw updateError;

      toast.success("Payment recorded");
      setIsPaymentOpen(false);
      setPaymentAmount("");
      setPaymentMethod("");
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-stats"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
  };

  if (!invoice) return null;

  const balance = invoice.total - (invoice.amount_paid || 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span>{invoice.invoice_number}</span>
              <Badge className={statusColors[invoice.status]}>{invoice.status.replace("_", " ")}</Badge>
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
            <div className="space-y-6 py-4">
              {invoice.contact && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{invoice.contact.name}</span>
                  </div>
                  {invoice.contact.company && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building className="w-4 h-4" />
                      {invoice.contact.company}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Select value={invoice.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(invoice.due_date), "MMM d, yyyy")}
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Line Items</h4>
                <div className="space-y-2">
                  {items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                      <span>{item.description}</span>
                      <span>{item.quantity} × {formatCurrency(item.unit_price)} = {formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({invoice.tax_rate}%)</span>
                  <span>{formatCurrency(invoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
                {invoice.amount_paid > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Paid</span>
                      <span>-{formatCurrency(invoice.amount_paid)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Balance</span>
                      <span>{formatCurrency(balance)}</span>
                    </div>
                  </>
                )}
              </div>

              {balance > 0 && invoice.status !== "cancelled" && (
                <Button onClick={() => setIsPaymentOpen(true)} className="w-full">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              )}

              {payments && payments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Payment History</h4>
                  <div className="space-y-2">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex justify-between text-sm p-2 bg-green-500/10 rounded">
                        <div>
                          <p>{format(new Date(payment.payment_date), "MMM d, yyyy")}</p>
                          {payment.payment_method && (
                            <p className="text-xs text-muted-foreground">{payment.payment_method}</p>
                          )}
                        </div>
                        <span className="font-medium text-green-600">{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={`Balance: ${formatCurrency(balance)}`}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
              <Button onClick={handleRecordPayment}>Record Payment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
