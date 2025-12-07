import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Hotel, Car, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

interface TravelRequestDetailsSheetProps {
  request: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TravelRequestDetailsSheet({
  request,
  open,
  onOpenChange,
}: TravelRequestDetailsSheetProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Draft", variant: "outline" },
      submitted: { label: "Pending Approval", variant: "secondary" },
      approved: { label: "Approved", variant: "default" },
      rejected: { label: "Rejected", variant: "destructive" },
      cancelled: { label: "Cancelled", variant: "outline" },
      completed: { label: "Completed", variant: "default" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <SheetTitle>{request.title}</SheetTitle>
            {getStatusBadge(request.status)}
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            {request.request_number}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Trip Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="font-semibold">{request.departure_city}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(request.departure_date), "MMM d")}
                  </p>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="h-px bg-border flex-1" />
                  <Plane className="h-4 w-4 mx-2 text-muted-foreground" />
                  <div className="h-px bg-border flex-1" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">{request.destination_city}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(request.return_date), "MMM d")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Travel Type:</span>
                  <p className="font-medium capitalize">{request.travel_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Estimated Cost:</span>
                  <p className="font-medium">
                    {formatCurrency(Number(request.estimated_cost || 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purpose */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Purpose</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{request.purpose}</p>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {request.requires_flight && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Plane className="h-3 w-3" />
                    Flight ({request.flight_preference || "economy"})
                  </Badge>
                )}
                {request.requires_hotel && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Hotel className="h-3 w-3" />
                    Hotel
                  </Badge>
                )}
                {request.requires_cab && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Car className="h-3 w-3" />
                    Local Transport
                  </Badge>
                )}
                {!request.requires_flight && !request.requires_hotel && !request.requires_cab && (
                  <span className="text-muted-foreground text-sm">No specific requirements</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          {request.additional_notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{request.additional_notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{format(new Date(request.created_at), "MMM d, yyyy h:mm a")}</span>
                </div>
                {request.submitted_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted:</span>
                    <span>{format(new Date(request.submitted_at), "MMM d, yyyy h:mm a")}</span>
                  </div>
                )}
                {request.approved_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved:</span>
                    <span>{format(new Date(request.approved_at), "MMM d, yyyy h:mm a")}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rejection Reason */}
          {request.status === "rejected" && request.rejection_reason && (
            <Card className="border-destructive">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-destructive">Rejection Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{request.rejection_reason}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
