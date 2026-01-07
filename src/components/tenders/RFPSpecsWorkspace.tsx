import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileSpreadsheet, Wand2, Download, MoreHorizontal, Eye, Trash2,
  FileText, Calendar, Building2, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
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

interface RFPSpecsWorkspaceProps {
  workspaces: any[];
  loading: boolean;
  onViewDetails: (workspace: any) => void;
  onRefresh: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export function RFPSpecsWorkspace({ 
  workspaces, 
  loading, 
  onViewDetails, 
  onRefresh,
  getStatusBadge 
}: RFPSpecsWorkspaceProps) {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleGenerateWithAI = async (workspace: any) => {
    if (!workspace.solution_name) {
      toast.error('Please select a solution first');
      return;
    }

    setGeneratingId(workspace.id);
    try {
      // Update status to generating
      await supabase
        .from('tender_workspaces')
        .update({ status: 'generating', progress_percent: 10 })
        .eq('id', workspace.id);

      const { data, error } = await supabase.functions.invoke('tender-ai-assistant', {
        body: {
          action: 'generate_rfp_spec',
          solutionName: workspace.solution_name,
          solutionDescription: workspace.notes,
          oemName: workspace.oem_name,
          customerName: workspace.customer_name,
          model: workspace.selected_ai_model || 'google/gemini-2.5-flash',
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        // Save generated content
        await supabase
          .from('tender_workspaces')
          .update({ 
            generated_content: data.data,
            status: 'review',
            progress_percent: 100,
          })
          .eq('id', workspace.id);

        toast.success('RFP Specification generated successfully!');
        onRefresh();
      } else {
        throw new Error(data?.error || 'Generation failed');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate specification');
      
      // Reset status
      await supabase
        .from('tender_workspaces')
        .update({ status: 'draft', progress_percent: 0 })
        .eq('id', workspace.id);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleExportWord = async (workspace: any) => {
    try {
      const content = workspace.generated_content;
      if (!content) {
        toast.error('No content to export');
        return;
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: content.title || workspace.title,
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({
              text: `Solution: ${workspace.solution_name || 'N/A'}`,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `OEM: ${workspace.oem_name || 'N/A'}`,
              spacing: { after: 400 },
            }),
            ...(content.executive_summary ? [
              new Paragraph({
                text: 'Executive Summary',
                heading: HeadingLevel.HEADING_1,
              }),
              new Paragraph({
                text: content.executive_summary,
                spacing: { after: 400 },
              }),
            ] : []),
            ...(content.sections || []).flatMap((section: any) => [
              new Paragraph({
                text: section.section_title,
                heading: HeadingLevel.HEADING_1,
              }),
              ...(section.requirements || []).map((req: any, idx: number) => 
                new Paragraph({
                  children: [
                    new TextRun({ text: `${req.id || `REQ-${idx + 1}`}: `, bold: true }),
                    new TextRun({ text: req.description }),
                    new TextRun({ text: ` [${req.priority || 'Mandatory'}]`, italics: true }),
                  ],
                  spacing: { after: 200 },
                })
              ),
            ]),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${workspace.title || 'RFP-Spec'}.docx`);
      toast.success('Document exported successfully!');

      // Update exported status
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
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No RFP Specifications</h3>
          <p className="text-muted-foreground mb-4">
            Create your first AI-powered RFP specification document
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">RFP Specification Documents</h3>
        <p className="text-sm text-muted-foreground">
          Generate technical specifications using AI based on Cynet-style templates
        </p>
      </div>

      <div className="grid gap-4">
        {workspaces.map((workspace) => (
          <Card key={workspace.id} variant="glass" className="hover:bg-muted/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold">{workspace.title}</h4>
                    {getStatusBadge(workspace.status)}
                    {workspace.workspace_number && (
                      <Badge variant="outline">#{workspace.workspace_number}</Badge>
                    )}
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
                      onClick={() => handleGenerateWithAI(workspace)}
                      disabled={generatingId === workspace.id}
                    >
                      {generatingId === workspace.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4 mr-2" />
                      )}
                      Generate with AI
                    </Button>
                  )}
                  
                  {workspace.generated_content && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleExportWord(workspace)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
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
                      {workspace.status === 'review' && (
                        <DropdownMenuItem onClick={() => handleGenerateWithAI(workspace)}>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Regenerate
                        </DropdownMenuItem>
                      )}
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All generated content will be permanently deleted.
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
