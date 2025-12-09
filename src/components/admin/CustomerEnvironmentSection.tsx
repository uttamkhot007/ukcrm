import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Monitor, Server, Cloud, Network, HardDrive, Shield, 
  Save, Loader2, MapPin
} from "lucide-react";

interface CustomerEnvironmentSectionProps {
  organizationId: string;
  isEditable?: boolean;
}

interface CustomerEnvironment {
  total_endpoints: number;
  total_servers: number;
  total_users: number;
  num_branches: number;
  endpoint_os: string[];
  server_os: string[];
  system_environment: string;
  domain_type: string;
  cloud_providers: string[];
  on_prem_locations: string[];
  datacenter_type: string;
  network_devices: number;
  compliance_requirements: string[];
  critical_applications: string[];
  environment_notes: string;
}

const OS_OPTIONS = ['Windows 10', 'Windows 11', 'Windows Server 2019', 'Windows Server 2022', 'Ubuntu', 'CentOS', 'RHEL', 'macOS'];
const CLOUD_PROVIDERS = ['AWS', 'Azure', 'GCP', 'Oracle Cloud', 'Private Cloud', 'Hybrid Cloud'];
const COMPLIANCE_OPTIONS = ['ISO 27001', 'SOC 2', 'GDPR', 'HIPAA', 'PCI DSS', 'NIST', 'SEBI', 'RBI'];
const DATACENTER_OPTIONS = ['On-Premise', 'Colocation', 'Cloud', 'Hybrid'];
const DOMAIN_OPTIONS = ['Active Directory', 'Azure AD', 'Hybrid AD', 'Workgroup'];
const ENVIRONMENT_OPTIONS = ['Production', 'Development', 'Staging', 'Mixed'];

const defaultEnvironment: CustomerEnvironment = {
  total_endpoints: 0, total_servers: 0, total_users: 0, num_branches: 0,
  endpoint_os: [], server_os: [], system_environment: '', domain_type: '',
  cloud_providers: [], on_prem_locations: [], datacenter_type: '', network_devices: 0,
  compliance_requirements: [], critical_applications: [], environment_notes: '',
};

export function CustomerEnvironmentSection({ organizationId, isEditable = true }: CustomerEnvironmentSectionProps) {
  const queryClient = useQueryClient();
  const [environment, setEnvironment] = useState<CustomerEnvironment>(defaultEnvironment);
  const [newApplication, setNewApplication] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const { data: organization, isLoading } = useQuery({
    queryKey: ['alliance-org-environment', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alliance_organizations')
        .select('customer_environment')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (organization?.customer_environment) {
      setEnvironment({ ...defaultEnvironment, ...(organization.customer_environment as unknown as CustomerEnvironment) });
    }
  }, [organization]);

  const saveMutation = useMutation({
    mutationFn: async (data: CustomerEnvironment) => {
      const { error } = await supabase
        .from('alliance_organizations')
        .update({ customer_environment: JSON.parse(JSON.stringify(data)), updated_at: new Date().toISOString() })
        .eq('id', organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alliance-org-environment', organizationId] });
      toast.success('Customer environment saved');
    },
    onError: (error: Error) => toast.error('Failed to save: ' + error.message),
  });

  const updateField = <K extends keyof CustomerEnvironment>(field: K, value: CustomerEnvironment[K]) => {
    setEnvironment(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: keyof CustomerEnvironment, item: string) => {
    const arr = environment[field] as string[];
    updateField(field, (arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]) as CustomerEnvironment[typeof field]);
  };

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Customer Environment</h3>
          <p className="text-sm text-muted-foreground">Define IT infrastructure and environment details for implementation planning</p>
        </div>
        {isEditable && (
          <Button onClick={() => saveMutation.mutate(environment)} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Environment
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Monitor className="h-4 w-4" />Infrastructure</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {(['total_endpoints', 'total_servers', 'total_users', 'num_branches', 'network_devices'] as const).map((key) => (
              <div key={key} className="space-y-2">
                <Label>{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace('Num ', '')}</Label>
                <Input type="number" value={environment[key] || ''} onChange={(e) => updateField(key, parseInt(e.target.value) || 0)} disabled={!isEditable} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Server className="h-4 w-4" />System Environment</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Domain Type</Label>
              <Select value={environment.domain_type} onValueChange={(v) => updateField('domain_type', v)} disabled={!isEditable}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{DOMAIN_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select value={environment.system_environment} onValueChange={(v) => updateField('system_environment', v)} disabled={!isEditable}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{ENVIRONMENT_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Datacenter</Label>
              <Select value={environment.datacenter_type} onValueChange={(v) => updateField('datacenter_type', v)} disabled={!isEditable}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{DATACENTER_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><HardDrive className="h-4 w-4" />Operating Systems</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Endpoint OS</Label>
              <div className="flex flex-wrap gap-2">{OS_OPTIONS.filter(os => !os.includes('Server')).map(os => (
                <div key={os} className="flex items-center space-x-2"><Checkbox id={`ep-${os}`} checked={environment.endpoint_os.includes(os)} onCheckedChange={() => toggleArrayItem('endpoint_os', os)} disabled={!isEditable} /><Label htmlFor={`ep-${os}`} className="text-sm">{os}</Label></div>
              ))}</div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Server OS</Label>
              <div className="flex flex-wrap gap-2">{OS_OPTIONS.filter(os => os.includes('Server') || ['Ubuntu', 'CentOS', 'RHEL'].includes(os)).map(os => (
                <div key={os} className="flex items-center space-x-2"><Checkbox id={`srv-${os}`} checked={environment.server_os.includes(os)} onCheckedChange={() => toggleArrayItem('server_os', os)} disabled={!isEditable} /><Label htmlFor={`srv-${os}`} className="text-sm">{os}</Label></div>
              ))}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Cloud className="h-4 w-4" />Cloud & Compliance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">{CLOUD_PROVIDERS.map(p => (
              <div key={p} className="flex items-center space-x-2"><Checkbox checked={environment.cloud_providers.includes(p)} onCheckedChange={() => toggleArrayItem('cloud_providers', p)} disabled={!isEditable} /><Label className="text-sm">{p}</Label></div>
            ))}</div>
            <Separator />
            <div className="flex flex-wrap gap-2">{COMPLIANCE_OPTIONS.map(c => (
              <div key={c} className="flex items-center space-x-2"><Checkbox checked={environment.compliance_requirements.includes(c)} onCheckedChange={() => toggleArrayItem('compliance_requirements', c)} disabled={!isEditable} /><Label className="text-sm">{c}</Label></div>
            ))}</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">Environment Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={environment.environment_notes} onChange={(e) => updateField('environment_notes', e.target.value)} disabled={!isEditable} rows={3} placeholder="Additional notes..." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
