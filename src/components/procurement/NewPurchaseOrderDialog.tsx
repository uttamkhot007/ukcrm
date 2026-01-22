import { DocumentCreationWizard } from "@/components/documents/DocumentCreationWizard";

interface NewPurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewPurchaseOrderDialog({ open, onOpenChange, onSuccess }: NewPurchaseOrderDialogProps) {
  return (
    <DocumentCreationWizard
      open={open}
      onOpenChange={onOpenChange}
      documentType="purchase_order"
      onSuccess={onSuccess}
    />
  );
}
