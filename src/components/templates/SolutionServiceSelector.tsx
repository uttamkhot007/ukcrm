import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Wrench, Building2 } from "lucide-react";

// Pre-defined solutions and services
const PREDEFINED_SOLUTIONS = [
  { id: 'cybersecurity', name: 'Cybersecurity Solutions', category: 'Security' },
  { id: 'cloud_infra', name: 'Cloud Infrastructure', category: 'Infrastructure' },
  { id: 'managed_services', name: 'Managed Services', category: 'Services' },
  { id: 'data_analytics', name: 'Data Analytics', category: 'Analytics' },
  { id: 'erp', name: 'ERP Solutions', category: 'Enterprise' },
  { id: 'crm', name: 'CRM Solutions', category: 'Enterprise' },
  { id: 'custom_dev', name: 'Custom Development', category: 'Development' },
  { id: 'consulting', name: 'IT Consulting', category: 'Services' },
  { id: 'support', name: 'Technical Support', category: 'Services' },
  { id: 'training', name: 'Training & Certification', category: 'Services' },
];

const PREDEFINED_SERVICES = [
  { id: 'implementation', name: 'Implementation', description: 'Full implementation service' },
  { id: 'configuration', name: 'Configuration', description: 'System configuration and setup' },
  { id: 'integration', name: 'Integration', description: 'Third-party integrations' },
  { id: 'migration', name: 'Migration', description: 'Data and system migration' },
  { id: 'maintenance', name: 'Annual Maintenance', description: 'AMC services' },
  { id: 'support_basic', name: 'Basic Support', description: '8x5 support' },
  { id: 'support_premium', name: 'Premium Support', description: '24x7 support' },
  { id: 'training', name: 'Training', description: 'User and admin training' },
  { id: 'customization', name: 'Customization', description: 'Custom development work' },
  { id: 'licensing', name: 'Licensing', description: 'Software licenses' },
];

const PAYMENT_TERMS = [
  { id: 'net_30', name: 'Net 30', description: 'Payment due in 30 days' },
  { id: 'net_45', name: 'Net 45', description: 'Payment due in 45 days' },
  { id: 'net_60', name: 'Net 60', description: 'Payment due in 60 days' },
  { id: 'immediate', name: 'Due on Receipt', description: 'Payment due immediately' },
  { id: 'advance', name: '100% Advance', description: 'Full payment before delivery' },
  { id: 'milestone', name: 'Milestone Based', description: 'Payment on project milestones' },
  { id: 'partial_advance', name: '50% Advance', description: '50% advance, 50% on completion' },
  { id: 'custom', name: 'Custom Terms', description: 'Custom payment schedule' },
];

interface SolutionServiceSelectorProps {
  selectedSolutions: string[];
  selectedServices: string[];
  selectedPaymentTerms: string;
  customPaymentTerms?: string;
  onSolutionsChange: (solutions: string[]) => void;
  onServicesChange: (services: string[]) => void;
  onPaymentTermsChange: (terms: string) => void;
  onCustomPaymentTermsChange?: (terms: string) => void;
  compact?: boolean;
}

export function SolutionServiceSelector({
  selectedSolutions,
  selectedServices,
  selectedPaymentTerms,
  customPaymentTerms,
  onSolutionsChange,
  onServicesChange,
  onPaymentTermsChange,
  onCustomPaymentTermsChange,
  compact = false,
}: SolutionServiceSelectorProps) {
  const { currentTenant } = useTenant();

  // Fetch organization's custom solutions if available
  const { data: orgSolutions = [] } = useQuery({
    queryKey: ['org-solutions', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from('alliance_organizations')
        .select('solutions')
        .eq('tenant_id', currentTenant.id)
        .limit(1)
        .single();
      if (error) return [];
      return (data?.solutions || []) as string[];
    },
    enabled: !!currentTenant?.id,
  });

  const toggleSolution = (solutionId: string) => {
    if (selectedSolutions.includes(solutionId)) {
      onSolutionsChange(selectedSolutions.filter(s => s !== solutionId));
    } else {
      onSolutionsChange([...selectedSolutions, solutionId]);
    }
  };

  const toggleService = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      onServicesChange(selectedServices.filter(s => s !== serviceId));
    } else {
      onServicesChange([...selectedServices, serviceId]);
    }
  };

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Solution Type
            </Label>
            <Select 
              value={selectedSolutions[0] || ''} 
              onValueChange={(v) => onSolutionsChange(v ? [v] : [])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select solution" />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_SOLUTIONS.map((solution) => (
                  <SelectItem key={solution.id} value={solution.id}>
                    {solution.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Service Type
            </Label>
            <Select 
              value={selectedServices[0] || ''} 
              onValueChange={(v) => onServicesChange(v ? [v] : [])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_SERVICES.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Payment Terms</Label>
          <Select value={selectedPaymentTerms} onValueChange={onPaymentTermsChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment terms" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TERMS.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPaymentTerms === 'custom' && onCustomPaymentTermsChange && (
            <Input
              placeholder="Enter custom payment terms..."
              value={customPaymentTerms || ''}
              onChange={(e) => onCustomPaymentTermsChange(e.target.value)}
              className="mt-2"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Solutions Section */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-base font-medium">
          <Package className="h-4 w-4" />
          Solutions
        </Label>
        <ScrollArea className="h-32 border rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2">
            {PREDEFINED_SOLUTIONS.map((solution) => (
              <div
                key={solution.id}
                className="flex items-center space-x-2"
              >
                <Checkbox
                  id={`solution-${solution.id}`}
                  checked={selectedSolutions.includes(solution.id)}
                  onCheckedChange={() => toggleSolution(solution.id)}
                />
                <label
                  htmlFor={`solution-${solution.id}`}
                  className="text-sm cursor-pointer flex items-center gap-1"
                >
                  {solution.name}
                  <Badge variant="outline" className="text-xs ml-1">
                    {solution.category}
                  </Badge>
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
        {selectedSolutions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedSolutions.map(id => {
              const solution = PREDEFINED_SOLUTIONS.find(s => s.id === id);
              return solution ? (
                <Badge key={id} variant="secondary" className="text-xs">
                  {solution.name}
                </Badge>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Services Section */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-base font-medium">
          <Wrench className="h-4 w-4" />
          Services
        </Label>
        <ScrollArea className="h-32 border rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2">
            {PREDEFINED_SERVICES.map((service) => (
              <div
                key={service.id}
                className="flex items-center space-x-2"
              >
                <Checkbox
                  id={`service-${service.id}`}
                  checked={selectedServices.includes(service.id)}
                  onCheckedChange={() => toggleService(service.id)}
                />
                <label
                  htmlFor={`service-${service.id}`}
                  className="text-sm cursor-pointer"
                  title={service.description}
                >
                  {service.name}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
        {selectedServices.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedServices.map(id => {
              const service = PREDEFINED_SERVICES.find(s => s.id === id);
              return service ? (
                <Badge key={id} variant="secondary" className="text-xs">
                  {service.name}
                </Badge>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Payment Terms Section */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-base font-medium">
          <Building2 className="h-4 w-4" />
          Payment Terms
        </Label>
        <Select value={selectedPaymentTerms} onValueChange={onPaymentTermsChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select payment terms" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_TERMS.map((term) => (
              <SelectItem key={term.id} value={term.id}>
                <div className="flex flex-col">
                  <span>{term.name}</span>
                  <span className="text-xs text-muted-foreground">{term.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedPaymentTerms === 'custom' && onCustomPaymentTermsChange && (
          <Input
            placeholder="Enter custom payment terms..."
            value={customPaymentTerms || ''}
            onChange={(e) => onCustomPaymentTermsChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

export { PREDEFINED_SOLUTIONS, PREDEFINED_SERVICES, PAYMENT_TERMS };
