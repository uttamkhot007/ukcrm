import { useState } from "react";
import { InvoicesList } from "./InvoicesList";
import { BillingStats } from "./BillingStats";
import { NewInvoiceDialog } from "./NewInvoiceDialog";
import { InvoiceDetailsSheet } from "./InvoiceDetailsSheet";
import { QuickDocumentActions } from "@/components/documents/QuickDocumentActions";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Wand2, FileText, ChevronDown } from "lucide-react";

interface BillingModuleProps {
  initialTab?: string;
}

export function BillingModule({ initialTab = "all" }: BillingModuleProps) {
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [useWizard, setUseWizard] = useState(false);
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

  const handleOpenWizard = () => {
    setUseWizard(true);
    setIsNewInvoiceOpen(true);
  };

  const handleOpenQuick = () => {
    setUseWizard(false);
    setIsNewInvoiceOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Manage invoices and payments</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Invoice
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleOpenWizard}>
                <Wand2 className="w-4 h-4 mr-2" />
                <div>
                  <p className="font-medium">Use Wizard</p>
                  <p className="text-xs text-muted-foreground">Step-by-step guided workflow</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenQuick}>
                <FileText className="w-4 h-4 mr-2" />
                <div>
                  <p className="font-medium">Quick Create</p>
                  <p className="text-xs text-muted-foreground">Tabbed form for fast entry</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <QuickDocumentActions showLabel={false} variant="outline" />
        </div>
      </div>

      <BillingStats />

      <div className="min-w-0">
        {renderContent()}
      </div>

      <NewInvoiceDialog 
        open={isNewInvoiceOpen} 
        onOpenChange={setIsNewInvoiceOpen} 
        useWizard={useWizard}
      />
      <InvoiceDetailsSheet 
        invoiceId={selectedInvoiceId} 
        open={!!selectedInvoiceId} 
        onOpenChange={(open) => !open && setSelectedInvoiceId(null)} 
      />
    </div>
  );
}
