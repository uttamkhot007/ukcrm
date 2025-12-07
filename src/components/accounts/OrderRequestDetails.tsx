import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, DollarSign, Calendar, FileCheck, User, Building } from "lucide-react";
import { format } from "date-fns";
import { OrderDocumentsUpload } from "./OrderDocumentsUpload";

interface OrderRequestDetailsProps {
  orderRequestId: string;
  onUpdate?: () => void;
}

export function OrderRequestDetails({ orderRequestId, onUpdate }: OrderRequestDetailsProps) {
  const { data: request, isLoading, refetch } = useQuery({
    queryKey: ["order-request", orderRequestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_processing_requests")
        .select(`
          *,
          deals:deal_id (title, value, contacts:contact_id (name, company, email, phone))
        `)
        .eq("id", orderRequestId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!request) {
    return <p className="text-center text-muted-foreground py-8">Request not found</p>;
  }

  const margin = (request.selling_cost || 0) - (request.buying_cost || 0) - (request.referral_fees || 0);
  const marginPercentage = request.selling_cost > 0 ? (margin / request.selling_cost) * 100 : 0;

  // Parse other_documents safely
  const otherDocs = Array.isArray(request.other_documents) 
    ? request.other_documents as Array<{ name: string; url: string }>
    : [];

  return (
    <div className="space-y-6">
      {/* Deal & Contact Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building className="w-4 h-4" />
            Deal & Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Deal:</span>
            <p className="font-medium">{request.deals?.title}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Company:</span>
            <p className="font-medium">{request.deals?.contacts?.company || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Contact:</span>
            <p className="font-medium">{request.deals?.contacts?.name || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Email:</span>
            <p className="font-medium">{request.deals?.contacts?.email || "-"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Customer PO Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Customer PO Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">PO Number:</span>
            <p className="font-medium">{request.customer_po_number || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">PO Date:</span>
            <p className="font-medium">
              {request.customer_po_date
                ? format(new Date(request.customer_po_date), "MMM d, yyyy")
                : "-"}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Payment Terms:</span>
            <p className="font-medium">{request.customer_payment_terms || "-"}</p>
          </div>
          {request.customer_commitments && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Commitments:</span>
              <p className="font-medium">{request.customer_commitments}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distributor/OEM Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Distributor/OEM Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Name:</span>
            <p className="font-medium">{request.distributor_oem_name || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Quote Number:</span>
            <p className="font-medium">{request.distri_oem_quote_number || "-"}</p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Payment Terms:</span>
            <p className="font-medium">{request.distri_oem_payment_terms || "-"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Financial Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Financial Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <span className="text-muted-foreground">Buying Cost:</span>
              <p className="font-medium">₹{(request.buying_cost || 0).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Selling Cost:</span>
              <p className="font-medium">₹{(request.selling_cost || 0).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Referral Fees:</span>
              <p className="font-medium">₹{(request.referral_fees || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
            <span className="font-medium">Margin:</span>
            <div className="text-right">
              <span className={`text-lg font-bold ${margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                ₹{margin.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                ({marginPercentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Timelines */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Delivery Timelines
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">License Delivery:</span>
            <p className="font-medium">
              {request.license_delivery_date
                ? format(new Date(request.license_delivery_date), "MMM d, yyyy")
                : "-"}
            </p>
            {request.license_delivery_notes && (
              <p className="text-xs text-muted-foreground mt-1">{request.license_delivery_notes}</p>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Service Delivery:</span>
            <p className="font-medium">
              {request.service_delivery_date
                ? format(new Date(request.service_delivery_date), "MMM d, yyyy")
                : "-"}
            </p>
            {request.service_delivery_notes && (
              <p className="text-xs text-muted-foreground mt-1">{request.service_delivery_notes}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prerequisites */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Document Prerequisites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant={request.has_msa ? "default" : "outline"}>
              MSA {request.has_msa ? "✓" : "✗"}
            </Badge>
            <Badge variant={request.has_nda ? "default" : "outline"}>
              NDA {request.has_nda ? "✓" : "✗"}
            </Badge>
            <Badge variant={request.has_sow ? "default" : "outline"}>
              SOW {request.has_sow ? "✓" : "✗"}
            </Badge>
            <Badge variant={request.has_sla ? "default" : "outline"}>
              SLA {request.has_sla ? "✓" : "✗"}
            </Badge>
          </div>
          {request.other_prerequisites && (
            <p className="text-sm text-muted-foreground mt-2">{request.other_prerequisites}</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Document Upload Section */}
      <OrderDocumentsUpload
        orderRequestId={orderRequestId}
        customerPoUrl={request.customer_po_url}
        distriOemQuoteUrl={request.distri_oem_quote_url}
        otherDocuments={otherDocs}
        onUploadComplete={() => {
          refetch();
          onUpdate?.();
        }}
      />
    </div>
  );
}
