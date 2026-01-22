import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { FileText, Plus, Receipt, ShoppingCart, ChevronDown } from "lucide-react";
import { DocumentCreationWizard, DocumentType } from "./DocumentCreationWizard";

interface QuickDocumentActionsProps {
  showLabel?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function QuickDocumentActions({ 
  showLabel = true, 
  variant = "default",
  size = "default" 
}: QuickDocumentActionsProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>("quote");

  const openWizard = (type: DocumentType) => {
    setSelectedType(type);
    setWizardOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size}>
            <Plus className="w-4 h-4 mr-2" />
            {showLabel && "New Document"}
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Create Document</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => openWizard("quote")}>
            <FileText className="w-4 h-4 mr-2" />
            <div>
              <p className="font-medium">Quotation</p>
              <p className="text-xs text-muted-foreground">Create a new quote for customers</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openWizard("invoice")}>
            <Receipt className="w-4 h-4 mr-2" />
            <div>
              <p className="font-medium">Invoice</p>
              <p className="text-xs text-muted-foreground">Generate a new invoice</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openWizard("purchase_order")}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            <div>
              <p className="font-medium">Purchase Order</p>
              <p className="text-xs text-muted-foreground">Create a PO for vendors</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DocumentCreationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        documentType={selectedType}
      />
    </>
  );
}
