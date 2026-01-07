import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, Wand2, Download, Calendar, Building2, User,
  CheckCircle, AlertCircle, Clock, FileSpreadsheet, Copy
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface WorkspaceDetailsSheetProps {
  workspace: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function WorkspaceDetailsSheet({ 
  workspace, 
  open, 
  onOpenChange, 
  onRefresh 
}: WorkspaceDetailsSheetProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!workspace) return null;

  const content = workspace.generated_content;

  const handleCopyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleExportComplianceMatrix = async () => {
    if (!content?.technical_response?.sections) {
      toast.error('No compliance data to export');
      return;
    }

    const wb = XLSX.utils.book_new();
    const data = [['S.No', 'Requirement', 'Response', 'Compliance Status', 'Remarks']];
    let sno = 1;

    content.technical_response.sections.forEach((section: any) => {
      section.compliance_items?.forEach((item: any) => {
        data.push([
          sno++,
          item.requirement_text || item.requirement_id || '',
          item.response || '',
          item.compliance_status || '',
          item.evidence || '',
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Compliance Matrix');
    XLSX.writeFile(wb, `Compliance-Matrix-${workspace.title}.xlsx`);
    toast.success('Compliance matrix exported');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'C': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'PC': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'NC': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'C': return 'Compliant';
      case 'PC': return 'Partially Compliant';
      case 'NC': return 'Non-Compliant';
      case 'NA': return 'Not Applicable';
      default: return status;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {workspace.title}
          </SheetTitle>
          <SheetDescription>
            {workspace.workspace_type === 'rfp_spec' ? 'RFP Specification' : 'RFP Response'} Workspace
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 py-4 flex-wrap">
          <Badge variant="outline" className="flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {workspace.oem_name || 'No OEM'}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {workspace.customer_name || 'No Customer'}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(workspace.created_at), 'MMM d, yyyy')}
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Generated Content</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="overview" className="mt-0 space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Solution</h4>
                  <p className="font-medium">{workspace.solution_name || 'Not specified'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                  <Badge className="mt-1">
                    {workspace.status?.charAt(0).toUpperCase() + workspace.status?.slice(1)}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">AI Model</h4>
                  <p>{workspace.selected_ai_model || 'Default'}</p>
                </div>
                {workspace.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
                    <p className="text-sm">{workspace.notes}</p>
                  </div>
                )}
              </div>

              {content && (
                <div className="flex gap-2 pt-4">
                  <Button size="sm" onClick={handleExportComplianceMatrix}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Compliance Matrix
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="content" className="mt-0 space-y-4">
              {!content ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No content generated yet</p>
                </div>
              ) : (
                <>
                  {content.executive_summary && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Executive Summary</h4>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCopyContent(content.executive_summary)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {content.executive_summary}
                      </p>
                    </div>
                  )}

                  {content.sections?.map((section: any, idx: number) => (
                    <div key={idx} className="space-y-2 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{section.section_title}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCopyContent(
                            section.requirements?.map((r: any) => `${r.id}: ${r.description}`).join('\n') || ''
                          )}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      {section.requirements?.slice(0, 5).map((req: any, ridx: number) => (
                        <div key={ridx} className="text-sm pl-4 border-l-2 border-muted">
                          <span className="font-medium">{req.id}:</span> {req.description}
                          {req.priority && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {req.priority}
                            </Badge>
                          )}
                        </div>
                      ))}
                      {section.requirements?.length > 5 && (
                        <p className="text-sm text-muted-foreground pl-4">
                          +{section.requirements.length - 5} more requirements
                        </p>
                      )}
                    </div>
                  ))}

                  {content.technical_response?.sections?.map((section: any, idx: number) => (
                    <div key={idx} className="space-y-2 border-t pt-4">
                      <h4 className="font-semibold">{section.section_title}</h4>
                      {section.content && (
                        <p className="text-sm text-muted-foreground">{section.content.slice(0, 300)}...</p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="compliance" className="mt-0 space-y-4">
              {!content?.technical_response?.sections ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No compliance data available</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Compliance Matrix</h4>
                    <Button size="sm" variant="outline" onClick={handleExportComplianceMatrix}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>

                  {content.technical_response.sections.map((section: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <h5 className="text-sm font-medium">{section.section_title}</h5>
                      {section.compliance_items?.map((item: any, iidx: number) => (
                        <div 
                          key={iidx} 
                          className="p-3 border rounded-lg space-y-1 bg-muted/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium flex-1">
                              {item.requirement_text || item.requirement_id}
                            </p>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(item.compliance_status)}
                              <span className="text-xs">
                                {getStatusLabel(item.compliance_status)}
                              </span>
                            </div>
                          </div>
                          {item.response && (
                            <p className="text-sm text-muted-foreground">
                              {item.response}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
