import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Image,
  Palette,
  Users,
  History,
  Building2,
  Loader2,
} from 'lucide-react';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageBreak,
  Header,
  Footer,
  ImageRun,
  TableOfContents,
} from 'docx';
import { saveAs } from 'file-saver';

interface BrandingSettings {
  companyName: string;
  companyLogo?: string;
  primaryColor: string;
  secondaryColor: string;
  tagline?: string;
  address?: string;
  website?: string;
  email?: string;
  phone?: string;
}

interface VersionInfo {
  versionNumber: string;
  preparedBy: string;
  reviewedBy: string;
  approvedBy: string;
  revisionHistory: Array<{
    version: string;
    date: string;
    author: string;
    changes: string;
  }>;
}

interface DocumentData {
  title: string;
  customerName: string;
  productName: string;
  productCategory?: string;
  problemStatement: string;
  proposedSolution: string;
  scopeInclusions: string[];
  scopeExclusions: string[];
  useCases: Array<{
    title: string;
    description: string;
    expectedOutcome?: string;
    priority?: string;
  }>;
  milestones: Array<{
    name: string;
    startDate: string;
    endDate: string;
    status?: string;
    dependencies?: string[];
  }>;
  raciMatrix: Array<{
    activity: string;
    responsible: string;
    accountable: string;
    consulted: string;
    informed: string;
  }>;
  additionalNotes: string;
  docType: 'poc' | 'implementation';
}

interface DocumentExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentData: DocumentData;
  initialBranding?: BrandingSettings;
  initialVersionInfo?: VersionInfo;
  onSaveBranding?: (branding: BrandingSettings) => void;
  onSaveVersionInfo?: (versionInfo: VersionInfo) => void;
}

const defaultBranding: BrandingSettings = {
  companyName: '',
  primaryColor: '#1e40af',
  secondaryColor: '#3b82f6',
  tagline: '',
  address: '',
  website: '',
  email: '',
  phone: '',
};

const defaultVersionInfo: VersionInfo = {
  versionNumber: '1.0',
  preparedBy: '',
  reviewedBy: '',
  approvedBy: '',
  revisionHistory: [],
};

export const DocumentExportDialog: React.FC<DocumentExportDialogProps> = ({
  open,
  onOpenChange,
  documentData,
  initialBranding = defaultBranding,
  initialVersionInfo = defaultVersionInfo,
  onSaveBranding,
  onSaveVersionInfo,
}) => {
  const [activeTab, setActiveTab] = useState('branding');
  const [branding, setBranding] = useState<BrandingSettings>(initialBranding);
  const [versionInfo, setVersionInfo] = useState<VersionInfo>(initialVersionInfo);
  const [isExporting, setIsExporting] = useState(false);
  const [newRevision, setNewRevision] = useState({ version: '', date: '', author: '', changes: '' });

  const docTypeLabel = documentData.docType === 'poc' ? 'POC Plan' : 'Implementation SOW';

  const addRevisionEntry = () => {
    if (!newRevision.version || !newRevision.author) {
      toast.error('Version and author are required');
      return;
    }
    setVersionInfo(prev => ({
      ...prev,
      revisionHistory: [
        ...prev.revisionHistory,
        {
          ...newRevision,
          date: newRevision.date || new Date().toISOString().split('T')[0],
        },
      ],
    }));
    setNewRevision({ version: '', date: '', author: '', changes: '' });
  };

  const removeRevisionEntry = (index: number) => {
    setVersionInfo(prev => ({
      ...prev,
      revisionHistory: prev.revisionHistory.filter((_, i) => i !== index),
    }));
  };

  const generateWordDocument = async () => {
    setIsExporting(true);
    try {
      const sections = [];

      // Title Page
      const titlePageChildren = [
        new Paragraph({
          children: [new TextRun({ text: '', break: 2 })],
        }),
        new Paragraph({
          text: branding.companyName || 'Company Name',
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        branding.tagline && new Paragraph({
          text: branding.tagline,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: '', break: 3 })],
        }),
        new Paragraph({
          text: documentData.title || `${documentData.productName} ${docTypeLabel}`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: `For: ${documentData.customerName}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: `Product: ${documentData.productName}${documentData.productCategory ? ` (${documentData.productCategory})` : ''}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: '', break: 3 })],
        }),
        new Paragraph({
          text: `Document Version: ${versionInfo.versionNumber}`,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: `Date: ${new Date().toLocaleDateString()}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        versionInfo.preparedBy && new Paragraph({
          text: `Prepared By: ${versionInfo.preparedBy}`,
          alignment: AlignmentType.CENTER,
        }),
        versionInfo.reviewedBy && new Paragraph({
          text: `Reviewed By: ${versionInfo.reviewedBy}`,
          alignment: AlignmentType.CENTER,
        }),
        versionInfo.approvedBy && new Paragraph({
          text: `Approved By: ${versionInfo.approvedBy}`,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new PageBreak()],
        }),
      ].filter(Boolean) as Paragraph[];

      // Table of Contents
      const tocChildren = [
        new Paragraph({
          text: 'Table of Contents',
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 300 },
        }),
        new Paragraph({ text: '1. Executive Summary', spacing: { after: 100 } }),
        new Paragraph({ text: '2. Problem Statement', spacing: { after: 100 } }),
        new Paragraph({ text: '3. Proposed Solution', spacing: { after: 100 } }),
        new Paragraph({ text: '4. Scope of Work', spacing: { after: 100 } }),
        new Paragraph({ text: '   4.1 In Scope', spacing: { after: 100 } }),
        new Paragraph({ text: '   4.2 Out of Scope', spacing: { after: 100 } }),
        new Paragraph({ text: '5. Use Cases', spacing: { after: 100 } }),
        new Paragraph({ text: '6. Project Timeline', spacing: { after: 100 } }),
        new Paragraph({ text: '7. RACI Matrix', spacing: { after: 100 } }),
        new Paragraph({ text: '8. Additional Notes', spacing: { after: 100 } }),
        versionInfo.revisionHistory.length > 0 && new Paragraph({ text: '9. Revision History', spacing: { after: 100 } }),
        new Paragraph({
          children: [new PageBreak()],
        }),
      ].filter(Boolean) as Paragraph[];

      // Document Version Info Table
      const versionTableRows = [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: 'Document Version', alignment: AlignmentType.LEFT })],
              width: { size: 30, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ text: versionInfo.versionNumber })],
              width: { size: 70, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Date' })] }),
            new TableCell({ children: [new Paragraph({ text: new Date().toLocaleDateString() })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Customer' })] }),
            new TableCell({ children: [new Paragraph({ text: documentData.customerName })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Product/Solution' })] }),
            new TableCell({ children: [new Paragraph({ text: documentData.productName })] }),
          ],
        }),
      ];

      if (versionInfo.preparedBy) {
        versionTableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: 'Prepared By' })] }),
              new TableCell({ children: [new Paragraph({ text: versionInfo.preparedBy })] }),
            ],
          })
        );
      }

      if (versionInfo.reviewedBy) {
        versionTableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: 'Reviewed By' })] }),
              new TableCell({ children: [new Paragraph({ text: versionInfo.reviewedBy })] }),
            ],
          })
        );
      }

      if (versionInfo.approvedBy) {
        versionTableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: 'Approved By' })] }),
              new TableCell({ children: [new Paragraph({ text: versionInfo.approvedBy })] }),
            ],
          })
        );
      }

      const versionTable = new Table({
        rows: versionTableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      });

      // Content sections
      const contentChildren: (Paragraph | Table)[] = [
        // Executive Summary / Document Info
        new Paragraph({
          text: '1. Executive Summary',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        versionTable,
        new Paragraph({
          children: [new TextRun({ text: '', break: 1 })],
        }),

        // Problem Statement
        new Paragraph({
          text: '2. Problem Statement',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: documentData.problemStatement || 'No problem statement provided.',
          spacing: { after: 200 },
        }),

        // Proposed Solution
        new Paragraph({
          text: '3. Proposed Solution',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: documentData.proposedSolution || 'No solution provided.',
          spacing: { after: 200 },
        }),

        // Scope of Work
        new Paragraph({
          text: '4. Scope of Work',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: '4.1 In Scope',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),
        ...documentData.scopeInclusions.map(
          (item) =>
            new Paragraph({
              text: `• ${item}`,
              spacing: { after: 50 },
            })
        ),
        new Paragraph({
          text: '4.2 Out of Scope',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),
        ...documentData.scopeExclusions.map(
          (item) =>
            new Paragraph({
              text: `• ${item}`,
              spacing: { after: 50 },
            })
        ),

        // Use Cases
        new Paragraph({
          text: '5. Use Cases',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        ...documentData.useCases.flatMap((uc, index) => [
          new Paragraph({
            text: `5.${index + 1} ${uc.title}`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            text: uc.description,
            spacing: { after: 50 },
          }),
          uc.expectedOutcome &&
            new Paragraph({
              text: `Expected Outcome: ${uc.expectedOutcome}`,
              spacing: { after: 50 },
            }),
          uc.priority &&
            new Paragraph({
              text: `Priority: ${uc.priority}`,
              spacing: { after: 100 },
            }),
        ]).filter(Boolean) as Paragraph[],

        // Timeline
        new Paragraph({
          text: '6. Project Timeline',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
      ];

      // Timeline Table
      if (documentData.milestones.length > 0) {
        const timelineTable = new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: 'Milestone', alignment: AlignmentType.CENTER })],
                  shading: { fill: 'D3D3D3' },
                }),
                new TableCell({
                  children: [new Paragraph({ text: 'Start Date', alignment: AlignmentType.CENTER })],
                  shading: { fill: 'D3D3D3' },
                }),
                new TableCell({
                  children: [new Paragraph({ text: 'End Date', alignment: AlignmentType.CENTER })],
                  shading: { fill: 'D3D3D3' },
                }),
                new TableCell({
                  children: [new Paragraph({ text: 'Status', alignment: AlignmentType.CENTER })],
                  shading: { fill: 'D3D3D3' },
                }),
              ],
            }),
            ...documentData.milestones.map(
              (m) =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: m.name })] }),
                    new TableCell({ children: [new Paragraph({ text: m.startDate })] }),
                    new TableCell({ children: [new Paragraph({ text: m.endDate })] }),
                    new TableCell({ children: [new Paragraph({ text: m.status || 'Pending' })] }),
                  ],
                })
            ),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        });
        contentChildren.push(timelineTable);
      } else {
        contentChildren.push(new Paragraph({ text: 'No milestones defined.', spacing: { after: 200 } }));
      }

      // RACI Matrix
      contentChildren.push(
        new Paragraph({
          text: '7. RACI Matrix',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      if (documentData.raciMatrix.length > 0) {
        const raciTable = new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: 'Activity', alignment: AlignmentType.CENTER })],
                  shading: { fill: 'D3D3D3' },
                }),
                new TableCell({
                  children: [new Paragraph({ text: 'Responsible', alignment: AlignmentType.CENTER })],
                  shading: { fill: 'D3D3D3' },
                }),
                new TableCell({
                  children: [new Paragraph({ text: 'Accountable', alignment: AlignmentType.CENTER })],
                  shading: { fill: 'D3D3D3' },
                }),
                new TableCell({
                  children: [new Paragraph({ text: 'Consulted', alignment: AlignmentType.CENTER })],
                  shading: { fill: 'D3D3D3' },
                }),
                new TableCell({
                  children: [new Paragraph({ text: 'Informed', alignment: AlignmentType.CENTER })],
                  shading: { fill: 'D3D3D3' },
                }),
              ],
            }),
            ...documentData.raciMatrix.map(
              (r) =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: r.activity })] }),
                    new TableCell({ children: [new Paragraph({ text: r.responsible })] }),
                    new TableCell({ children: [new Paragraph({ text: r.accountable })] }),
                    new TableCell({ children: [new Paragraph({ text: r.consulted })] }),
                    new TableCell({ children: [new Paragraph({ text: r.informed })] }),
                  ],
                })
            ),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        });
        contentChildren.push(raciTable);
      } else {
        contentChildren.push(new Paragraph({ text: 'No RACI matrix defined.', spacing: { after: 200 } }));
      }

      // Additional Notes
      contentChildren.push(
        new Paragraph({
          text: '8. Additional Notes',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: documentData.additionalNotes || 'No additional notes.',
          spacing: { after: 200 },
        })
      );

      // Revision History
      if (versionInfo.revisionHistory.length > 0) {
        contentChildren.push(
          new Paragraph({
            text: '9. Revision History',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          })
        );

        const revisionTable = new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: 'Version', alignment: AlignmentType.CENTER })],
                  shading: { fill: 'D3D3D3' },
                }),
                new TableCell({
                  children: [new Paragraph({ text: 'Date', alignment: AlignmentType.CENTER })],
                  shading: { fill: 'D3D3D3' },
                }),
                new TableCell({
                  children: [new Paragraph({ text: 'Author', alignment: AlignmentType.CENTER })],
                  shading: { fill: 'D3D3D3' },
                }),
                new TableCell({
                  children: [new Paragraph({ text: 'Changes', alignment: AlignmentType.CENTER })],
                  shading: { fill: 'D3D3D3' },
                }),
              ],
            }),
            ...versionInfo.revisionHistory.map(
              (r) =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: r.version })] }),
                    new TableCell({ children: [new Paragraph({ text: r.date })] }),
                    new TableCell({ children: [new Paragraph({ text: r.author })] }),
                    new TableCell({ children: [new Paragraph({ text: r.changes })] }),
                  ],
                })
            ),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        });
        contentChildren.push(revisionTable);
      }

      // Company Footer info
      if (branding.companyName || branding.address || branding.website) {
        contentChildren.push(
          new Paragraph({
            children: [new TextRun({ text: '', break: 2 })],
          }),
          new Paragraph({
            text: '---',
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: branding.companyName,
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
          })
        );
        if (branding.address) {
          contentChildren.push(
            new Paragraph({
              text: branding.address,
              alignment: AlignmentType.CENTER,
            })
          );
        }
        if (branding.website || branding.email || branding.phone) {
          contentChildren.push(
            new Paragraph({
              text: [branding.website, branding.email, branding.phone].filter(Boolean).join(' | '),
              alignment: AlignmentType.CENTER,
            })
          );
        }
      }

      const doc = new Document({
        sections: [
          {
            children: [...titlePageChildren, ...tocChildren, ...contentChildren],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `${documentData.title || documentData.productName}_${docTypeLabel}_v${versionInfo.versionNumber}.docx`
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_.-]/g, '');
      saveAs(blob, fileName);
      toast.success('Document exported successfully!');
      
      // Save branding and version info
      if (onSaveBranding) onSaveBranding(branding);
      if (onSaveVersionInfo) onSaveVersionInfo(versionInfo);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export document: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsPDF = () => {
    // For PDF, we'll use the print dialog as a workaround
    toast.info('Opening print dialog - select "Save as PDF" to export');
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Document
          </DialogTitle>
          <DialogDescription>
            Configure branding, versioning, and export your document
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="version" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Version Info
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      value={branding.companyName}
                      onChange={(e) => setBranding(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input
                      value={branding.tagline}
                      onChange={(e) => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
                      placeholder="Your company tagline"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea
                    value={branding.address}
                    onChange={(e) => setBranding(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Company address"
                    className="min-h-[60px]"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      value={branding.website}
                      onChange={(e) => setBranding(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="www.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={branding.email}
                      onChange={(e) => setBranding(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="info@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={branding.phone}
                      onChange={(e) => setBranding(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="version" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Document Version</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Version Number</Label>
                    <Input
                      value={versionInfo.versionNumber}
                      onChange={(e) => setVersionInfo(prev => ({ ...prev, versionNumber: e.target.value }))}
                      placeholder="1.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prepared By</Label>
                    <Input
                      value={versionInfo.preparedBy}
                      onChange={(e) => setVersionInfo(prev => ({ ...prev, preparedBy: e.target.value }))}
                      placeholder="Your name"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Reviewed By</Label>
                    <Input
                      value={versionInfo.reviewedBy}
                      onChange={(e) => setVersionInfo(prev => ({ ...prev, reviewedBy: e.target.value }))}
                      placeholder="Reviewer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Approved By</Label>
                    <Input
                      value={versionInfo.approvedBy}
                      onChange={(e) => setVersionInfo(prev => ({ ...prev, approvedBy: e.target.value }))}
                      placeholder="Approver name"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revision History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {versionInfo.revisionHistory.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left">Version</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Author</th>
                          <th className="px-3 py-2 text-left">Changes</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {versionInfo.revisionHistory.map((rev, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-3 py-2">{rev.version}</td>
                            <td className="px-3 py-2">{rev.date}</td>
                            <td className="px-3 py-2">{rev.author}</td>
                            <td className="px-3 py-2">{rev.changes}</td>
                            <td className="px-3 py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRevisionEntry(index)}
                              >
                                ×
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Separator />
                <div className="grid gap-3 md:grid-cols-4">
                  <Input
                    placeholder="Version"
                    value={newRevision.version}
                    onChange={(e) => setNewRevision(prev => ({ ...prev, version: e.target.value }))}
                  />
                  <Input
                    type="date"
                    value={newRevision.date}
                    onChange={(e) => setNewRevision(prev => ({ ...prev, date: e.target.value }))}
                  />
                  <Input
                    placeholder="Author"
                    value={newRevision.author}
                    onChange={(e) => setNewRevision(prev => ({ ...prev, author: e.target.value }))}
                  />
                  <Input
                    placeholder="Changes"
                    value={newRevision.changes}
                    onChange={(e) => setNewRevision(prev => ({ ...prev, changes: e.target.value }))}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={addRevisionEntry}>
                  Add Revision Entry
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Document Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <p><strong>Title:</strong> {documentData.title || `${documentData.productName} ${docTypeLabel}`}</p>
                  <p><strong>Customer:</strong> {documentData.customerName}</p>
                  <p><strong>Product:</strong> {documentData.productName}</p>
                  <p><strong>Version:</strong> {versionInfo.versionNumber}</p>
                  {versionInfo.preparedBy && <p><strong>Prepared By:</strong> {versionInfo.preparedBy}</p>}
                  {branding.companyName && <p><strong>Company:</strong> {branding.companyName}</p>}
                </div>
                <Separator />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Document Contents:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Title Page with branding</li>
                    <li>Table of Contents</li>
                    <li>Executive Summary</li>
                    <li>Problem Statement</li>
                    <li>Proposed Solution</li>
                    <li>Scope of Work ({documentData.scopeInclusions.length} in-scope, {documentData.scopeExclusions.length} out-of-scope items)</li>
                    <li>Use Cases ({documentData.useCases.length} cases)</li>
                    <li>Project Timeline ({documentData.milestones.length} milestones)</li>
                    <li>RACI Matrix ({documentData.raciMatrix.length} activities)</li>
                    <li>Additional Notes</li>
                    {versionInfo.revisionHistory.length > 0 && <li>Revision History ({versionInfo.revisionHistory.length} entries)</li>}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={generateWordDocument}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Export as Word (.docx)
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={exportAsPDF}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF (Print)
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
