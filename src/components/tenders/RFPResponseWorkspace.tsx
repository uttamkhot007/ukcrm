import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileCheck, Wand2, Download, MoreHorizontal, Eye, Trash2,
  FileText, Calendar, Building2, Loader2, Upload, FileUp
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RFPResponseWorkspaceProps {
  workspaces: any[];
  loading: boolean;
  onViewDetails: (workspace: any) => void;
  onRefresh: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

const AI_MODELS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Best Quality)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Balanced)' },
  { value: 'openai/gpt-5', label: 'GPT-5 (Premium)' },
];

export function RFPResponseWorkspace({ 
  workspaces, 
  loading, 
  onViewDetails, 
  onRefresh,
  getStatusBadge 
}: RFPResponseWorkspaceProps) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadDialog, setUploadDialog] = useState<any>(null);
  const [uploadedText, setUploadedText] = useState('');
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, workspace: any) => {
    try {
      const text = await file.text();
      setUploadedText(text);
      setUploadDialog(workspace);
    } catch (error) {
      toast.error('Failed to read file');
    }
  };

  const handleGenerateResponse = async () => {
    if (!uploadDialog) return;

    setGeneratingId(uploadDialog.id);
    setUploadDialog(null);

    try {
      // Update status and save requirements
      await supabase
        .from('tender_workspaces')
        .update({ 
          status: 'generating', 
          progress_percent: 10,
          requirements_text: uploadedText,
          selected_ai_model: selectedModel,
        })
        .eq('id', uploadDialog.id);

      const { data, error } = await supabase.functions.invoke('tender-ai-assistant', {
        body: {
          action: 'generate_rfp_response',
          solutionName: uploadDialog.solution_name,
          solutionDescription: uploadDialog.notes,
          oemName: uploadDialog.oem_name,
          customerName: uploadDialog.customer_name,
          requirementsText: uploadedText,
          model: selectedModel,
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        await supabase
          .from('tender_workspaces')
          .update({ 
            generated_content: data.data,
            status: 'review',
            progress_percent: 100,
          })
          .eq('id', uploadDialog.id);

        toast.success('RFP Response generated successfully!');
        onRefresh();
      } else {
        throw new Error(data?.error || 'Generation failed');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate response');
      
      await supabase
        .from('tender_workspaces')
        .update({ status: 'draft', progress_percent: 0 })
        .eq('id', uploadDialog.id);
    } finally {
      setGeneratingId(null);
      setUploadedText('');
    }
  };

  const handleExportWord = async (workspace: any) => {
    try {
      const content = workspace.generated_content;
      if (!content) {
        toast.error('No content to export');
        return;
      }

      const sections: any[] = [];

      // Title and basic info
      sections.push(
        new Paragraph({
          text: `RFP Response: ${workspace.title}`,
          heading: HeadingLevel.TITLE,
        }),
        new Paragraph({
          text: `Solution: ${workspace.solution_name || 'N/A'}`,
          spacing: { after: 200 },
        })
      );

      // Executive Summary
      if (content.executive_summary) {
        sections.push(
          new Paragraph({ text: 'Executive Summary', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: content.executive_summary, spacing: { after: 400 } })
        );
      }

      // Technical Response
      if (content.technical_response?.sections) {
        sections.push(
          new Paragraph({ text: 'Technical Response', heading: HeadingLevel.HEADING_1 })
        );

        content.technical_response.sections.forEach((section: any) => {
          sections.push(
            new Paragraph({ text: section.section_title, heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: section.content || '', spacing: { after: 300 } })
          );

          // Compliance table
          if (section.compliance_items?.length > 0) {
            const tableRows = [
              new TableRow({
                children: ['Requirement', 'Response', 'Status'].map(text => 
                  new TableCell({
                    children: [new Paragraph({ text, run: { bold: true } })],
                    width: { size: 33, type: WidthType.PERCENTAGE },
                  })
                ),
              }),
              ...section.compliance_items.map((item: any) => 
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: item.requirement_text || '' })] }),
                    new TableCell({ children: [new Paragraph({ text: item.response || '' })] }),
                    new TableCell({ children: [new Paragraph({ text: item.compliance_status || '' })] }),
                  ],
                })
              ),
            ];

            sections.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          }
        });
      }

      const doc = new Document({ sections: [{ properties: {}, children: sections }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${workspace.title || 'RFP-Response'}.docx`);
      toast.success('Document exported successfully!');

      await supabase
        .from('tender_workspaces')
        .update({ status: 'exported', exported_format: 'docx' })
        .eq('id', workspace.id);
      onRefresh();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export document');
    }
  };

  const handleExportExcel = async (workspace: any) => {
    try {
      const content = workspace.generated_content;
      if (!content) {
        toast.error('No content to export');
        return;
      }

      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['RFP Response Summary'],
        ['Title', workspace.title],
        ['Solution', workspace.solution_name || ''],
        ['OEM', workspace.oem_name || ''],
        ['Customer', workspace.customer_name || ''],
        ['Status', workspace.status],
        ['', ''],
        ['Executive Summary'],
        [content.executive_summary || ''],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Compliance Matrix sheet
      const complianceData = [['S.No', 'Requirement', 'Response', 'Compliance Status', 'Evidence']];
      let sno = 1;
      
      content.technical_response?.sections?.forEach((section: any) => {
        section.compliance_items?.forEach((item: any) => {
          complianceData.push([
            sno++,
            item.requirement_text || '',
            item.response || '',
            item.compliance_status || '',
            item.evidence || '',
          ]);
        });
      });

      const complianceWs = XLSX.utils.aoa_to_sheet(complianceData);
      XLSX.utils.book_append_sheet(wb, complianceWs, 'Compliance Matrix');

      XLSX.writeFile(wb, `${workspace.title || 'RFP-Response'}.xlsx`);
      toast.success('Excel exported successfully!');

      await supabase
        .from('tender_workspaces')
        .update({ status: 'exported', exported_format: 'xlsx' })
        .eq('id', workspace.id);
      onRefresh();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export Excel');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const { error } = await supabase
        .from('tender_workspaces')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      toast.success('Workspace deleted');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete workspace');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <Card variant="glass" className="text-center py-12">
        <CardContent>
          <FileCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No RFP Responses</h3>
          <p className="text-muted-foreground mb-4">
            Upload tender specs and generate AI-powered responses
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">RFP Response Documents</h3>
        <p className="text-sm text-muted-foreground">
          Upload requirements and generate AI responses with compliance matrix
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".txt,.csv,.md"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadDialog) {
            handleFileUpload(file, uploadDialog);
          }
        }}
      />

      <div className="grid gap-4">
        {workspaces.map((workspace) => (
          <Card key={workspace.id} variant="glass" className="hover:bg-muted/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold">{workspace.title}</h4>
                    {getStatusBadge(workspace.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {workspace.solution_name && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {workspace.solution_name}
                      </span>
                    )}
                    {workspace.oem_name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {workspace.oem_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(workspace.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {workspace.progress_percent > 0 && workspace.progress_percent < 100 && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${workspace.progress_percent}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {workspace.status === 'draft' && (
                    <Button 
                      size="sm" 
                      onClick={() => setUploadDialog(workspace)}
                      disabled={generatingId === workspace.id}
                    >
                      {generatingId === workspace.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Upload & Generate
                    </Button>
                  )}
                  
                  {workspace.generated_content && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleExportWord(workspace)}>
                          Export as Word (.docx)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportExcel(workspace)}>
                          Export as Excel (.xlsx)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails(workspace)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setDeleteId(workspace.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload & Generate Dialog */}
      <Dialog open={!!uploadDialog && !generatingId} onOpenChange={() => setUploadDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Generate RFP Response with AI
            </DialogTitle>
            <DialogDescription>
              Upload or paste the tender requirement specifications. AI will generate a comprehensive response.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select AI Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Requirement Specifications</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </div>
              <Textarea
                value={uploadedText}
                onChange={(e) => setUploadedText(e.target.value)}
                placeholder="Paste the tender requirement specifications here, or upload a file..."
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateResponse}
              disabled={!uploadedText.trim()}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
