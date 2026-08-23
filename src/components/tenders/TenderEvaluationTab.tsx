import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { Eye, Trophy, XCircle, Clock, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface TenderEvaluationTabProps {
  tenders: any[];
  loading: boolean;
  onViewDetails: (tender: any) => void;
  onRefresh: () => void;
}

export function TenderEvaluationTab({ 
  tenders, 
  loading, 
  onViewDetails 
}: TenderEvaluationTabProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string; icon: any }> = {
      under_evaluation: { variant: 'secondary', label: 'Under Evaluation', icon: Clock },
      won: { variant: 'default', label: 'Won', icon: Trophy },
      lost: { variant: 'destructive', label: 'Lost', icon: XCircle },
      cancelled: { variant: 'outline', label: 'Cancelled', icon: Ban },
    };
    const config = variants[status] || { variant: 'outline', label: status, icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (tenders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No tenders in evaluation</p>
        </CardContent>
      </Card>
    );
  }

  // Separate won, lost, and in-progress
  const wonTenders = tenders.filter(t => t.status === 'won');
  const lostTenders = tenders.filter(t => t.status === 'lost');
  const otherTenders = tenders.filter(t => !['won', 'lost'].includes(t.status));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-green-700 dark:text-green-400" />
              Won Tenders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{wonTenders.length}</div>
            <p className="text-xs text-muted-foreground">
              ₹{(wonTenders.reduce((s, t) => s + (t.estimated_value || 0), 0) / 100000).toFixed(1)}L value
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Lost Tenders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lostTenders.length}</div>
            <p className="text-xs text-muted-foreground">
              ₹{(lostTenders.reduce((s, t) => s + (t.estimated_value || 0), 0) / 100000).toFixed(1)}L value
            </p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Under Evaluation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{otherTenders.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting results
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tenders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tender #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenders.map((tender) => (
                <TableRow key={tender.id}>
                  <TableCell className="font-mono text-sm">
                    {tender.tender_number}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate font-medium">
                      {tender.title}
                    </div>
                  </TableCell>
                  <TableCell>{tender.organization_name || '-'}</TableCell>
                  <TableCell>
                    ₹{((tender.estimated_value || 0) / 100000).toFixed(1)}L
                  </TableCell>
                  <TableCell>
                    {tender.submission_deadline 
                      ? format(new Date(tender.submission_deadline), 'dd MMM yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(tender.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewDetails(tender)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
