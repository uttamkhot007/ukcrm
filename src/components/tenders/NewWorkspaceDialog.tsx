import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Package, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
}

interface OEM {
  id: string;
  name: string;
  website: string | null;
}

interface NewWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const WORKSPACE_TYPES = [
  { value: 'rfp_spec', label: 'RFP Specification', description: 'Generate technical requirements document' },
  { value: 'rfp_response', label: 'RFP Response', description: 'Create response to tender requirements' },
  { value: 'technical_proposal', label: 'Technical Proposal', description: 'Generate technical solution proposal' },
];

const AI_MODELS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast, Recommended)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Best Quality)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Balanced)' },
  { value: 'openai/gpt-5', label: 'GPT-5 (Premium)' },
];

export function NewWorkspaceDialog({ open, onOpenChange, onSuccess }: NewWorkspaceDialogProps) {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [oems, setOems] = useState<OEM[]>([]);
  const [productOpen, setProductOpen] = useState(false);
  const [oemOpen, setOemOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    workspace_type: 'rfp_spec',
    solution_name: '',
    solution_id: '',
    solution_description: '',
    oem_name: '',
    oem_id: '',
    customer_name: '',
    selected_ai_model: 'google/gemini-2.5-flash',
    include_branding: true,
    notes: '',
  });

  // Fetch products and OEMs
  useEffect(() => {
    if (open && currentTenant?.id) {
      fetchProducts();
      fetchOems();
    }
  }, [open, currentTenant?.id]);

  const fetchProducts = async () => {
    if (!currentTenant?.id) return;
    const { data, error } = await supabase
      .from('offerings_products' as any)
      .select('id, name, description, category')
      .eq('tenant_id', currentTenant.id)
      .eq('status', 'active')
      .order('name');
    
    if (!error && data) {
      setProducts(data as unknown as Product[]);
    }
  };

  const fetchOems = async () => {
    if (!currentTenant?.id) return;
    const { data, error } = await supabase
      .from('offerings_oems')
      .select('id, name, website')
      .eq('tenant_id', currentTenant.id)
      .eq('status', 'active')
      .order('name');
    
    if (!error && data) {
      setOems(data as OEM[]);
    }
  };

  const handleProductSelect = (product: Product) => {
    setFormData({
      ...formData,
      solution_name: product.name,
      solution_id: product.id,
      solution_description: product.description || '',
      title: formData.title || `RFP Specs for ${product.name}`,
    });
    setProductOpen(false);
  };

  const handleOemSelect = (oem: OEM) => {
    setFormData({
      ...formData,
      oem_name: oem.name,
      oem_id: oem.id,
    });
    setOemOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!formData.solution_name.trim()) {
      toast.error('Please select or enter a solution name');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('tender_workspaces').insert({
        tenant_id: currentTenant?.id,
        title: formData.title,
        workspace_type: formData.workspace_type,
        solution_name: formData.solution_name,
        solution_description: formData.solution_description || null,
        oem_name: formData.oem_name || null,
        customer_name: formData.customer_name || null,
        selected_ai_model: formData.selected_ai_model,
        include_branding: formData.include_branding,
        notes: formData.notes || null,
        created_by: user?.id,
        status: 'draft',
        progress_percent: 0,
      });

      if (error) throw error;

      toast.success('Workspace created successfully!');
      onSuccess();
      onOpenChange(false);
      setFormData({
        title: '',
        workspace_type: 'rfp_spec',
        solution_name: '',
        solution_id: '',
        solution_description: '',
        oem_name: '',
        oem_id: '',
        customer_name: '',
        selected_ai_model: 'google/gemini-2.5-flash',
        include_branding: true,
        notes: '',
      });
    } catch (error: any) {
      console.error('Error creating workspace:', error);
      toast.error(error.message || 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tender Workspace</DialogTitle>
          <DialogDescription>
            Set up a new workspace for AI-powered document generation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Workspace Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Endpoint Security RFP for ABC Corp"
            />
          </div>

          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select 
              value={formData.workspace_type} 
              onValueChange={(v) => setFormData({ ...formData, workspace_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKSPACE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Solution/Product *</Label>
            <Popover open={productOpen} onOpenChange={setProductOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={productOpen}
                  className="w-full justify-between"
                >
                  {formData.solution_name ? (
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      {formData.solution_name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select a product...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search products..." />
                  <CommandList>
                    <CommandEmpty>
                      <div className="p-2 text-sm text-muted-foreground">
                        No products found. You can type a custom name below.
                      </div>
                    </CommandEmpty>
                    <CommandGroup heading="Products">
                      {products.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={product.name}
                          onSelect={() => handleProductSelect(product)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.solution_id === product.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{product.name}</span>
                            {product.category && (
                              <span className="text-xs text-muted-foreground">{product.category}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
                <div className="border-t p-2">
                  <Input
                    placeholder="Or type custom product name..."
                    value={formData.solution_id ? '' : formData.solution_name}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      solution_name: e.target.value,
                      solution_id: '',
                      solution_description: ''
                    })}
                  />
                </div>
              </PopoverContent>
            </Popover>
            {formData.solution_description && (
              <p className="text-xs text-muted-foreground mt-1">{formData.solution_description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>OEM/Vendor</Label>
              <Popover open={oemOpen} onOpenChange={setOemOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={oemOpen}
                    className="w-full justify-between"
                  >
                    {formData.oem_name ? (
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {formData.oem_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select OEM...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search OEMs..." />
                    <CommandList>
                      <CommandEmpty>No OEMs found.</CommandEmpty>
                      <CommandGroup heading="OEMs">
                        {oems.map((oem) => (
                          <CommandItem
                            key={oem.id}
                            value={oem.name}
                            onSelect={() => handleOemSelect(oem)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.oem_id === oem.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span>{oem.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  <div className="border-t p-2">
                    <Input
                      placeholder="Or type custom OEM..."
                      value={formData.oem_id ? '' : formData.oem_name}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        oem_name: e.target.value,
                        oem_id: ''
                      })}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="e.g., ABC Corporation"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>AI Model</Label>
            <Select 
              value={formData.selected_ai_model} 
              onValueChange={(v) => setFormData({ ...formData, selected_ai_model: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Include Branding</Label>
              <p className="text-xs text-muted-foreground">Add company branding to exports</p>
            </div>
            <Switch
              checked={formData.include_branding}
              onCheckedChange={(c) => setFormData({ ...formData, include_branding: c })}
            />
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any specific requirements or context..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
