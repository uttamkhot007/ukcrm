import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, FileText, Palette, Star, Layout, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DocumentTemplate {
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
}

// Built-in sample templates for each document type
const BUILTIN_TEMPLATES: Record<string, Omit<DocumentTemplate, 'id' | 'tenant_id' | 'is_active' | 'version'>[]> = {
  quote: [
    {
      name: 'Modern Professional',
      description: 'Clean design with blue accents. Perfect for technology solutions.',
      template_type: 'quote',
      content: { layout: 'modern', showSolutionSection: true, showServiceDetails: true },
      header_content: { showLogo: true, logoPosition: 'left', showCompanyInfo: true, title: 'QUOTATION' },
      footer_content: { showTerms: true, showSignature: true, showValidityPeriod: true },
      branding: {
        theme: 'modern-blue',
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af',
        accentColor: '#60a5fa',
        fontFamily: 'Inter',
        headerStyle: 'gradient',
        tableStyle: 'modern',
      },
      is_default: true,
    },
    {
      name: 'Enterprise Classic',
      description: 'Formal design for enterprise clients. Navy and gold theme.',
      template_type: 'quote',
      content: { layout: 'classic', showSolutionSection: true, showServiceDetails: true },
      header_content: { showLogo: true, logoPosition: 'center', showCompanyInfo: true, title: 'Price Quotation' },
      footer_content: { showTerms: true, showSignature: true, showContactInfo: true },
      branding: {
        theme: 'enterprise-classic',
        primaryColor: '#1e3a5f',
        secondaryColor: '#0c1f3d',
        accentColor: '#d4a853',
        fontFamily: 'Georgia',
        headerStyle: 'solid',
        tableStyle: 'bordered',
      },
      is_default: false,
    },
    {
      name: 'Minimal Clean',
      description: 'Sleek monochrome design. Modern and minimalist.',
      template_type: 'quote',
      content: { layout: 'minimal', showSolutionSection: true, showServiceDetails: true },
      header_content: { showLogo: true, logoPosition: 'left', showCompanyInfo: false, title: 'Quotation' },
      footer_content: { showTerms: true, showSignature: false, showValidityPeriod: true },
      branding: {
        theme: 'minimal-mono',
        primaryColor: '#18181b',
        secondaryColor: '#27272a',
        accentColor: '#71717a',
        fontFamily: 'Inter',
        headerStyle: 'line',
        tableStyle: 'minimal',
      },
      is_default: false,
    },
    {
      name: 'Creative Gradient',
      description: 'Eye-catching gradient design for creative agencies.',
      template_type: 'quote',
      content: { layout: 'creative', showSolutionSection: true, showServiceDetails: true },
      header_content: { showLogo: true, logoPosition: 'right', showCompanyInfo: true, title: 'QUOTATION' },
      footer_content: { showTerms: true, showSignature: true },
      branding: {
        theme: 'creative-gradient',
        primaryColor: '#8b5cf6',
        secondaryColor: '#6366f1',
        accentColor: '#c4b5fd',
        gradientStart: '#8b5cf6',
        gradientEnd: '#6366f1',
        fontFamily: 'Poppins',
        headerStyle: 'gradient',
        tableStyle: 'rounded',
      },
      is_default: false,
    },
    {
      name: 'Tech Startup',
      description: 'Fresh, modern design with teal accents for tech companies.',
      template_type: 'quote',
      content: { layout: 'tech', showSolutionSection: true, showServiceDetails: true },
      header_content: { showLogo: true, logoPosition: 'left', showCompanyInfo: true, title: 'Quote' },
      footer_content: { showTerms: true, showValidityPeriod: true },
      branding: {
        theme: 'tech-teal',
        primaryColor: '#0d9488',
        secondaryColor: '#0f766e',
        accentColor: '#2dd4bf',
        fontFamily: 'Space Grotesk',
        headerStyle: 'modern',
        tableStyle: 'striped',
      },
      is_default: false,
    },
  ],
  invoice: [
    {
      name: 'Professional Blue',
      description: 'Clean professional invoice with blue header.',
      template_type: 'invoice',
      content: { layout: 'professional', showPaymentDetails: true, showBankInfo: true },
      header_content: { showLogo: true, showCompanyAddress: true, invoiceTitle: 'INVOICE' },
      footer_content: { showBankDetails: true, showPaymentQR: false, thankYouMessage: 'Thank you for your business!' },
      branding: {
        theme: 'professional-blue',
        primaryColor: '#1d4ed8',
        secondaryColor: '#1e40af',
        accentColor: '#3b82f6',
        fontFamily: 'Open Sans',
        headerStyle: 'boxed',
        tableHeaderBg: '#1d4ed8',
        tableHeaderText: '#ffffff',
      },
      is_default: true,
    },
    {
      name: 'Minimal Monochrome',
      description: 'Sleek black and white minimal design.',
      template_type: 'invoice',
      content: { layout: 'minimal', showPaymentDetails: true, showBankInfo: true },
      header_content: { showLogo: true, showCompanyAddress: true, invoiceTitle: 'Invoice' },
      footer_content: { showBankDetails: true, thankYouMessage: 'We appreciate your trust.' },
      branding: {
        theme: 'minimal-mono',
        primaryColor: '#18181b',
        secondaryColor: '#27272a',
        accentColor: '#71717a',
        fontFamily: 'Inter',
        headerStyle: 'line',
        tableHeaderBg: '#f4f4f5',
        tableHeaderText: '#18181b',
      },
      is_default: false,
    },
    {
      name: 'Creative Gradient',
      description: 'Eye-catching gradient design for creative agencies.',
      template_type: 'invoice',
      content: { layout: 'creative', showPaymentDetails: true },
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
        headerStyle: 'gradient',
      },
      is_default: false,
    },
    {
      name: 'Enterprise Dark',
      description: 'Premium dark theme for enterprise clients.',
      template_type: 'invoice',
      content: { layout: 'enterprise', showPaymentDetails: true, showBankInfo: true },
      header_content: { showLogo: true, showCompanyAddress: true, invoiceTitle: 'TAX INVOICE' },
      footer_content: { showBankDetails: true, showTaxInfo: true },
      branding: {
        theme: 'enterprise-dark',
        primaryColor: '#0f172a',
        secondaryColor: '#1e293b',
        accentColor: '#f97316',
        fontFamily: 'Source Sans Pro',
        headerStyle: 'dark',
        darkMode: true,
      },
      is_default: false,
    },
    {
      name: 'GST Compliant',
      description: 'Indian GST compliant invoice with all required fields.',
      template_type: 'invoice',
      content: { layout: 'gst', showPaymentDetails: true, showBankInfo: true, showGSTBreakdown: true },
      header_content: { showLogo: true, showCompanyAddress: true, showGSTIN: true, invoiceTitle: 'TAX INVOICE' },
      footer_content: { showBankDetails: true, showTaxInfo: true, showDeclaration: true },
      branding: {
        theme: 'gst-compliant',
        primaryColor: '#059669',
        secondaryColor: '#047857',
        accentColor: '#34d399',
        fontFamily: 'Roboto',
        headerStyle: 'boxed',
        tableStyle: 'bordered',
      },
      is_default: false,
    },
  ],
  purchase_order: [
    {
      name: 'Standard PO',
      description: 'Standard purchase order format with all essential fields.',
      template_type: 'purchase_order',
      content: { layout: 'standard', showVendorDetails: true, showDeliveryTerms: true },
      header_content: { showLogo: true, showCompanyAddress: true, title: 'PURCHASE ORDER' },
      footer_content: { showTerms: true, showSignature: true, showAuthority: true },
      branding: {
        theme: 'standard-blue',
        primaryColor: '#1d4ed8',
        secondaryColor: '#1e40af',
        accentColor: '#3b82f6',
        fontFamily: 'Arial',
        headerStyle: 'solid',
      },
      is_default: true,
    },
    {
      name: 'Corporate PO',
      description: 'Formal corporate design with detailed sections.',
      template_type: 'purchase_order',
      content: { layout: 'corporate', showVendorDetails: true, showDeliveryTerms: true, showApprovalSection: true },
      header_content: { showLogo: true, showCompanyAddress: true, title: 'Purchase Order' },
      footer_content: { showTerms: true, showSignature: true, showAuthority: true },
      branding: {
        theme: 'corporate-navy',
        primaryColor: '#1e3a5f',
        secondaryColor: '#0c1f3d',
        accentColor: '#60a5fa',
        fontFamily: 'Times New Roman',
        headerStyle: 'classic',
      },
      is_default: false,
    },
    {
      name: 'Modern PO',
      description: 'Clean modern design with green accents.',
      template_type: 'purchase_order',
      content: { layout: 'modern', showVendorDetails: true, showDeliveryTerms: true },
      header_content: { showLogo: true, showCompanyAddress: true, title: 'PURCHASE ORDER' },
      footer_content: { showTerms: true, showApprovalSignatures: true },
      branding: {
        theme: 'modern-green',
        primaryColor: '#059669',
        secondaryColor: '#047857',
        accentColor: '#34d399',
        fontFamily: 'Inter',
        headerStyle: 'modern',
      },
      is_default: false,
    },
    {
      name: 'Minimal PO',
      description: 'Minimalist black and white design.',
      template_type: 'purchase_order',
      content: { layout: 'minimal', showVendorDetails: true, showDeliveryTerms: true },
      header_content: { showLogo: true, showCompanyAddress: false, title: 'PO' },
      footer_content: { showTerms: true },
      branding: {
        theme: 'minimal-mono',
        primaryColor: '#18181b',
        secondaryColor: '#27272a',
        accentColor: '#71717a',
        fontFamily: 'Inter',
        headerStyle: 'line',
      },
      is_default: false,
    },
  ],
};

interface TemplateSelectorProps {
  templateType: 'quote' | 'invoice' | 'purchase_order';
  selectedTemplateId?: string | null;
  onSelect: (template: DocumentTemplate | null, isBuiltIn?: boolean, builtInIndex?: number) => void;
  triggerLabel?: string;
  showPreview?: boolean;
  /** Additional template_type values from the tenant library to include (e.g. proposal for quotes) */
  relatedTypes?: string[];
}

export function TemplateSelector({
  templateType,
  selectedTemplateId,
  onSelect,
  triggerLabel = "Choose Template",
  showPreview = true,
  relatedTypes = [],
}: TemplateSelectorProps) {
  const { currentTenant } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'built-in' | 'custom'>('built-in');
  const [search, setSearch] = useState("");
  const [selectedBuiltInIndex, setSelectedBuiltInIndex] = useState<number | null>(0);

  const wantedTypes = [templateType, ...relatedTypes];

  // Fetch custom templates from database
  const { data: allCustomTemplates = [] } = useQuery({
    queryKey: ['document-templates', currentTenant?.id, wantedTypes.join(',')],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .in('template_type', wantedTypes)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return data as DocumentTemplate[];
    },
    enabled: !!currentTenant?.id,
  });

  const q = search.trim().toLowerCase();
  const customTemplates = q
    ? allCustomTemplates.filter((t) =>
        [t.name, t.description, t.template_type].filter(Boolean).join(' ').toLowerCase().includes(q))
    : allCustomTemplates;

  // Default to the tenant's own library when templates are installed
  useEffect(() => {
    if (isOpen && allCustomTemplates.length > 0) setActiveTab('custom');
  }, [isOpen, allCustomTemplates.length]);


  const builtInTemplates = BUILTIN_TEMPLATES[templateType] || [];

  const handleSelectBuiltIn = (index: number) => {
    setSelectedBuiltInIndex(index);
    const template = builtInTemplates[index];
    onSelect(template as any, true, index);
    setIsOpen(false);
  };

  const handleSelectCustom = (template: DocumentTemplate) => {
    setSelectedBuiltInIndex(null);
    onSelect(template, false);
    setIsOpen(false);
  };

  const getSelectedTemplateName = () => {
    if (selectedBuiltInIndex !== null && builtInTemplates[selectedBuiltInIndex]) {
      return builtInTemplates[selectedBuiltInIndex].name;
    }
    if (selectedTemplateId) {
      const custom = customTemplates.find(t => t.id === selectedTemplateId);
      if (custom) return custom.name;
    }
    return builtInTemplates[0]?.name || 'Select Template';
  };

  const getThemePreviewColors = (branding: Record<string, any>) => {
    return {
      primary: branding?.primaryColor || '#2563eb',
      secondary: branding?.secondaryColor || '#1e40af',
      accent: branding?.accentColor || '#60a5fa',
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="truncate">{getSelectedTemplateName()}</span>
          </div>
          <Badge variant="secondary" className="ml-2">
            <Layout className="h-3 w-3 mr-1" />
            Template
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Select Document Template
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                My Templates ({allCustomTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="built-in" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Built-in Designs ({builtInTemplates.length})
              </TabsTrigger>
            </TabsList>
            {activeTab === 'custom' && (
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="sm:max-w-xs"
                aria-label="Search templates"
              />
            )}
          </div>



          <ScrollArea className="h-[60vh]">
            <TabsContent value="built-in" className="mt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {builtInTemplates.map((template, index) => {
                  const colors = getThemePreviewColors(template.branding);
                  const isSelected = selectedBuiltInIndex === index;
                  
                  return (
                    <Card
                      key={index}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md relative overflow-hidden",
                        isSelected && "ring-2 ring-primary"
                      )}
                      onClick={() => handleSelectBuiltIn(index)}
                    >
                      {/* Template Preview Header */}
                      <div 
                        className="h-24 relative"
                        style={{
                          background: template.branding.gradientStart 
                            ? `linear-gradient(135deg, ${template.branding.gradientStart}, ${template.branding.gradientEnd || template.branding.secondaryColor})`
                            : colors.primary
                        }}
                      >
                        {/* Mock document preview */}
                        <div className="absolute inset-2 bg-white/90 rounded shadow-sm p-2">
                          <div 
                            className="h-2 w-12 rounded mb-1"
                            style={{ backgroundColor: colors.primary }}
                          />
                          <div className="h-1 w-20 bg-gray-300 rounded mb-2" />
                          <div className="space-y-1">
                            <div className="h-1 w-full bg-gray-200 rounded" />
                            <div className="h-1 w-3/4 bg-gray-200 rounded" />
                            <div className="h-1 w-1/2 bg-gray-200 rounded" />
                          </div>
                          <div 
                            className="h-4 w-16 rounded mt-2"
                            style={{ backgroundColor: colors.accent + '40' }}
                          />
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        {template.is_default && (
                          <Badge className="absolute bottom-2 right-2" variant="secondary">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm truncate">{template.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {template.description}
                        </p>
                        {/* Color palette preview */}
                        <div className="flex gap-1 mt-2">
                          <div 
                            className="h-4 w-4 rounded-full border"
                            style={{ backgroundColor: colors.primary }}
                            title="Primary"
                          />
                          <div 
                            className="h-4 w-4 rounded-full border"
                            style={{ backgroundColor: colors.secondary }}
                            title="Secondary"
                          />
                          <div 
                            className="h-4 w-4 rounded-full border"
                            style={{ backgroundColor: colors.accent }}
                            title="Accent"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="mt-0">
              {customTemplates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No custom templates created yet.</p>
                  <p className="text-sm mt-2">
                    Create templates in Admin → Document Templates
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {customTemplates.map((template) => {
                    const colors = getThemePreviewColors(template.branding || {});
                    const isSelected = selectedTemplateId === template.id;
                    
                    return (
                      <Card
                        key={template.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md relative overflow-hidden",
                          isSelected && "ring-2 ring-primary"
                        )}
                        onClick={() => handleSelectCustom(template)}
                      >
                        <div 
                          className="h-24 relative"
                          style={{ background: colors.primary }}
                        >
                          <div className="absolute inset-2 bg-white/90 rounded shadow-sm p-2">
                            <div 
                              className="h-2 w-12 rounded mb-1"
                              style={{ backgroundColor: colors.primary }}
                            />
                            <div className="h-1 w-20 bg-gray-300 rounded mb-2" />
                            <div className="space-y-1">
                              <div className="h-1 w-full bg-gray-200 rounded" />
                              <div className="h-1 w-3/4 bg-gray-200 rounded" />
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          {template.is_default && (
                            <Badge className="absolute bottom-2 right-2" variant="secondary">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <h4 className="font-medium text-sm truncate">{template.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {template.description || 'No description'}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
