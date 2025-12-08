import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle, X, Trash2 } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";

export type BulkUploadType = 
  | "alliance-contacts" 
  | "resellers" 
  | "products" 
  | "technologies" 
  | "oems";

interface ParsedRow {
  data: Record<string, string>;
  isValid: boolean;
  errors: string[];
  isDuplicate?: boolean;
  duplicateInfo?: string;
}

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadType: BulkUploadType;
  onComplete?: () => void;
}

const uploadTypeConfig: Record<BulkUploadType, {
  title: string;
  templatePath: string;
  requiredFields: string[];
  allFields: string[];
  tableName: string;
}> = {
  "alliance-contacts": {
    title: "Alliance Contacts",
    templatePath: "/templates/alliance-contacts-template.csv",
    requiredFields: ["name"],
    allFields: ["name", "email", "phone", "location", "role", "organization_name", "notes"],
    tableName: "alliance_users",
  },
  "resellers": {
    title: "Resellers",
    templatePath: "/templates/resellers-template.csv",
    requiredFields: ["name"],
    allFields: ["name", "website", "industry", "address", "description"],
    tableName: "alliance_organizations",
  },
  "products": {
    title: "Products",
    templatePath: "/templates/products-template.csv",
    requiredFields: ["name"],
    allFields: ["name", "category", "description", "status"],
    tableName: "offerings_products",
  },
  "technologies": {
    title: "Technologies",
    templatePath: "/templates/technologies-template.csv",
    requiredFields: ["name"],
    allFields: ["name", "category", "vendor", "description", "status"],
    tableName: "offerings_technologies",
  },
  "oems": {
    title: "OEMs",
    templatePath: "/templates/oems-template.csv",
    requiredFields: ["name"],
    allFields: ["name", "website", "partnership_level", "description", "status"],
    tableName: "offerings_oems",
  },
};

export function BulkUploadDialog({ open, onOpenChange, uploadType, onComplete }: BulkUploadDialogProps) {
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const config = uploadTypeConfig[uploadType];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error("Please upload a CSV file");
        return;
      }
      setFile(selectedFile);
    }
  };

  const parseFile = async () => {
    if (!file) return;
    
    setIsParsing(true);
    try {
      const results = await new Promise<any>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, "_"),
          complete: resolve,
          error: reject,
        });
      });

      // Fetch existing data for duplicate detection
      let existingNames = new Set<string>();
      let existingEmails = new Set<string>();
      
      if (uploadType === "alliance-contacts") {
        // Fetch from both alliance_users and contacts for email duplicate detection
        const { data: auData } = await supabase
          .from("alliance_users")
          .select("name, email")
          .eq("tenant_id", currentTenant?.id);
        auData?.forEach(item => {
          if (item.name) existingNames.add(item.name.toLowerCase());
          if (item.email) existingEmails.add(item.email.toLowerCase().trim());
        });
        
        const { data: contactsData } = await supabase
          .from("contacts")
          .select("email")
          .eq("tenant_id", currentTenant?.id);
        contactsData?.forEach(item => {
          if (item.email) existingEmails.add(item.email.toLowerCase().trim());
        });
      } else if (uploadType === "resellers") {
        const { data } = await supabase
          .from("alliance_organizations")
          .select("name")
          .eq("tenant_id", currentTenant?.id)
          .ilike("organization_type", "reseller");
        data?.forEach(item => {
          if (item.name) existingNames.add(item.name.toLowerCase());
        });
      } else if (uploadType === "products") {
        const { data } = await supabase
          .from("offerings_products" as any)
          .select("name")
          .eq("tenant_id", currentTenant?.id);
        (data as any[])?.forEach(item => {
          if (item.name) existingNames.add(item.name.toLowerCase());
        });
      } else if (uploadType === "technologies") {
        const { data } = await supabase
          .from("offerings_technologies")
          .select("name")
          .eq("tenant_id", currentTenant?.id);
        data?.forEach(item => {
          if (item.name) existingNames.add(item.name.toLowerCase());
        });
      } else if (uploadType === "oems") {
        const { data } = await supabase
          .from("offerings_oems")
          .select("name")
          .eq("tenant_id", currentTenant?.id);
        data?.forEach(item => {
          if (item.name) existingNames.add(item.name.toLowerCase());
        });
      }

      // Track emails seen within the current file to detect in-file duplicates
      const emailsInFile = new Set<string>();

      const rows: ParsedRow[] = results.data.map((row: any) => {
        const errors: string[] = [];
        let isDuplicate = false;
        let duplicateInfo = "";

        // Validate required fields
        for (const field of config.requiredFields) {
          if (!row[field] || row[field].trim() === "") {
            errors.push(`Missing required field '${field}'`);
          }
        }

        // Check duplicates by email for alliance-contacts
        if (uploadType === "alliance-contacts") {
          const emailToCheck = row.email?.toLowerCase().trim();
          if (emailToCheck) {
            if (existingEmails.has(emailToCheck)) {
              isDuplicate = true;
              duplicateInfo = `Email "${row.email}" already exists`;
            } else if (emailsInFile.has(emailToCheck)) {
              isDuplicate = true;
              duplicateInfo = `Duplicate email "${row.email}" in file`;
            } else {
              emailsInFile.add(emailToCheck);
            }
          }
        } else {
          // For other types, check by name
          if (row.name && existingNames.has(row.name.toLowerCase())) {
            isDuplicate = true;
            duplicateInfo = `"${row.name}" already exists`;
          }
        }

        const data: Record<string, string> = {};
        for (const field of config.allFields) {
          data[field] = row[field] || "";
        }

        return {
          data,
          isValid: errors.length === 0,
          errors,
          isDuplicate,
          duplicateInfo,
        };
      });

      setParsedRows(rows);
      setStep("preview");
    } catch (error) {
      toast.error("Failed to parse file");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!currentTenant || !user) return;

    const validRows = parsedRows.filter(r => r.isValid && !r.isDuplicate);
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setIsProcessing(true);
    try {
      let successCount = 0;

      if (uploadType === "alliance-contacts") {
        // Find organizations by name for matching
        const { data: orgs } = await supabase
          .from("alliance_organizations")
          .select("id, name")
          .eq("tenant_id", currentTenant.id);
        
        const orgNameMap = new Map<string, string>();
        orgs?.forEach(org => {
          orgNameMap.set(org.name.toLowerCase(), org.id);
        });

        const contactsToInsert = validRows.map(row => ({
          name: row.data.name.trim(),
          email: row.data.email?.trim() || null,
          phone: row.data.phone?.trim() || null,
          location: row.data.location?.trim() || null,
          role: row.data.role?.trim() || null,
          organization_id: row.data.organization_name ? orgNameMap.get(row.data.organization_name.toLowerCase()) || null : null,
          notes: row.data.notes?.trim() || null,
          status: "active",
          tenant_id: currentTenant.id,
          created_by: user.id,
        }));

        const { error } = await supabase.from("alliance_users").insert(contactsToInsert);
        if (error) throw error;
        successCount = contactsToInsert.length;

      } else if (uploadType === "resellers") {
        const resellersToInsert = validRows.map(row => ({
          name: row.data.name.trim(),
          website: row.data.website?.trim() || null,
          industry: row.data.industry?.trim() || null,
          address: row.data.address?.trim() || null,
          description: row.data.description?.trim() || null,
          organization_type: "reseller",
          status: "active",
          tenant_id: currentTenant.id,
          created_by: user.id,
        }));

        const { error } = await supabase.from("alliance_organizations").insert(resellersToInsert);
        if (error) throw error;
        successCount = resellersToInsert.length;

      } else if (uploadType === "products") {
        const productsToInsert = validRows.map(row => ({
          name: row.data.name.trim(),
          category: row.data.category?.trim() || null,
          description: row.data.description?.trim() || null,
          status: row.data.status?.trim() || "active",
          tenant_id: currentTenant.id,
          created_by: user.id,
        }));

        const { error } = await supabase.from("offerings_products" as any).insert(productsToInsert);
        if (error) throw error;
        successCount = productsToInsert.length;

      } else if (uploadType === "technologies") {
        const technologiesToInsert = validRows.map(row => ({
          name: row.data.name.trim(),
          category: row.data.category?.trim() || null,
          vendor: row.data.vendor?.trim() || null,
          description: row.data.description?.trim() || null,
          status: row.data.status?.trim() || "active",
          tenant_id: currentTenant.id,
          created_by: user.id,
        }));

        const { error } = await supabase.from("offerings_technologies").insert(technologiesToInsert);
        if (error) throw error;
        successCount = technologiesToInsert.length;

      } else if (uploadType === "oems") {
        const oemsToInsert = validRows.map(row => ({
          name: row.data.name.trim(),
          website: row.data.website?.trim() || null,
          partnership_level: row.data.partnership_level?.trim() || null,
          description: row.data.description?.trim() || null,
          status: row.data.status?.trim() || "active",
          tenant_id: currentTenant.id,
          created_by: user.id,
        }));

        const { error } = await supabase.from("offerings_oems").insert(oemsToInsert);
        if (error) throw error;
        successCount = oemsToInsert.length;
      }

      toast.success(`Successfully imported ${successCount} ${config.title.toLowerCase()}`);
      onComplete?.();
      handleClose();
    } catch (error: any) {
      toast.error("Import failed: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setFile(null);
    setParsedRows([]);
    onOpenChange(false);
  };

  const handleCellEdit = (rowIndex: number, field: string, value: string) => {
    setParsedRows(prev => {
      const updated = [...prev];
      updated[rowIndex] = {
        ...updated[rowIndex],
        data: { ...updated[rowIndex].data, [field]: value },
      };
      
      // Re-validate required fields
      const errors: string[] = [];
      for (const reqField of config.requiredFields) {
        if (!updated[rowIndex].data[reqField] || updated[rowIndex].data[reqField].trim() === "") {
          errors.push(`Missing required field '${reqField}'`);
        }
      }
      updated[rowIndex].isValid = errors.length === 0;
      updated[rowIndex].errors = errors;
      
      return updated;
    });
  };

  const handleRowDelete = (rowIndex: number) => {
    setParsedRows(prev => prev.filter((_, i) => i !== rowIndex));
  };

  const handleRemoveAllDuplicates = () => {
    setParsedRows(prev => prev.filter(row => !row.isDuplicate));
    toast.success("Removed all duplicate rows");
  };

  const validCount = parsedRows.filter(r => r.isValid && !r.isDuplicate).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;
  const duplicateCount = parsedRows.filter(r => r.isDuplicate).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Upload {config.title}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6 py-4">
            {/* Download Template */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Download Template</p>
                <p className="text-sm text-muted-foreground">
                  Use this CSV template for bulk upload
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = config.templatePath;
                  link.download = `${uploadType}-template.csv`;
                  link.click();
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-3">
              <Label>Upload CSV File</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <span className="text-primary hover:underline">Choose a file</span>
                  <span className="text-muted-foreground"> or drag and drop</span>
                </label>
                {file && (
                  <p className="mt-2 text-sm font-medium text-primary">{file.name}</p>
                )}
              </div>
            </div>

            {/* Required Fields Info */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-2">Required Fields:</p>
              <div className="flex flex-wrap gap-2">
                {config.requiredFields.map(field => (
                  <Badge key={field} variant="secondary">{field}</Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Optional Fields: {config.allFields.filter(f => !config.requiredFields.includes(f)).join(", ")}
              </p>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {validCount} Valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {invalidCount} Invalid
                </Badge>
              )}
              {duplicateCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {duplicateCount} Duplicates
                </Badge>
              )}
              {duplicateCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleRemoveAllDuplicates}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove All Duplicates
                </Button>
              )}
            </div>

            {/* Preview Table */}
            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Status</TableHead>
                    {config.allFields.map(field => (
                      <TableHead key={field} className="capitalize">
                        {field.replace(/_/g, " ")}
                        {config.requiredFields.includes(field) && <span className="text-destructive ml-1">*</span>}
                      </TableHead>
                    ))}
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, rowIndex) => (
                    <TableRow 
                      key={rowIndex}
                      className={!row.isValid ? "bg-destructive/10" : row.isDuplicate ? "bg-warning/10" : ""}
                    >
                      <TableCell>
                        {row.isValid && !row.isDuplicate ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : row.isDuplicate ? (
                          <span className="text-xs text-warning">Dup</span>
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      {config.allFields.map(field => (
                        <TableCell key={field}>
                          <Input
                            value={row.data[field] || ""}
                            onChange={(e) => handleCellEdit(rowIndex, field, e.target.value)}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRowDelete(rowIndex)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Errors Summary */}
            {invalidCount > 0 && (
              <div className="text-sm text-destructive">
                {parsedRows.filter(r => !r.isValid).slice(0, 3).map((row, i) => (
                  <p key={i}>Row {parsedRows.indexOf(row) + 1}: {row.errors.join(", ")}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "preview" && (
            <Button variant="outline" onClick={() => setStep("upload")}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {step === "upload" ? (
            <Button 
              onClick={parseFile} 
              disabled={!file || isParsing}
            >
              {isParsing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Preview Data
            </Button>
          ) : (
            <Button 
              onClick={handleImport} 
              disabled={validCount === 0 || isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import {validCount} Records
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
