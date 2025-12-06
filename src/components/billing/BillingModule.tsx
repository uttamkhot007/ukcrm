import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoicesList } from "./InvoicesList";
import { BillingStats } from "./BillingStats";
import { NewInvoiceDialog } from "./NewInvoiceDialog";
import { InvoiceDetailsSheet } from "./InvoiceDetailsSheet";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Clock, CheckCircle, AlertTriangle } from "lucide-react";

export function BillingModule() {
  const [activeTab, setActiveTab] = useState("all");
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <FileText className="w-4 h-4" />
            All Invoices
          </TabsTrigger>
          <TabsTrigger value="draft" className="gap-2">
            <Clock className="w-4 h-4" />
            Drafts
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <FileText className="w-4 h-4" />
            Sent
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Overdue
          </TabsTrigger>
          <TabsTrigger value="paid" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Paid
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <InvoicesList statusFilter={null} onInvoiceSelect={setSelectedInvoiceId} />
        </TabsContent>
        <TabsContent value="draft">
          <InvoicesList statusFilter="draft" onInvoiceSelect={setSelectedInvoiceId} />
        </TabsContent>
        <TabsContent value="sent">
          <InvoicesList statusFilter="sent" onInvoiceSelect={setSelectedInvoiceId} />
        </TabsContent>
        <TabsContent value="overdue">
          <InvoicesList statusFilter="overdue" onInvoiceSelect={setSelectedInvoiceId} />
        </TabsContent>
        <TabsContent value="paid">
          <InvoicesList statusFilter="paid" onInvoiceSelect={setSelectedInvoiceId} />
        </TabsContent>
      </Tabs>

      <NewInvoiceDialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen} />
      <InvoiceDetailsSheet 
        invoiceId={selectedInvoiceId} 
        open={!!selectedInvoiceId} 
        onOpenChange={(open) => !open && setSelectedInvoiceId(null)} 
      />
    </div>
  );
}
