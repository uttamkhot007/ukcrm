import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  FileText, Plus, Edit, Trash2, Copy, Check, Star, Loader2,
  ClipboardList, Receipt, Quote, FileCheck
} from "lucide-react";

interface DocumentTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  template_type: string;
  content: Record<string, any>;
  header_content: Record<string, any>;
  footer_content: Record<string, any>;
  branding: Record<string, any>;
  is_default: boolean;
  is_active: boolean;
  version: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_TYPES = [
  { value: 'poc_plan', label: 'POC Plan', icon: ClipboardList, description: 'Proof of Concept documentation' },
  { value: 'implementation_plan', label: 'Implementation Plan', icon: FileCheck, description: 'Implementation project documentation' },
  { value: 'invoice', label: 'Invoice', icon: Receipt, description: 'Billing invoices' },
  { value: 'quote', label: 'Quote/Quotation', icon: Quote, description: 'Sales quotes and proposals' },
  { value: 'proposal', label: 'Proposal', icon: FileText, description: 'Business proposals' },
];

const DEFAULT_TEMPLATES: Record<string, any> = {
  poc_plan: {
    sections: [
      { id: 'overview', title: 'Overview', required: true },
      { id: 'objectives', title: 'POC Objectives', required: true },
      { id: 'scope', title: 'Scope', required: true },
      { id: 'success_criteria', title: 'Success Criteria', required: true },
      { id: 'timeline', title: 'Timeline', required: true },
      { id: 'resources', title: 'Resources Required', required: false },
      { id: 'risks', title: 'Risks & Mitigation', required: false },
    ],
  },
  implementation_plan: {
    sections: [
      { id: 'executive_summary', title: 'Executive Summary', required: true },
      { id: 'customer_environment', title: 'Customer Environment', required: true },
      { id: 'solution_architecture', title: 'Solution Architecture', required: true },
      { id: 'implementation_phases', title: 'Implementation Phases', required: true },
      { id: 'milestones', title: 'Milestones & Timeline', required: true },
      { id: 'raci_matrix', title: 'RACI Matrix', required: true },
      { id: 'dependencies', title: 'Dependencies', required: false },
      { id: 'acceptance_criteria', title: 'Acceptance Criteria', required: true },
    ],
  },
  invoice: {
    fields: [
      { id: 'invoice_number', label: 'Invoice Number', type: 'auto' },
      { id: 'invoice_date', label: 'Invoice Date', type: 'date' },
      { id: 'due_date', label: 'Due Date', type: 'date' },
      { id: 'customer_details', label: 'Customer Details', type: 'customer' },
      { id: 'line_items', label: 'Line Items', type: 'table' },
      { id: 'subtotal', label: 'Subtotal', type: 'calculated' },
      { id: 'tax', label: 'Tax', type: 'calculated' },
      { id: 'total', label: 'Total', type: 'calculated' },
      { id: 'payment_terms', label: 'Payment Terms', type: 'text' },
      { id: 'bank_details', label: 'Bank Details', type: 'text' },
    ],
  },
  quote: {
    fields: [
      { id: 'quote_number', label: 'Quote Number', type: 'auto' },
      { id: 'quote_date', label: 'Quote Date', type: 'date' },
      { id: 'valid_until', label: 'Valid Until', type: 'date' },
      { id: 'customer_details', label: 'Customer Details', type: 'customer' },
      { id: 'solution_summary', label: 'Solution Summary', type: 'rich_text' },
      { id: 'line_items', label: 'Line Items', type: 'table' },
      { id: 'terms_conditions', label: 'Terms & Conditions', type: 'rich_text' },
    ],
  },
  proposal: {
    sections: [
      { id: 'cover', title: 'Cover Page', required: true },
      { id: 'executive_summary', title: 'Executive Summary', required: true },
      { id: 'understanding', title: 'Understanding of Requirements', required: true },
      { id: 'proposed_solution', title: 'Proposed Solution', required: true },
      { id: 'pricing', title: 'Pricing', required: true },
      { id: 'timeline', title: 'Timeline', required: true },
      { id: 'about_us', title: 'About Us', required: false },
    ],
  },
};

export function DocumentTemplatesModule() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_type: 'poc_plan',
    is_default: false,
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['document-templates', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('template_type')
        .order('name');
      if (error) throw error;
      return data as DocumentTemplate[];
    },
    enabled: !!currentTenant?.id,
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('document_templates').insert({
        tenant_id: currentTenant?.id,
        name: data.name,
        description: data.description || null,
        template_type: data.template_type,
        content: DEFAULT_TEMPLATES[data.template_type] || {},
        is_default: data.is_default,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      setIsCreateOpen(false);
      setFormData({ name: '', description: '', template_type: 'poc_plan', is_default: false });
      toast.success('Template created');
    },
    onError: (error: any) => {
      toast.error('Failed to create template: ' + error.message);
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DocumentTemplate> }) => {
      const { error } = await supabase
        .from('document_templates')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      setEditingTemplate(null);
      toast.success('Template updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('document_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast.success('Template deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  // Duplicate template
  const duplicateTemplate = async (template: DocumentTemplate) => {
    const { error } = await supabase.from('document_templates').insert({
      tenant_id: currentTenant?.id,
      name: `${template.name} (Copy)`,
      description: template.description,
      template_type: template.template_type,
      content: template.content,
      header_content: template.header_content,
      footer_content: template.footer_content,
      branding: template.branding,
      is_default: false,
      created_by: user?.id,
    });
    if (error) {
      toast.error('Failed to duplicate');
    } else {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast.success('Template duplicated');
    }
  };

  // Set as default
  const setAsDefault = async (template: DocumentTemplate) => {
    // First remove default from other templates of same type
    await supabase
      .from('document_templates')
      .update({ is_default: false })
      .eq('tenant_id', currentTenant?.id)
      .eq('template_type', template.template_type);
    
    // Then set this one as default
    await updateMutation.mutateAsync({ id: template.id, data: { is_default: true } });
  };

  const filteredTemplates = activeType === 'all' 
    ? templates 
    : templates.filter(t => t.template_type === activeType);

  const getTypeInfo = (type: string) => TEMPLATE_TYPES.find(t => t.value === type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Document Templates</h2>
          <p className="text-muted-foreground">
            Manage templates for POC Plans, Implementation Plans, Invoices, and Quotes
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Template Type</Label>
                <Select value={formData.template_type} onValueChange={(v) => setFormData(p => ({ ...p, template_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Standard POC Template"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of this template"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_default">Set as default for this type</Label>
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(c) => setFormData(p => ({ ...p, is_default: c }))}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Create Template
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Type Filter Tabs */}
      <Tabs value={activeType} onValueChange={setActiveType}>
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          {TEMPLATE_TYPES.map((type) => (
            <TabsTrigger key={type.value} value={type.value} className="gap-1">
              <type.icon className="h-3 w-3" />
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Templates Yet</h3>
            <p className="text-muted-foreground mt-2 mb-4">
              Create your first document template to get started
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const typeInfo = getTypeInfo(template.template_type);
            const TypeIcon = typeInfo?.icon || FileText;
            return (
              <Card key={template.id} className="relative">
                {template.is_default && (
                  <Badge className="absolute top-2 right-2 bg-amber-500">
                    <Star className="h-3 w-3 mr-1" />
                    Default
                  </Badge>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TypeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{template.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {typeInfo?.label || template.template_type}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description || 'No description'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Version {template.version} • Updated {new Date(template.updated_at).toLocaleDateString()}
                  </p>
                </CardContent>
                <CardFooter className="pt-2 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => duplicateTemplate(template)}>
                    <Copy className="h-3 w-3 mr-1" />
                    Duplicate
                  </Button>
                  {!template.is_default && (
                    <Button variant="outline" size="sm" onClick={() => setAsDefault(template)}>
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(template.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
