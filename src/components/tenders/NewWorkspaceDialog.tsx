import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
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
  const [formData, setFormData] = useState({
    title: '',
    workspace_type: 'rfp_spec',
    solution_name: '',
    oem_name: '',
    customer_name: '',
    selected_ai_model: 'google/gemini-2.5-flash',
    include_branding: true,
    notes: '',
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!formData.solution_name.trim()) {
      toast.error('Please enter a solution name');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('tender_workspaces').insert({
        tenant_id: currentTenant?.id,
        title: formData.title,
        workspace_type: formData.workspace_type,
        solution_name: formData.solution_name,
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
        oem_name: '',
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
      <DialogContent className="max-w-lg">
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
            <Label>Solution/Product Name *</Label>
            <Input
              value={formData.solution_name}
              onChange={(e) => setFormData({ ...formData, solution_name: e.target.value })}
              placeholder="e.g., Cynet 360 AutoXDR, CrowdStrike Falcon"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>OEM/Vendor Name</Label>
              <Input
                value={formData.oem_name}
                onChange={(e) => setFormData({ ...formData, oem_name: e.target.value })}
                placeholder="e.g., Cynet, CrowdStrike"
              />
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
