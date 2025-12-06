import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface InvoicesListProps {
  statusFilter: string | null;
  onInvoiceSelect: (id: string) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-slate-500",
  sent: "bg-blue-500",
  paid: "bg-green-500",
  overdue: "bg-red-500",
  cancelled: "bg-slate-400",
  partially_paid: "bg-amber-500",
};

export function InvoicesList({ statusFilter, onInvoiceSelect }: InvoicesListProps) {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(`
          *,
          contact:contacts(name, company)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter as "draft" | "sent" | "paid" | "overdue" | "cancelled" | "partially_paid");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading invoices...</div>;
  }

  if (!invoices?.length) {
    return <div className="py-8 text-center text-muted-foreground">No invoices found</div>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow 
              key={invoice.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onInvoiceSelect(invoice.id)}
            >
              <TableCell>
                <p className="font-medium">{invoice.invoice_number}</p>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{invoice.contact?.name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{invoice.contact?.company || ""}</p>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{formatCurrency(invoice.total)}</p>
                  {invoice.amount_paid > 0 && invoice.amount_paid < invoice.total && (
                    <p className="text-sm text-green-600">Paid: {formatCurrency(invoice.amount_paid)}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={statusColors[invoice.status]}>
                  {invoice.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(invoice.due_date), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(invoice.created_at), "MMM d, yyyy")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
