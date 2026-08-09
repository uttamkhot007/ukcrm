import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderDocumentsUploadProps {
  orderRequestId: string;
  customerPoUrl?: string | null;
  distriOemQuoteUrl?: string | null;
  otherDocuments?: Array<{ name: string; url: string }> | null;
  onUploadComplete?: () => void;
}

type DocumentType = "customer_po" | "distri_oem_quote" | "other";

export function OrderDocumentsUpload({
  orderRequestId,
  customerPoUrl,
  distriOemQuoteUrl,
  otherDocuments = [],
  onUploadComplete,
}: OrderDocumentsUploadProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<DocumentType | null>(null);
  const fileInputRefs = {
    customer_po: useRef<HTMLInputElement>(null),
    distri_oem_quote: useRef<HTMLInputElement>(null),
    other: useRef<HTMLInputElement>(null),
  };

  const uploadDocument = async (file: File, type: DocumentType) => {
    if (!user?.id) throw new Error("Not authenticated");
    if (!currentTenant?.id) throw new Error("No active workspace selected");

    setUploading(type);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentTenant.id}/${orderRequestId}/${type}_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("order-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("order-documents")
        .getPublicUrl(fileName);

      const fileUrl = urlData.publicUrl;

      // Update database based on document type
      if (type === "customer_po") {
        await supabase
          .from("order_processing_requests")
          .update({ customer_po_url: fileUrl })
          .eq("id", orderRequestId);
      } else if (type === "distri_oem_quote") {
        await supabase
          .from("order_processing_requests")
          .update({ distri_oem_quote_url: fileUrl })
          .eq("id", orderRequestId);
      } else {
        // Add to other_documents array
        const newDoc = { name: file.name, url: fileUrl };
        const currentDocs = otherDocuments || [];
        await supabase
          .from("order_processing_requests")
          .update({ other_documents: [...currentDocs, newDoc] })
          .eq("id", orderRequestId);
      }

      toast({ title: "Document Uploaded", description: `${file.name} uploaded successfully.` });
      queryClient.invalidateQueries({ queryKey: ["order-request", orderRequestId] });
      onUploadComplete?.();
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocument(file, type);
    }
    // Reset input
    e.target.value = "";
  };

  const deleteDocument = useMutation({
    mutationFn: async ({ type, docIndex }: { type: DocumentType; docIndex?: number }) => {
      if (type === "customer_po") {
        await supabase
          .from("order_processing_requests")
          .update({ customer_po_url: null })
          .eq("id", orderRequestId);
      } else if (type === "distri_oem_quote") {
        await supabase
          .from("order_processing_requests")
          .update({ distri_oem_quote_url: null })
          .eq("id", orderRequestId);
      } else if (type === "other" && docIndex !== undefined) {
        const updatedDocs = (otherDocuments || []).filter((_, i) => i !== docIndex);
        await supabase
          .from("order_processing_requests")
          .update({ other_documents: updatedDocs })
          .eq("id", orderRequestId);
      }
    },
    onSuccess: () => {
      toast({ title: "Document Removed" });
      queryClient.invalidateQueries({ queryKey: ["order-request", orderRequestId] });
      onUploadComplete?.();
    },
  });

  const DocumentSlot = ({
    type,
    label,
    description,
    url,
    required,
  }: {
    type: DocumentType;
    label: string;
    description: string;
    url?: string | null;
    required?: boolean;
  }) => (
    <Card className={cn("transition-all", url && "border-green-500/30")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {url ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
              )}
              {label}
              {required && <Badge variant="outline" className="text-xs">Required</Badge>}
            </CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <input
          ref={fileInputRefs[type]}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
          onChange={(e) => handleFileChange(e, type)}
        />

        {url ? (
          <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm truncate">Uploaded</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(url, "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteDocument.mutate({ type })}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={uploading === type}
            onClick={() => fileInputRefs[type].current?.click()}
          >
            {uploading === type ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Upload Document
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Required Documents</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DocumentSlot
          type="customer_po"
          label="Customer PO"
          description="Purchase Order from customer"
          url={customerPoUrl}
          required
        />
        <DocumentSlot
          type="distri_oem_quote"
          label="Distributor/OEM Quote"
          description="Quote received from distributor or OEM"
          url={distriOemQuoteUrl}
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Other Documents</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRefs.other.current?.click()}
            disabled={uploading === "other"}
          >
            {uploading === "other" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Add Document
          </Button>
          <input
            ref={fileInputRefs.other}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
            onChange={(e) => handleFileChange(e, "other")}
          />
        </div>

        {(!otherDocuments || otherDocuments.length === 0) ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No additional documents uploaded
          </p>
        ) : (
          <div className="space-y-2">
            {otherDocuments.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm truncate">{doc.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(doc.url, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteDocument.mutate({ type: "other", docIndex: index })}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
