/**
 * Platform Console → System Status
 *
 * Read-only dashboard showing whether each platform-level provider is
 * configured and reachable. Distinct from /admin/platform/integrations
 * (which lets super admins toggle which integrations tenants can connect):
 * THIS page answers "is the deploy actually wired up to send emails / charge
 * cards / call the AI provider?".
 *
 * Data source: GET /api/platform/status on the self-hosted backend.
 */

import { useQuery } from '@tanstack/react-query';
import { restRequest } from '@/integrations/api/rest-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  Mail,
  Sparkles,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PauseCircle,
  RefreshCw,
  Loader2,
  Shield,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type ProviderStatus = 'ready' | 'not_configured' | 'error' | 'disabled';

interface ProviderCheck {
  id: string;
  name: string;
  category: 'payments' | 'email' | 'ai' | 'search' | 'storage' | 'monitoring';
  status: ProviderStatus;
  detail: string;
  requiredEnv?: string[];
  checkedAt: string;
}

interface StatusResponse {
  generatedAt: string;
  summary: {
    ready: number;
    not_configured: number;
    disabled: number;
    error: number;
    total: number;
  };
  providers: ProviderCheck[];
}

const CATEGORY_META: Record<
  ProviderCheck['category'],
  { label: string; Icon: typeof CreditCard }
> = {
  payments: { label: 'Payments', Icon: CreditCard },
  email: { label: 'Email', Icon: Mail },
  ai: { label: 'AI Providers', Icon: Sparkles },
  search: { label: 'Search', Icon: Activity },
  storage: { label: 'Storage', Icon: HardDrive },
  monitoring: { label: 'Database & Monitoring', Icon: Shield },
};

const STATUS_META: Record<
  ProviderStatus,
  { label: string; Icon: typeof CheckCircle2; tone: string }
> = {
  ready: {
    label: 'Ready',
    Icon: CheckCircle2,
    tone: 'text-emerald-500 border-emerald-500/40 bg-emerald-500/5',
  },
  not_configured: {
    label: 'Not configured',
    Icon: AlertTriangle,
    tone: 'text-amber-500 border-amber-500/40 bg-amber-500/5',
  },
  disabled: {
    label: 'Disabled',
    Icon: PauseCircle,
    tone: 'text-muted-foreground border-border bg-muted/40',
  },
  error: {
    label: 'Error',
    Icon: XCircle,
    tone: 'text-destructive border-destructive/40 bg-destructive/5',
  },
};

export default function PlatformStatus() {
  const { data, isLoading, isFetching, error, refetch } = useQuery<StatusResponse>({
    queryKey: ['platform-status'],
    queryFn: () => restRequest<StatusResponse>('/api/platform/status'),
    refetchInterval: 60_000, // Auto-refresh every minute
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <XCircle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-sm">Could not load platform status.</p>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : 'Status endpoint did not respond.'}
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const grouped = data.providers.reduce<Record<string, ProviderCheck[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">System Status</h2>
          <p className="text-sm text-muted-foreground">
            Live readiness of payments, email, AI, storage, and database providers across this
            deployment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })}
          </span>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryStat label="Ready" value={data.summary.ready} tone={STATUS_META.ready.tone} />
        <SummaryStat
          label="Not configured"
          value={data.summary.not_configured}
          tone={STATUS_META.not_configured.tone}
        />
        <SummaryStat label="Disabled" value={data.summary.disabled} tone={STATUS_META.disabled.tone} />
        <SummaryStat label="Errors" value={data.summary.error} tone={STATUS_META.error.tone} />
      </div>

      {/* Provider groups */}
      {Object.entries(grouped).map(([category, providers]) => {
        const meta = CATEGORY_META[category as ProviderCheck['category']];
        const Icon = meta?.Icon ?? Activity;
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="w-4 h-4 text-primary" />
                {meta?.label ?? category}
              </CardTitle>
              <CardDescription className="text-xs">
                {providers.length} provider{providers.length === 1 ? '' : 's'} in this category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {providers.map((p) => (
                <ProviderRow key={p.id} provider={p} />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className={`border ${tone}`}>
      <CardContent className="p-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs">{label}</p>
      </CardContent>
    </Card>
  );
}

function ProviderRow({ provider }: { provider: ProviderCheck }) {
  const meta = STATUS_META[provider.status];
  const StatusIcon = meta.Icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <div className={`mt-0.5 ${meta.tone.split(' ')[0]}`}>
        <StatusIcon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{provider.name}</span>
          <Badge variant="outline" className={`text-[10px] ${meta.tone}`}>
            {meta.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{provider.detail}</p>
        {provider.requiredEnv && provider.status !== 'ready' && provider.status !== 'disabled' && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Requires:{' '}
            {provider.requiredEnv.map((env, i) => (
              <code
                key={env}
                className="px-1 py-0.5 rounded bg-muted text-[10px] text-foreground mr-1"
              >
                {env}
                {i < provider.requiredEnv!.length - 1 ? '' : ''}
              </code>
            ))}
          </p>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
        {formatDistanceToNow(new Date(provider.checkedAt), { addSuffix: true })}
      </span>
    </div>
  );
}
