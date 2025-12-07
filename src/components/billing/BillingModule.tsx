import { useState } from "react";
import { ModuleVerticalNav, ModuleNavItem } from "@/components/ui/module-vertical-nav";
import { InvoicesList } from "./InvoicesList";
import { BillingStats } from "./BillingStats";
import { NewInvoiceDialog } from "./NewInvoiceDialog";
import { InvoiceDetailsSheet } from "./InvoiceDetailsSheet";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Clock, CheckCircle, AlertTriangle } from "lucide-react";

const navItems: ModuleNavItem[] = [
  { value: "all", label: "All Invoices", icon: FileText },
  { value: "draft", label: "Drafts", icon: Clock },
  { value: "sent", label: "Sent", icon: FileText },
  { value: "overdue", label: "Overdue", icon: AlertTriangle },
  { value: "paid", label: "Paid", icon: CheckCircle },
];

export function BillingModule() {
  const [activeTab, setActiveTab] = useState("all");
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const renderContent = () => {
    switch (activeTab) {
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

      <div className="flex gap-6">
        <ModuleVerticalNav
          items={navItems}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
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
