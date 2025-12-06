import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, X, Mail, Users, Download, ArrowLeft, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { importContactsFromPreview, importDealsFromPreview, ImportResult, parseContactsPreview, parseDealsPreview, ParsePreviewResult, ParsedPreviewRow } from "@/lib/csv-import";
import { useAuth } from "@/hooks/useAuth";
import { CSVPreviewTable } from "./CSVPreviewTable";

const VALID_DEAL_STAGES = ["pipeline", "upside", "strong_upside", "commit", "closed_won", "closed_lost"];

const TEMPLATE_URLS = {
  contacts: "/templates/hubspot-contacts-template.csv",
  deals: "/templates/hubspot-deals-template.csv",
};

interface ManualUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type UploadSource = "office365" | "zoho" | "hubspot" | "other";
type DataType = "contacts" | "deals" | "emails" | "activities";
type Step = "upload" | "preview";

interface UploadedFile {
  file: File;
  status: "pending" | "processing" | "success" | "error";
  recordCount?: number;
  error?: string;
}

export function ManualUploadDialog({ open, onOpenChange, onComplete }: ManualUploadDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [source, setSource] = useState<UploadSource | "">("");
  const [dataType, setDataType] = useState<DataType | "">("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<ParsePreviewResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles: UploadedFile[] = Array.from(files).map(file => ({
        file,
        status: "pending" as const,
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handlePreview = async () => {
    if (!dataType || uploadedFiles.length === 0) return;

    setIsParsing(true);
    try {
      // Only preview the first file for now
      const file = uploadedFiles[0].file;
      let result: ParsePreviewResult;

      if (dataType === "contacts") {
        result = await parseContactsPreview(file);
      } else if (dataType === "deals") {
        result = await parseDealsPreview(file);
      } else {
        toast({
          title: "Not Supported",
          description: `Preview for ${dataType} is not yet supported.`,
          variant: "destructive",
        });
        setIsParsing(false);
        return;
      }

      setPreviewData(result);
      setStep("preview");
    } catch (error) {
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse CSV file",
        variant: "destructive",
      });
    }
    setIsParsing(false);
  };

  const handleBackToUpload = () => {
    setStep("upload");
    setPreviewData(null);
  };

  const handleCellEdit = (rowIndex: number, column: string, value: string) => {
    if (!previewData) return;

    const updatedRows = [...previewData.rows];
    const row = { ...updatedRows[rowIndex] };
    row.data = { ...row.data, [column]: value };

    // Re-validate the row
    const errors: string[] = [];
    
    if (dataType === "contacts") {
      if (!row.data.name || row.data.name.trim() === "") {
        errors.push("Missing required field 'name'");
      }
    } else if (dataType === "deals") {
      if (!row.data.title || row.data.title.trim() === "") {
        errors.push("Missing required field 'title'");
      }
      if (row.data.stage) {
        const normalizedStage = row.data.stage.toLowerCase().replace(/\s+/g, "_");
        if (!VALID_DEAL_STAGES.includes(normalizedStage)) {
          errors.push(`Invalid stage '${row.data.stage}'`);
        }
      }
      if (row.data.expected_close_date) {
        const date = new Date(row.data.expected_close_date);
        if (isNaN(date.getTime())) {
          errors.push(`Invalid date format`);
        }
      }
    }

    row.errors = errors;
    row.isValid = errors.length === 0;
    updatedRows[rowIndex] = row;

    setPreviewData({ ...previewData, rows: updatedRows });
  };

  const handleUpload = async () => {
    if (!dataType || !previewData || !user) return;

    setIsProcessing(true);
    setImportErrors([]);

    let result: ImportResult;

    try {
      if (dataType === "contacts") {
        result = await importContactsFromPreview(previewData.rows, user.id);
      } else if (dataType === "deals") {
        result = await importDealsFromPreview(previewData.rows, user.id);
      } else {
        result = {
          success: false,
          recordCount: 0,
          errors: [`Import for ${dataType} is not yet supported.`],
        };
      }

      if (result.success) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${result.recordCount} ${dataType}.`,
        });
        onComplete();
      } else {
        setImportErrors(result.errors);
        if (result.errors.length > 0) {
          toast({
            title: "Import Failed",
            description: result.errors[0],
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setImportErrors([errorMessage]);
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  };

  const resetForm = () => {
    setStep("upload");
    setSource("");
    setDataType("");
    setUploadedFiles([]);
    setImportErrors([]);
    setPreviewData(null);
  };

  const getSourceIcon = (source: UploadSource) => {
    switch (source) {
      case "office365":
        return <Mail className="w-4 h-4" />;
      case "zoho":
        return <Mail className="w-4 h-4" />;
      case "hubspot":
        return <Users className="w-4 h-4" />;
      default:
        return <FileSpreadsheet className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-y-auto",
        step === "preview" ? "sm:max-w-[900px]" : "sm:max-w-[600px]"
      )}>
        <DialogHeader>
          <DialogTitle>
            {step === "upload" ? "Manual Data Upload" : "Preview Import Data"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" 
              ? "Upload CSV files exported from Office 365, Zoho Mail, HubSpot, or other sources."
              : `Review the ${previewData?.rows.length || 0} rows before importing to the database.`
            }
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-6 py-4">
            {/* Template Downloads */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <Download className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Download CSV Templates</p>
                <p className="text-xs text-muted-foreground">Use these templates to format your data correctly</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={TEMPLATE_URLS.contacts} download="hubspot-contacts-template.csv">
                    Contacts
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={TEMPLATE_URLS.deals} download="hubspot-deals-template.csv">
                    Deals
                  </a>
                </Button>
              </div>
            </div>

            {/* Source Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Source</Label>
                <Select value={source} onValueChange={(v) => setSource(v as UploadSource)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office365">
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[hsl(217,91%,60%)]" />
                        Office 365
                      </span>
                    </SelectItem>
                    <SelectItem value="zoho">
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[hsl(25,95%,53%)]" />
                        Zoho Mail
                      </span>
                    </SelectItem>
                    <SelectItem value="hubspot">
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[hsl(16,100%,50%)]" />
                        HubSpot
                      </span>
                    </SelectItem>
                    <SelectItem value="other">
                      <span className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        Other
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Type</Label>
                <Select value={dataType} onValueChange={(v) => setDataType(v as DataType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contacts">Contacts</SelectItem>
                    <SelectItem value="deals">Deals / Opportunities</SelectItem>
                    <SelectItem value="emails" disabled>Emails (coming soon)</SelectItem>
                    <SelectItem value="activities" disabled>Activities (coming soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File Upload Area */}
            <div className="space-y-3">
              <Label>Upload Files</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                  "hover:border-primary/50 hover:bg-primary/5",
                  "border-border"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV files only (max 10MB each)
                </p>
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadedFiles.map((uploadedFile, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        uploadedFile.status === "success" && "bg-primary/5 border-primary/30",
                        uploadedFile.status === "error" && "bg-destructive/5 border-destructive/30",
                        uploadedFile.status === "pending" && "border-border",
                        uploadedFile.status === "processing" && "border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{uploadedFile.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(uploadedFile.file.size / 1024).toFixed(1)} KB
                            {uploadedFile.recordCount !== undefined && ` • ${uploadedFile.recordCount} records imported`}
                            {uploadedFile.error && <span className="text-destructive"> • {uploadedFile.error}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {uploadedFile.status === "processing" && (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        )}
                        {uploadedFile.status === "success" && (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        )}
                        {uploadedFile.status === "error" && (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                        {uploadedFile.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Import Errors */}
            {importErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm font-medium text-destructive mb-2">Import Warnings</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {importErrors.slice(0, 5).map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                  {importErrors.length > 5 && (
                    <li>• ... and {importErrors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="py-4">
            {previewData && (
              <CSVPreviewTable
                rows={previewData.rows}
                columns={previewData.columns}
                requiredColumns={previewData.requiredColumns}
                onCellEdit={handleCellEdit}
              />
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "preview" && (
            <Button variant="outline" onClick={handleBackToUpload} className="mr-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button variant="outline" onClick={() => {
            resetForm();
            onOpenChange(false);
          }}>
            Cancel
          </Button>
          {step === "upload" ? (
            <Button 
              onClick={handlePreview} 
              disabled={!source || !dataType || uploadedFiles.length === 0 || isParsing}
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Data
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleUpload} 
              disabled={!previewData || previewData.rows.filter(r => r.isValid).length === 0 || isProcessing || !user}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import {previewData?.rows.filter(r => r.isValid).length || 0} Rows
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
