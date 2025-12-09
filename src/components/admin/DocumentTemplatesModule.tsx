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
  ClipboardList, Receipt, Quote, FileCheck, Palette, Download, Sparkles
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

// Professional sample templates with different themes
const SAMPLE_TEMPLATES = [
  // POC Plans
  {
    name: 'Modern POC Template',
    description: 'Clean, modern design with blue accent colors. Ideal for technology solutions.',
    template_type: 'poc_plan',
    content: DEFAULT_TEMPLATES.poc_plan,
    header_content: { showLogo: true, logoPosition: 'left', showDate: true, showVersion: true },
    footer_content: { showPageNumbers: true, showConfidential: true, customText: 'Confidential - For Internal Use Only' },
    branding: {
      theme: 'modern',
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      accentColor: '#60a5fa',
      fontFamily: 'Inter',
      headerFont: 'Inter',
      headerStyle: 'gradient',
      borderRadius: '8px',
      shadowStyle: 'soft',
    },
  },
  {
    name: 'Enterprise POC Template',
    description: 'Professional enterprise design with dark theme. Perfect for corporate clients.',
    template_type: 'poc_plan',
    content: DEFAULT_TEMPLATES.poc_plan,
    header_content: { showLogo: true, logoPosition: 'center', showDate: true, showVersion: true },
    footer_content: { showPageNumbers: true, showConfidential: true, customText: 'Enterprise Confidential' },
    branding: {
      theme: 'enterprise',
      primaryColor: '#1f2937',
      secondaryColor: '#111827',
      accentColor: '#f59e0b',
      fontFamily: 'Source Sans Pro',
      headerFont: 'Montserrat',
      headerStyle: 'solid',
      borderRadius: '4px',
      shadowStyle: 'sharp',
    },
  },
  // Implementation Plans
  {
    name: 'Technical Implementation Blueprint',
    description: 'Detailed technical template with green theme. Includes environment details and RACI matrix.',
    template_type: 'implementation_plan',
    content: {
      ...DEFAULT_TEMPLATES.implementation_plan,
      showGanttChart: true,
      showEnvironmentDiagram: true,
    },
    header_content: { showLogo: true, logoPosition: 'left', showProjectName: true, showVersion: true },
    footer_content: { showPageNumbers: true, showRevisionHistory: true },
    branding: {
      theme: 'technical',
      primaryColor: '#059669',
      secondaryColor: '#047857',
      accentColor: '#34d399',
      fontFamily: 'IBM Plex Sans',
      headerFont: 'IBM Plex Sans',
      headerStyle: 'minimal',
      borderRadius: '6px',
      shadowStyle: 'none',
      tableStyle: 'striped',
    },
  },
  {
    name: 'Executive Implementation Plan',
    description: 'High-level executive template with purple theme. Focus on milestones and outcomes.',
    template_type: 'implementation_plan',
    content: {
      ...DEFAULT_TEMPLATES.implementation_plan,
      showExecutiveDashboard: true,
      showMilestoneTracker: true,
    },
    header_content: { showLogo: true, logoPosition: 'right', showDate: true },
    footer_content: { showPageNumbers: true, showConfidential: true },
    branding: {
      theme: 'executive',
      primaryColor: '#7c3aed',
      secondaryColor: '#6d28d9',
      accentColor: '#a78bfa',
      fontFamily: 'Nunito Sans',
      headerFont: 'Playfair Display',
      headerStyle: 'elegant',
      borderRadius: '12px',
      shadowStyle: 'elevated',
    },
  },
  // Invoices
  {
    name: 'Professional Invoice - Blue',
    description: 'Clean professional invoice with blue header and organized layout.',
    template_type: 'invoice',
    content: DEFAULT_TEMPLATES.invoice,
    header_content: { showLogo: true, showCompanyAddress: true, invoiceTitle: 'INVOICE' },
    footer_content: { showBankDetails: true, showPaymentQR: false, thankYouMessage: 'Thank you for your business!' },
    branding: {
      theme: 'professional-blue',
      primaryColor: '#1d4ed8',
      secondaryColor: '#1e40af',
      accentColor: '#3b82f6',
      fontFamily: 'Open Sans',
      headerFont: 'Roboto',
      headerStyle: 'boxed',
      tableHeaderBg: '#1d4ed8',
      tableHeaderText: '#ffffff',
      borderRadius: '4px',
    },
  },
  {
    name: 'Minimal Invoice - Monochrome',
    description: 'Sleek minimal design with black and white theme. Modern and clean.',
    template_type: 'invoice',
    content: DEFAULT_TEMPLATES.invoice,
    header_content: { showLogo: true, showCompanyAddress: true, invoiceTitle: 'Invoice' },
    footer_content: { showBankDetails: true, showPaymentQR: false, thankYouMessage: 'We appreciate your trust in us.' },
    branding: {
      theme: 'minimal-mono',
      primaryColor: '#18181b',
      secondaryColor: '#27272a',
      accentColor: '#71717a',
      fontFamily: 'Inter',
      headerFont: 'Inter',
      headerStyle: 'line',
      tableHeaderBg: '#f4f4f5',
      tableHeaderText: '#18181b',
      borderRadius: '0px',
    },
  },
  {
    name: 'Creative Invoice - Gradient',
    description: 'Eye-catching gradient design. Perfect for creative agencies and startups.',
    template_type: 'invoice',
    content: DEFAULT_TEMPLATES.invoice,
    header_content: { showLogo: true, showCompanyAddress: true, invoiceTitle: 'INVOICE' },
    footer_content: { showBankDetails: true, showPaymentQR: true, thankYouMessage: 'Thanks for choosing us!' },
    branding: {
      theme: 'creative-gradient',
      primaryColor: '#ec4899',
      secondaryColor: '#8b5cf6',
      accentColor: '#f472b6',
      gradientStart: '#ec4899',
      gradientEnd: '#8b5cf6',
      fontFamily: 'Poppins',
      headerFont: 'Poppins',
      headerStyle: 'gradient',
      tableHeaderBg: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
      tableHeaderText: '#ffffff',
      borderRadius: '16px',
    },
  },
  // Quotes
  {
    name: 'Sales Quote - Professional',
    description: 'Professional quote template with teal accents. Includes validity period and terms.',
    template_type: 'quote',
    content: DEFAULT_TEMPLATES.quote,
    header_content: { showLogo: true, showQuoteValidity: true, title: 'QUOTATION' },
    footer_content: { showTerms: true, showSignature: true },
    branding: {
      theme: 'sales-pro',
      primaryColor: '#0d9488',
      secondaryColor: '#0f766e',
      accentColor: '#2dd4bf',
      fontFamily: 'Lato',
      headerFont: 'Lato',
      headerStyle: 'modern',
      highlightColor: '#ccfbf1',
      borderRadius: '8px',
    },
  },
  {
    name: 'Quote - Enterprise Dark',
    description: 'Dark theme quote for enterprise clients. Premium and sophisticated look.',
    template_type: 'quote',
    content: DEFAULT_TEMPLATES.quote,
    header_content: { showLogo: true, showQuoteValidity: true, title: 'Price Quotation' },
    footer_content: { showTerms: true, showSignature: true, showContactInfo: true },
    branding: {
      theme: 'enterprise-dark',
      primaryColor: '#0f172a',
      secondaryColor: '#1e293b',
      accentColor: '#f97316',
      fontFamily: 'Source Sans Pro',
      headerFont: 'Montserrat',
      headerStyle: 'dark',
      highlightColor: '#fed7aa',
      borderRadius: '6px',
      darkMode: true,
    },
  },
  // Proposals
  {
    name: 'Business Proposal - Classic',
    description: 'Traditional business proposal with navy blue theme. Formal and trustworthy.',
    template_type: 'proposal',
    content: DEFAULT_TEMPLATES.proposal,
    header_content: { showLogo: true, showCoverPage: true, showTOC: true },
    footer_content: { showPageNumbers: true, showCompanyInfo: true },
    branding: {
      theme: 'classic-business',
      primaryColor: '#1e3a5f',
      secondaryColor: '#0c1f3d',
      accentColor: '#4a90d9',
      fontFamily: 'Georgia',
      headerFont: 'Playfair Display',
      headerStyle: 'classic',
      coverStyle: 'centered',
      borderRadius: '4px',
    },
  },
  {
    name: 'Modern Proposal - Vibrant',
    description: 'Contemporary proposal design with vibrant coral theme. Stands out from competition.',
    template_type: 'proposal',
    content: DEFAULT_TEMPLATES.proposal,
    header_content: { showLogo: true, showCoverPage: true, showTOC: true },
    footer_content: { showPageNumbers: true, showSocialLinks: true },
    branding: {
      theme: 'modern-vibrant',
      primaryColor: '#f43f5e',
      secondaryColor: '#e11d48',
      accentColor: '#fb7185',
      fontFamily: 'Nunito',
      headerFont: 'Archivo',
      headerStyle: 'bold',
      coverStyle: 'fullbleed',
      borderRadius: '12px',
      useIcons: true,
    },
  },
  {
    name: 'Tech Proposal - Futuristic',
    description: 'Futuristic design for tech companies. Cyan accents with dark elements.',
    template_type: 'proposal',
    content: DEFAULT_TEMPLATES.proposal,
    header_content: { showLogo: true, showCoverPage: true, showTOC: true },
    footer_content: { showPageNumbers: true, showVersion: true },
    branding: {
      theme: 'tech-futuristic',
      primaryColor: '#06b6d4',
      secondaryColor: '#0891b2',
      accentColor: '#22d3ee',
      fontFamily: 'Space Grotesk',
      headerFont: 'Orbitron',
      headerStyle: 'tech',
      coverStyle: 'geometric',
      borderRadius: '8px',
      useAnimations: true,
    },
  },
];

export function DocumentTemplatesModule() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('my-templates');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
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

  // Add sample template to database
  const addSampleTemplate = async (sample: typeof SAMPLE_TEMPLATES[0]) => {
    setLoadingSampleId(sample.name);
    try {
      const { error } = await supabase.from('document_templates').insert({
        tenant_id: currentTenant?.id,
        name: sample.name,
        description: sample.description,
        template_type: sample.template_type,
        content: sample.content,
        header_content: sample.header_content,
        footer_content: sample.footer_content,
        branding: sample.branding,
        is_default: false,
        created_by: user?.id,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast.success(`Added "${sample.name}" to your templates`);
    } catch (error: any) {
      toast.error('Failed to add template: ' + error.message);
    } finally {
      setLoadingSampleId(null);
    }
  };

  // Check if sample template already exists
  const isSampleAdded = (sampleName: string) => {
    return templates.some(t => t.name === sampleName);
  };

  const filteredTemplates = activeType === 'all' 
    ? templates 
    : templates.filter(t => t.template_type === activeType);

  const filteredSamples = activeType === 'all'
    ? SAMPLE_TEMPLATES
    : SAMPLE_TEMPLATES.filter(t => t.template_type === activeType);

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

      {/* Main Tabs - My Templates vs Sample Gallery */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="my-templates" className="gap-2">
            <FileText className="h-4 w-4" />
            My Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="sample-gallery" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Sample Gallery ({SAMPLE_TEMPLATES.length})
          </TabsTrigger>
        </TabsList>

        {/* Type Filter */}
        <div className="flex gap-2 flex-wrap mb-4">
          <Button
            variant={activeType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveType('all')}
          >
            All Types
          </Button>
          {TEMPLATE_TYPES.map((type) => (
            <Button
              key={type.value}
              variant={activeType === type.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveType(type.value)}
              className="gap-1"
            >
              <type.icon className="h-3 w-3" />
              {type.label}
            </Button>
          ))}
        </div>

        <TabsContent value="my-templates">
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
                  Create your own or add from our sample gallery
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('sample-gallery')}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Browse Samples
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => {
                const typeInfo = getTypeInfo(template.template_type);
                const TypeIcon = typeInfo?.icon || FileText;
                const branding = template.branding as Record<string, any> || {};
                return (
                  <Card key={template.id} className="relative overflow-hidden">
                    {/* Color accent bar */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: branding.primaryColor || 'hsl(var(--primary))' }}
                    />
                    {template.is_default && (
                      <Badge className="absolute top-3 right-2 bg-amber-500">
                        <Star className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-start gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${branding.primaryColor || 'hsl(var(--primary))'}20` }}
                        >
                          <TypeIcon className="h-5 w-5" style={{ color: branding.primaryColor || 'hsl(var(--primary))' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{template.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {typeInfo?.label || template.template_type}
                            </Badge>
                            {branding.theme && (
                              <Badge variant="outline" className="text-xs">
                                <Palette className="h-2 w-2 mr-1" />
                                {branding.theme}
                              </Badge>
                            )}
                          </div>
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
        </TabsContent>

        <TabsContent value="sample-gallery">
          <div className="mb-4">
            <p className="text-muted-foreground">
              Professional templates with unique themes and branding. Click to add to your collection.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSamples.map((sample) => {
              const typeInfo = getTypeInfo(sample.template_type);
              const TypeIcon = typeInfo?.icon || FileText;
              const isAdded = isSampleAdded(sample.name);
              const isLoading = loadingSampleId === sample.name;
              
              return (
                <Card 
                  key={sample.name} 
                  className={`relative overflow-hidden transition-all ${isAdded ? 'opacity-60' : 'hover:shadow-lg hover:-translate-y-1'}`}
                >
                  {/* Gradient header based on template colors */}
                  <div 
                    className="h-20 relative"
                    style={{ 
                      background: sample.branding.gradientStart 
                        ? `linear-gradient(135deg, ${sample.branding.gradientStart}, ${sample.branding.gradientEnd || sample.branding.primaryColor})`
                        : `linear-gradient(135deg, ${sample.branding.primaryColor}, ${sample.branding.secondaryColor})`
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <TypeIcon className="h-8 w-8 text-white/80" />
                    </div>
                    <Badge 
                      className="absolute top-2 right-2 text-xs"
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      {sample.branding.theme}
                    </Badge>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{sample.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {typeInfo?.label}
                        </Badge>
                      </div>
                      {isAdded && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Added
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-2">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {sample.description}
                    </p>
                    
                    {/* Color palette preview */}
                    <div className="flex gap-1 mt-3">
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: sample.branding.primaryColor }}
                        title="Primary"
                      />
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: sample.branding.secondaryColor }}
                        title="Secondary"
                      />
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: sample.branding.accentColor }}
                        title="Accent"
                      />
                      <span className="text-xs text-muted-foreground ml-2 self-center">
                        {sample.branding.fontFamily}
                      </span>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="pt-2">
                    <Button 
                      className="w-full"
                      variant={isAdded ? 'outline' : 'default'}
                      disabled={isAdded || isLoading}
                      onClick={() => addSampleTemplate(sample)}
                      style={!isAdded ? { 
                        backgroundColor: sample.branding.primaryColor,
                        borderColor: sample.branding.primaryColor 
                      } : {}}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : isAdded ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {isAdded ? 'Already Added' : 'Add to My Templates'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
