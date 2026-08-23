import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileCheck, Clock, CheckCircle2, XCircle, AlertCircle, Calendar
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface DealRegistration {
  id: string;
  dr_number: string;
  vendor_name: string;
  vendor_program: string | null;
  customer_name: string;
  opportunity_value: number;
  expected_close_date: string | null;
  status: string;
  priority: string;
  sla_deadline: string | null;
  dr_id_from_vendor: string | null;
  dr_expiry_date: string | null;
  created_at: string;
  requester_id: string;
  assigned_to: string | null;
}

interface DealRegistrationTabProps {
  dealRegistrations: DealRegistration[];
  loading: boolean;
  onViewDetails: (drId: string) => void;
  onRefresh: () => void;
}

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  in_progress: { label: "In Progress", icon: AlertCircle, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  approved: { label: "Approved", icon: CheckCircle2, color: "bg-green-500/10 text-green-500 border-green-500/20" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-500/10 text-red-500 border-red-500/20" },
  expired: { label: "Expired", icon: Clock, color: "bg-muted text-muted-foreground border-border" },
  closed: { label: "Closed", icon: FileCheck, color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
};

const priorityColors = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function DealRegistrationTab({ dealRegistrations, loading, onViewDetails, onRefresh }: DealRegistrationTabProps) {
  const getStatusInfo = (status: string) => statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  const isSLABreached = (slaDeadline: string | null, status: string) => {
    if (!slaDeadline || status !== 'pending') return false;
    return new Date(slaDeadline) < new Date();
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-1/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (dealRegistrations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg">No deal registrations found</h3>
          <p className="text-muted-foreground">
            Create a new deal registration request to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {dealRegistrations.map((dr) => {
        const statusInfo = getStatusInfo(dr.status);
        const StatusIcon = statusInfo.icon;
        const slaBreached = isSLABreached(dr.sla_deadline, dr.status);

        return (
          <Card 
            key={dr.id} 
            className={cn(
              "hover:shadow-md transition-all cursor-pointer border",
              slaBreached && "border-red-500/50 bg-red-500/5"
            )}
            onClick={() => onViewDetails(dr.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border", statusInfo.color)}>
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold">{dr.dr_number}</span>
                      <Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge>
                      <Badge variant="outline" className={priorityColors[dr.priority as keyof typeof priorityColors]}>
                        {dr.priority}
                      </Badge>
                      {slaBreached && (
                        <Badge variant="destructive">SLA Breached</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium text-foreground">{dr.vendor_name}</span>
                      {dr.vendor_program && <span> • {dr.vendor_program}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span>Customer: <span className="font-medium text-foreground">{dr.customer_name}</span></span>
                      <span>Value: <span className="font-medium text-foreground">₹{(dr.opportunity_value / 100000).toFixed(1)}L</span></span>
                      {dr.expected_close_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(dr.expected_close_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                    {dr.dr_id_from_vendor && (
                      <div className="text-sm text-green-700 dark:text-green-400 mt-2 p-2 bg-green-500/10 rounded-md inline-block">
                        <span className="font-medium">DR ID:</span> {dr.dr_id_from_vendor}
                        {dr.dr_expiry_date && (
                          <span className="text-muted-foreground ml-2">
                            (Expires: {format(new Date(dr.dr_expiry_date), "MMM d, yyyy")})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground shrink-0">
                  <div>{formatDistanceToNow(new Date(dr.created_at), { addSuffix: true })}</div>
                  {dr.sla_deadline && dr.status === 'pending' && (
                    <div className={cn("text-xs mt-1", slaBreached ? "text-red-500 font-medium" : "text-muted-foreground")}>
                      SLA: {formatDistanceToNow(new Date(dr.sla_deadline), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
