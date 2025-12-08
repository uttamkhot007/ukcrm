import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Eye, Calendar, Users, FileText, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface TenderBidPreparationTabProps {
  tenders: any[];
  loading: boolean;
  onViewDetails: (tender: any) => void;
  onRefresh: () => void;
}

export function TenderBidPreparationTab({ 
  tenders, 
  loading, 
  onViewDetails 
}: TenderBidPreparationTabProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      bid_preparation: { variant: 'secondary', label: 'Preparing' },
      submitted: { variant: 'default', label: 'Submitted' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const days = differenceInDays(new Date(deadline), new Date());
    if (days < 0) return { days: Math.abs(days), overdue: true };
    return { days, overdue: false };
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (tenders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No tenders in bid preparation</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tenders.map((tender) => {
        const deadlineInfo = getDaysRemaining(tender.submission_deadline);
        
        return (
          <Card key={tender.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-mono text-muted-foreground">
                    {tender.tender_number}
                  </p>
                  <CardTitle className="text-base line-clamp-2">
                    {tender.title}
                  </CardTitle>
                </div>
                {getStatusBadge(tender.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {tender.organization_name || 'Unknown Organization'}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Est. Value</span>
                <span className="font-semibold">
                  ₹{((tender.estimated_value || 0) / 100000).toFixed(1)}L
                </span>
              </div>

              {tender.emd_amount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">EMD</span>
                  <div className="flex items-center gap-2">
                    <span>₹{((tender.emd_amount || 0) / 1000).toFixed(0)}K</span>
                    {tender.emd_submitted ? (
                      <Badge variant="outline" className="text-green-600">Paid</Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600">Pending</Badge>
                    )}
                  </div>
                </div>
              )}

              {deadlineInfo && (
                <div className={`flex items-center gap-2 text-sm ${
                  deadlineInfo.overdue ? 'text-destructive' : 
                  deadlineInfo.days <= 3 ? 'text-orange-600' : 'text-muted-foreground'
                }`}>
                  {deadlineInfo.overdue ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Calendar className="h-4 w-4" />
                  )}
                  {deadlineInfo.overdue 
                    ? `Overdue by ${deadlineInfo.days} days`
                    : `${deadlineInfo.days} days remaining`
                  }
                </div>
              )}

              {tender.status === 'bid_preparation' && (
                <Progress value={50} className="h-2" />
              )}

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onViewDetails(tender)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
