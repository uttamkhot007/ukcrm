import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  FileText, Target, CheckCircle, ListChecks, Users, Calendar,
  Plus, Trash2, Edit, Sparkles, Loader2, Save, Eye, ArrowLeft,
  AlertCircle, Clock, CheckSquare, XSquare, Download, History, Palette
} from 'lucide-react';
import { GanttChart } from './GanttChart';
import { RACIMatrix } from './RACIMatrix';
import { UseCasesSection } from './UseCasesSection';
import { ScopeSection } from './ScopeSection';
import { DocumentExportDialog } from './DocumentExportDialog';

interface SolutionDocumentationPageProps {
  docType: 'poc' | 'implementation';
  teamType: 'technical' | 'solution_engineering';
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  oem?: { name: string } | null;
}

interface DocumentationData {
  id?: string;
  product_id: string;
  doc_type: string;
  title: string;
  customer_name: string;
  problem_statement: string;
  proposed_solution: string;
  scope_inclusions: string[];
  scope_exclusions: string[];
  use_cases: any[];
  milestones: any[];
  raci_matrix: any[];
  additional_notes: string;
  status: string;
  version_number: string;
  prepared_by: string;
  reviewed_by: string;
  approved_by: string;
  revision_history: any[];
  branding: any;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  in_review: 'bg-yellow-500/20 text-yellow-700',
  approved: 'bg-green-500/20 text-green-700',
  active: 'bg-blue-500/20 text-blue-700',
  completed: 'bg-purple-500/20 text-purple-700',
};

export const SolutionDocumentationPage: React.FC<SolutionDocumentationPageProps> = ({
  docType,
  teamType
}) => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  const [formData, setFormData] = useState<DocumentationData>({
    product_id: '',
    doc_type: docType,
    title: '',
    customer_name: '',
    problem_statement: '',
    proposed_solution: '',
    scope_inclusions: [],
    scope_exclusions: [],
    use_cases: [],
    milestones: [],
    raci_matrix: [],
    additional_notes: '',
    status: 'draft',
    version_number: '1.0',
    prepared_by: '',
    reviewed_by: '',
    approved_by: '',
    revision_history: [],
    branding: {},
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['offerings-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offerings_products')
        .select('id, name, description, category, oem:offerings_oems(name)')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data as Product[];
    },
  });

  // Fetch organizations from alliance_organizations (only customers, prospects, partners)
  const { data: organizations = [] } = useQuery({
    queryKey: ['alliance-organizations-list', docType],
    queryFn: async () => {
      // For POC Plans: show prospects and partners
      // For Implementation Plans: show customers and partners
      const validTypes = docType === 'poc' 
        ? ['prospect', 'partner'] 
        : ['customer', 'partner'];
      
      const { data, error } = await supabase
        .from('alliance_organizations')
        .select('id, name, organization_type, status')
        .in('organization_type', validTypes)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing documentation
  const { data: documents = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ['solution-documentation', docType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solution_documentation')
        .select('*, product:offerings_products(name, category)')
        .eq('doc_type', docType)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch document templates
  const templateType = docType === 'poc' ? 'poc_plan' : 'implementation_plan';
  const { data: templates = [] } = useQuery({
    queryKey: ['document-templates', currentTenant?.id, templateType],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('template_type', templateType)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentTenant?.id,
  });

  // Load selected document
  useEffect(() => {
    if (selectedDoc) {
      const doc = documents.find(d => d.id === selectedDoc);
      if (doc) {
        setFormData({
          id: doc.id,
          product_id: doc.product_id,
          doc_type: doc.doc_type,
          title: doc.title,
          customer_name: doc.customer_name || '',
          problem_statement: doc.problem_statement || '',
          proposed_solution: doc.proposed_solution || '',
          scope_inclusions: (doc.scope_inclusions as string[]) || [],
          scope_exclusions: (doc.scope_exclusions as string[]) || [],
          use_cases: (doc.use_cases as any[]) || [],
          milestones: (doc.milestones as any[]) || [],
          raci_matrix: (doc.raci_matrix as any[]) || [],
          additional_notes: doc.additional_notes || '',
          status: doc.status,
          version_number: doc.version_number || '1.0',
          prepared_by: doc.prepared_by || '',
          reviewed_by: doc.reviewed_by || '',
          approved_by: doc.approved_by || '',
          revision_history: (doc.revision_history as any[]) || [],
          branding: (doc.branding as any) || {},
        });
        setSelectedProduct(doc.product_id);
      }
    }
  }, [selectedDoc, documents]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: DocumentationData) => {
      const { data: userData } = await supabase.auth.getUser();
      const payload = {
        ...data,
        created_by: userData.user?.id,
        updated_at: new Date().toISOString(),
      };

      if (data.id) {
        const { error } = await supabase
          .from('solution_documentation')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('solution_documentation')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Documentation saved successfully');
      queryClient.invalidateQueries({ queryKey: ['solution-documentation'] });
      setIsCreating(false);
    },
    onError: (error: any) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('solution_documentation')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Documentation deleted');
      queryClient.invalidateQueries({ queryKey: ['solution-documentation'] });
      setSelectedDoc(null);
    },
  });

  // AI Generation
  const generateContent = async (section: string) => {
    const product = products.find(p => p.id === selectedProduct);
    if (!product) {
      toast.error('Please select a product first');
      return;
    }

    setIsGenerating(section);
    try {
      const { data, error } = await supabase.functions.invoke('generate-solution-documentation', {
        body: {
          productName: product.name,
          productDescription: product.description,
          productCategory: product.category,
          oemName: product.oem?.name,
          customerName: formData.customer_name,
          docType,
          section,
          existingData: {
            problemStatement: formData.problem_statement,
          },
        },
      });

      if (error) throw error;

      if (section === 'full') {
        setFormData(prev => ({
          ...prev,
          problem_statement: data.data.problem_statement || prev.problem_statement,
          proposed_solution: data.data.proposed_solution || prev.proposed_solution,
          scope_inclusions: data.data.scope_inclusions || prev.scope_inclusions,
          scope_exclusions: data.data.scope_exclusions || prev.scope_exclusions,
          use_cases: data.data.use_cases || prev.use_cases,
          milestones: data.data.milestones || prev.milestones,
          raci_matrix: data.data.raci_matrix || prev.raci_matrix,
        }));
      } else if (section === 'problem_statement' || section === 'proposed_solution') {
        setFormData(prev => ({
          ...prev,
          [section]: data.data.content,
        }));
      } else if (section === 'scope') {
        setFormData(prev => ({
          ...prev,
          scope_inclusions: data.data.inclusions,
          scope_exclusions: data.data.exclusions,
        }));
      } else if (section === 'use_cases') {
        setFormData(prev => ({
          ...prev,
          use_cases: data.data,
        }));
      } else if (section === 'milestones') {
        setFormData(prev => ({
          ...prev,
          milestones: data.data,
        }));
      } else if (section === 'raci_matrix') {
        setFormData(prev => ({
          ...prev,
          raci_matrix: data.data,
        }));
      }

      toast.success(`${section.replace('_', ' ')} generated successfully`);
    } catch (error: any) {
      toast.error('Failed to generate: ' + error.message);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleCreateNew = () => {
    // Find selected template branding if any
    const template = templates.find(t => t.id === selectedTemplate);
    const templateBranding = (template?.branding as Record<string, any>) || {};
    const templateHeader = (template?.header_content as Record<string, any>) || {};
    const templateFooter = (template?.footer_content as Record<string, any>) || {};
    
    setFormData({
      product_id: selectedProduct,
      doc_type: docType,
      title: '',
      customer_name: '',
      problem_statement: '',
      proposed_solution: '',
      scope_inclusions: [],
      scope_exclusions: [],
      use_cases: [],
      milestones: [],
      raci_matrix: [],
      additional_notes: '',
      status: 'draft',
      version_number: '1.0',
      prepared_by: '',
      reviewed_by: '',
      approved_by: '',
      revision_history: [],
      branding: {
        ...templateBranding,
        templateId: template?.id,
        templateName: template?.name,
        headerSettings: templateHeader,
        footerSettings: templateFooter,
      },
    });
    setIsCreating(true);
    setSelectedDoc(null);
    setSelectedTemplate('');
  };

  const handleSave = () => {
    if (!formData.title) {
      toast.error('Please enter a title');
      return;
    }
    if (!formData.product_id && !selectedProduct) {
      toast.error('Please select a product');
      return;
    }
    saveMutation.mutate({
      ...formData,
      product_id: formData.product_id || selectedProduct,
    });
  };

  const docTypeLabel = docType === 'poc' ? 'POC Plan' : 'Implementation Plan';

  // List view
  if (!isCreating && !selectedDoc) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{docTypeLabel} Documentation</h2>
            <p className="text-muted-foreground">
              Create and manage {docType === 'poc' ? 'Proof of Concept plans' : 'Implementation Plan documents'} with AI assistance
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New {docTypeLabel}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New {docTypeLabel}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Select Product/Solution *</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} {product.category && `(${product.category})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Template Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Choose Template (Optional)
                  </Label>
                  {templates.length > 0 ? (
                    <div className="grid gap-2">
                      {templates.map(template => {
                        const branding = (template.branding as Record<string, any>) || {};
                        const isSelected = selectedTemplate === template.id;
                        return (
                          <div
                            key={template.id}
                            onClick={() => setSelectedTemplate(isSelected ? '' : template.id)}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                                : 'hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-md flex items-center justify-center"
                                style={{ backgroundColor: branding.primaryColor || 'hsl(var(--primary))' }}
                              >
                                <FileText className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{template.name}</span>
                                  {template.is_default && (
                                    <Badge variant="secondary" className="text-xs">Default</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {template.description || branding.theme || 'Custom template'}
                                </p>
                              </div>
                              {/* Color palette preview */}
                              <div className="flex gap-1">
                                <div 
                                  className="w-4 h-4 rounded-full border"
                                  style={{ backgroundColor: branding.primaryColor }}
                                />
                                <div 
                                  className="w-4 h-4 rounded-full border"
                                  style={{ backgroundColor: branding.accentColor }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-2">No templates available</p>
                      <Button variant="link" size="sm" className="text-xs" onClick={() => window.open('/admin/document-templates', '_blank')}>
                        Create templates in Admin Center
                      </Button>
                    </div>
                  )}
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={handleCreateNew}
                  disabled={!selectedProduct}
                >
                  {selectedTemplate ? 'Create with Template' : 'Create Blank Document'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoadingDocs ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No {docTypeLabel} Documents Yet</h3>
              <p className="text-muted-foreground mt-2">
                Create your first {docType === 'poc' ? 'POC plan' : 'implementation document'} to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map(doc => (
              <Card 
                key={doc.id} 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedDoc(doc.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{doc.title || 'Untitled'}</CardTitle>
                      <CardDescription>{doc.product?.name}</CardDescription>
                    </div>
                    <Badge className={statusColors[doc.status]}>{doc.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground">
                    {doc.customer_name && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {doc.customer_name}
                      </span>
                    )}
                    {doc.version_number && (
                      <span className="flex items-center gap-1">
                        <History className="h-3 w-3" />
                        v{doc.version_number}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Editor view
  const selectedProductData = products.find(p => p.id === (formData.product_id || selectedProduct));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            setIsCreating(false);
            setSelectedDoc(null);
          }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">
              {formData.title || `New ${docTypeLabel}`}
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{selectedProductData?.name} • {selectedProductData?.category}</span>
              {formData.branding?.templateName && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Palette className="h-3 w-3" />
                  {formData.branding.templateName}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select 
            value={formData.status} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline"
            onClick={() => generateContent('full')}
            disabled={isGenerating !== null}
          >
            {isGenerating === 'full' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            AI Generate All
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowExportDialog(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
          {formData.id && (
            <Button 
              variant="destructive" 
              size="icon"
              onClick={() => deleteMutation.mutate(formData.id!)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Export Dialog */}
      <DocumentExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        documentData={{
          title: formData.title,
          customerName: formData.customer_name,
          productName: selectedProductData?.name || '',
          productCategory: selectedProductData?.category || undefined,
          problemStatement: formData.problem_statement,
          proposedSolution: formData.proposed_solution,
          scopeInclusions: formData.scope_inclusions,
          scopeExclusions: formData.scope_exclusions,
          useCases: formData.use_cases,
          milestones: formData.milestones,
          raciMatrix: formData.raci_matrix,
          additionalNotes: formData.additional_notes,
          docType: docType,
        }}
        initialBranding={formData.branding?.companyName ? formData.branding : undefined}
        initialVersionInfo={{
          versionNumber: formData.version_number,
          preparedBy: formData.prepared_by,
          reviewedBy: formData.reviewed_by,
          approvedBy: formData.approved_by,
          revisionHistory: formData.revision_history || [],
        }}
        onSaveBranding={(branding) => setFormData(prev => ({ ...prev, branding }))}
        onSaveVersionInfo={(versionInfo) => setFormData(prev => ({
          ...prev,
          version_number: versionInfo.versionNumber,
          prepared_by: versionInfo.preparedBy,
          reviewed_by: versionInfo.reviewedBy,
          approved_by: versionInfo.approvedBy,
          revision_history: versionInfo.revisionHistory,
        }))}
      />

      {/* Basic Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Document Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={`${selectedProductData?.name} ${docTypeLabel}`}
              />
            </div>
            <div className="space-y-2">
              <Label>{docType === 'poc' ? 'Prospect Name' : 'Customer Name'}</Label>
              <Select 
                value={formData.customer_name} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, customer_name: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${docType === 'poc' ? 'prospect' : 'customer'}`} />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.name}>
                      {org.name} {org.organization_type && `(${org.organization_type})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="scope" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Scope
          </TabsTrigger>
          <TabsTrigger value="usecases" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Use Cases
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="raci" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            RACI
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Problem Statement */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Problem Statement
                </CardTitle>
                <CardDescription>Customer requirements and challenges</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => generateContent('problem_statement')}
                disabled={isGenerating !== null}
              >
                {isGenerating === 'problem_statement' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                AI Enhance
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.problem_statement}
                onChange={(e) => setFormData(prev => ({ ...prev, problem_statement: e.target.value }))}
                placeholder="Describe the customer's security challenges and requirements..."
                className="min-h-[200px]"
              />
            </CardContent>
          </Card>

          {/* Proposed Solution */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Proposed Solution
                </CardTitle>
                <CardDescription>How {selectedProductData?.name} addresses the challenges</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => generateContent('proposed_solution')}
                disabled={isGenerating !== null}
              >
                {isGenerating === 'proposed_solution' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                AI Enhance
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.proposed_solution}
                onChange={(e) => setFormData(prev => ({ ...prev, proposed_solution: e.target.value }))}
                placeholder="Describe the proposed solution and how it addresses the requirements..."
                className="min-h-[200px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scope" className="mt-6">
          <ScopeSection
            inclusions={formData.scope_inclusions}
            exclusions={formData.scope_exclusions}
            onInclusionsChange={(items) => setFormData(prev => ({ ...prev, scope_inclusions: items }))}
            onExclusionsChange={(items) => setFormData(prev => ({ ...prev, scope_exclusions: items }))}
            onGenerate={() => generateContent('scope')}
            isGenerating={isGenerating === 'scope'}
          />
        </TabsContent>

        <TabsContent value="usecases" className="mt-6">
          <UseCasesSection
            useCases={formData.use_cases}
            onChange={(cases) => setFormData(prev => ({ ...prev, use_cases: cases }))}
            onGenerate={() => generateContent('use_cases')}
            isGenerating={isGenerating === 'use_cases'}
            docType={docType}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <GanttChart
            milestones={formData.milestones}
            onChange={(milestones) => setFormData(prev => ({ ...prev, milestones }))}
            onGenerate={() => generateContent('milestones')}
            isGenerating={isGenerating === 'milestones'}
            docType={docType}
          />
        </TabsContent>

        <TabsContent value="raci" className="mt-6">
          <RACIMatrix
            matrix={formData.raci_matrix}
            onChange={(matrix) => setFormData(prev => ({ ...prev, raci_matrix: matrix }))}
            onGenerate={() => generateContent('raci_matrix')}
            isGenerating={isGenerating === 'raci_matrix'}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>Any additional information or considerations</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.additional_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, additional_notes: e.target.value }))}
                placeholder="Add any additional notes, considerations, or special requirements..."
                className="min-h-[300px]"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
