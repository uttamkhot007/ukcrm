import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, TrendingUp, ArrowRight, CheckCircle2, Clock, XCircle, 
  AlertCircle, FileCheck, ChevronDown, ChevronUp
} from 'lucide-react';
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
  created_at: string;
  requester_id: string;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  organization_name: string | null;
  alliance_organization_id: string | null;
  solution_id: string | null;
}

interface OEMFunnelTabProps {
  dealRegistrations: DealRegistration[];
  deals?: Deal[];
  loading: boolean;
}

interface OEMData {
  name: string;
  pending: number;
  inProgress: number;
  approved: number;
  rejected: number;
  total: number;
  totalValue: number;
  approvedValue: number;
  conversionRate: number;
}

const statusColors = {
  pending: 'bg-yellow-500',
  in_progress: 'bg-blue-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  expired: 'bg-gray-500',
  closed: 'bg-purple-500',
};

export function OEMFunnelTab({ dealRegistrations, deals = [], loading }: OEMFunnelTabProps) {
  const [selectedOEM, setSelectedOEM] = useState<string>('all');
  const [expandedOEM, setExpandedOEM] = useState<string | null>(null);

  // Group deal registrations by OEM/Vendor
  const oemData: Record<string, OEMData> = {};
  
  dealRegistrations.forEach(dr => {
    const vendor = dr.vendor_name || 'Unknown';
    if (!oemData[vendor]) {
      oemData[vendor] = {
        name: vendor,
        pending: 0,
        inProgress: 0,
        approved: 0,
        rejected: 0,
        total: 0,
        totalValue: 0,
        approvedValue: 0,
        conversionRate: 0,
      };
    }
    
    oemData[vendor].total++;
    oemData[vendor].totalValue += dr.opportunity_value || 0;
    
    if (dr.status === 'pending') oemData[vendor].pending++;
    else if (dr.status === 'in_progress') oemData[vendor].inProgress++;
    else if (dr.status === 'approved') {
      oemData[vendor].approved++;
      oemData[vendor].approvedValue += dr.opportunity_value || 0;
    }
    else if (dr.status === 'rejected') oemData[vendor].rejected++;
  });

  // Calculate conversion rates
  Object.values(oemData).forEach(oem => {
    const totalDecided = oem.approved + oem.rejected;
    oem.conversionRate = totalDecided > 0 ? (oem.approved / totalDecided) * 100 : 0;
  });

  const sortedOEMs = Object.values(oemData).sort((a, b) => b.total - a.total);
  const uniqueOEMs = sortedOEMs.map(o => o.name);

  const filteredOEMs = selectedOEM === 'all' 
    ? sortedOEMs 
    : sortedOEMs.filter(o => o.name === selectedOEM);

  // Get deals for expanded OEM
  const getDealsForOEM = (oemName: string) => {
    return dealRegistrations.filter(dr => dr.vendor_name === oemName);
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-1/4 mb-4" />
              <div className="h-20 bg-muted rounded w-full" />
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
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg">No OEM data available</h3>
          <p className="text-muted-foreground">
            Deal registrations will appear here grouped by OEM/Vendor
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* OEM Filter */}
      <div className="flex items-center gap-4">
        <Select value={selectedOEM} onValueChange={setSelectedOEM}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select OEM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All OEMs ({uniqueOEMs.length})</SelectItem>
            {uniqueOEMs.map(oem => (
              <SelectItem key={oem} value={oem}>{oem}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{uniqueOEMs.length}</div>
            <div className="text-sm text-muted-foreground">Total OEMs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{dealRegistrations.length}</div>
            <div className="text-sm text-muted-foreground">Total DRs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {Object.values(oemData).reduce((sum, o) => sum + o.approved, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Approved DRs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              ₹{(Object.values(oemData).reduce((sum, o) => sum + o.approvedValue, 0) / 100000).toFixed(1)}L
            </div>
            <div className="text-sm text-muted-foreground">Approved Value</div>
          </CardContent>
        </Card>
      </div>

      {/* OEM Funnel Cards */}
      <div className="space-y-4">
        {filteredOEMs.map(oem => {
          const isExpanded = expandedOEM === oem.name;
          const deals = isExpanded ? getDealsForOEM(oem.name) : [];
          
          return (
            <Card key={oem.name} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedOEM(isExpanded ? null : oem.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{oem.name}</CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {oem.total} deals • ₹{(oem.totalValue / 100000).toFixed(1)}L pipeline
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {oem.conversionRate.toFixed(0)}% win rate
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ₹{(oem.approvedValue / 100000).toFixed(1)}L won
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Funnel Visualization */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={cn(
                      "h-8 rounded-l-md flex items-center justify-center text-white text-sm font-medium",
                      "bg-yellow-500"
                    )} style={{ width: `${Math.max((oem.pending / oem.total) * 100, 10)}%`, minWidth: '60px' }}>
                      {oem.pending} Pending
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className={cn(
                      "h-8 flex items-center justify-center text-white text-sm font-medium",
                      "bg-blue-500"
                    )} style={{ width: `${Math.max((oem.inProgress / oem.total) * 100, 10)}%`, minWidth: '70px' }}>
                      {oem.inProgress} In Progress
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className={cn(
                      "h-8 flex items-center justify-center text-white text-sm font-medium",
                      "bg-green-500"
                    )} style={{ width: `${Math.max((oem.approved / oem.total) * 100, 10)}%`, minWidth: '60px' }}>
                      {oem.approved} Won
                    </div>
                    <div className={cn(
                      "h-8 rounded-r-md flex items-center justify-center text-white text-sm font-medium",
                      "bg-red-500"
                    )} style={{ width: `${Math.max((oem.rejected / oem.total) * 100, 10)}%`, minWidth: '60px' }}>
                      {oem.rejected} Lost
                    </div>
                  </div>
                </div>

                {/* Expanded Deals List */}
                {isExpanded && deals.length > 0 && (
                  <div className="border-t pt-4 mt-4 space-y-2">
                    <div className="text-sm font-medium text-muted-foreground mb-3">
                      Deal Registrations ({deals.length})
                    </div>
                    <div className="grid gap-2">
                      {deals.map(deal => (
                        <div 
                          key={deal.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              statusColors[deal.status as keyof typeof statusColors] || 'bg-gray-500'
                            )} />
                            <div>
                              <div className="font-medium">{deal.dr_number}</div>
                              <div className="text-sm text-muted-foreground">{deal.customer_name}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">₹{((deal.opportunity_value || 0) / 100000).toFixed(1)}L</div>
                            <Badge variant="outline" className="text-xs">
                              {deal.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
