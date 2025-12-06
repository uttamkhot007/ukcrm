import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, X, Mail, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ManualUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type UploadSource = "office365" | "zoho" | "hubspot" | "other";
type DataType = "contacts" | "deals" | "emails" | "activities";

interface UploadedFile {
  file: File;
  status: "pending" | "processing" | "success" | "error";
  recordCount?: number;
  error?: string;
}

export function ManualUploadDialog({ open, onOpenChange, onComplete }: ManualUploadDialogProps) {
  const [source, setSource] = useState<UploadSource | "">("");
  const [dataType, setDataType] = useState<DataType | "">("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
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

  const handleUpload = async () => {
    if (!source || !dataType || uploadedFiles.length === 0) return;

    setIsProcessing(true);

    // Process each file
    for (let i = 0; i < uploadedFiles.length; i++) {
      setUploadedFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: "processing" as const } : f
      ));

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate success (in real app, this would parse the file)
      const recordCount = Math.floor(Math.random() * 500) + 50;
      setUploadedFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: "success" as const, recordCount } : f
      ));
    }

    setIsProcessing(false);

    const totalRecords = uploadedFiles.reduce((sum, f) => sum + (f.recordCount || 0), 0);
    toast({
      title: "Upload Complete",
      description: `Successfully imported ${totalRecords} records from ${uploadedFiles.length} file(s).`,
    });

    onComplete();
    resetForm();
  };

  const resetForm = () => {
    setSource("");
    setDataType("");
    setUploadedFiles([]);
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manual Data Upload</DialogTitle>
          <DialogDescription>
            Upload CSV or Excel files exported from Office 365, Zoho Mail, HubSpot, or other sources.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
                  <SelectItem value="emails">Emails</SelectItem>
                  <SelectItem value="activities">Activities</SelectItem>
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
                accept=".csv,.xlsx,.xls"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV, XLSX, or XLS files (max 10MB each)
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
                      uploadedFile.status === "processing" && "border-support/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{uploadedFile.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.file.size / 1024).toFixed(1)} KB
                          {uploadedFile.recordCount && ` • ${uploadedFile.recordCount} records`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {uploadedFile.status === "processing" && (
                        <Loader2 className="w-4 h-4 animate-spin text-support" />
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
                          onClick={() => removeFile(index)}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            resetForm();
            onOpenChange(false);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!source || !dataType || uploadedFiles.length === 0 || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload & Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
