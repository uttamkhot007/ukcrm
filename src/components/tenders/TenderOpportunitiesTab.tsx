import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { Eye, Calendar, Building, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface TenderOpportunitiesTabProps {
  tenders: any[];
  loading: boolean;
  onViewDetails: (tender: any) => void;
  onRefresh: () => void;
}

export function TenderOpportunitiesTab({ 
  tenders, 
  loading, 
  onViewDetails 
}: TenderOpportunitiesTabProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      identified: { variant: 'outline', label: 'Identified' },
      evaluating: { variant: 'secondary', label: 'Evaluating' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      government: 'bg-blue-100 text-blue-800',
      private: 'bg-purple-100 text-purple-800',
      psu: 'bg-green-100 text-green-800',
      referral: 'bg-orange-100 text-orange-800',
      portal: 'bg-gray-100 text-gray-800',
      direct: 'bg-pink-100 text-pink-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[source] || colors.portal}`}>
        {source?.toUpperCase()}
      </span>
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
          <Building className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No tender opportunities found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tender Opportunities</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tender #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Est. Value</TableHead>
              <TableHead>Deadline</TableHead>
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
                <TableCell>{getSourceBadge(tender.source)}</TableCell>
                <TableCell>
                  ₹{((tender.estimated_value || 0) / 100000).toFixed(1)}L
                </TableCell>
                <TableCell>
                  {tender.submission_deadline ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(tender.submission_deadline), 'dd MMM yyyy')}
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell>{getStatusBadge(tender.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {tender.tender_portal_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(tender.tender_portal_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewDetails(tender)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
