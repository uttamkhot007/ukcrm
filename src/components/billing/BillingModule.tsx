import { useState } from "react";
import { InvoicesList } from "./InvoicesList";
import { BillingStats } from "./BillingStats";
import { NewInvoiceDialog } from "./NewInvoiceDialog";
import { InvoiceDetailsSheet } from "./InvoiceDetailsSheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface BillingModuleProps {
  initialTab?: string;
}

export function BillingModule({ initialTab = "all" }: BillingModuleProps) {
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const renderContent = () => {
    switch (initialTab) {
      case "all":
        return <InvoicesList statusFilter={null} onInvoiceSelect={setSelectedInvoiceId} />;
      case "draft":
        return <InvoicesList statusFilter="draft" onInvoiceSelect={setSelectedInvoiceId} />;
      case "sent":
        return <InvoicesList statusFilter="sent" onInvoiceSelect={setSelectedInvoiceId} />;
      case "overdue":
        return <InvoicesList statusFilter="overdue" onInvoiceSelect={setSelectedInvoiceId} />;
      case "paid":
        return <InvoicesList statusFilter="paid" onInvoiceSelect={setSelectedInvoiceId} />;
      default:
        return <InvoicesList statusFilter={null} onInvoiceSelect={setSelectedInvoiceId} />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Manage invoices and payments</p>
        </div>
        <Button onClick={() => setIsNewInvoiceOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <BillingStats />

      <div className="min-w-0">
        {renderContent()}
      </div>

      <NewInvoiceDialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen} />
      <InvoiceDetailsSheet 
        invoiceId={selectedInvoiceId} 
        open={!!selectedInvoiceId} 
        onOpenChange={(open) => !open && setSelectedInvoiceId(null)} 
      />
    </div>
  );
}
