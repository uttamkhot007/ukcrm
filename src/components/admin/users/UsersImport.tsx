import { useState } from "react";
import { supabase } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Loader2, FileText, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { parseCSVFile } from "@/lib/csv-import";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ImportRecord {
  full_name: string;
  email: string;
  department?: string;
  job_title?: string;
  employee_code?: string;
  location?: string;
  birth_date?: string;
  hire_date?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function UsersImport() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<ImportRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setImportResult(null);

    try {
      const parsed = await parseCSVFile<any>(selectedFile);
      
      const records: ImportRecord[] = parsed.map((row: any) => ({
        full_name: row.full_name || row.name || '',
        email: row.email || '',
        department: row.department || '',
        job_title: row.job_title || row.title || row.designation || '',
        employee_code: row.employee_code || row.emp_code || row.code || '',
        location: row.location || row.office || '',
        birth_date: row.birth_date || row.dob || '',
        hire_date: row.hire_date || row.joining_date || row.start_date || '',
      }));

      setCsvData(records);
    } catch (error) {
      toast({
        title: "Error parsing CSV",
        description: "Please check the file format",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!csvData.length || !user || !currentTenant) {
      toast({
        title: "Error",
        description: "Please select a file and ensure you're in a workspace",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    try {
      const validRecords = csvData.filter(record => record.email && record.full_name);
      
      const response = await supabase.functions.invoke("create-users", {
        body: {
          users: validRecords.map(record => ({
            email: record.email,
            full_name: record.full_name,
            department: record.department,
            job_title: record.job_title,
            employee_code: record.employee_code,
            location: record.location,
            birth_date: record.birth_date || null,
            hire_date: record.hire_date || null,
            tenant_id: currentTenant.id,
          })),
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      result.success = data.success || 0;
      result.failed = data.failed || 0;
      result.errors = data.errors || [];

      setImportResult(result);

      if (result.success > 0) {
        toast({
          title: "Import Completed",
          description: `${result.success} users imported successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
        });
      } else {
        toast({
          title: "Import Failed",
          description: "No users were imported",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : "Failed to import users",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const headers = "full_name,email,department,job_title,employee_code,location,birth_date,hire_date";
    const sample = "John Doe,john@example.com,Engineering,Software Engineer,EMP001,New York,1990-01-15,2023-06-01";
    const csvContent = `${headers}\n${sample}`;
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users-import-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Users from CSV
          </CardTitle>
          <CardDescription>
            Bulk import employees and contractors from a CSV file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
          </div>

          {csvData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {csvData.length} records found
                  </span>
                </div>
                <Badge variant="outline">
                  {csvData.filter(r => r.email && r.full_name).length} valid
                </Badge>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Job Title</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.full_name}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.department || '-'}</TableCell>
                        <TableCell>{row.job_title || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {csvData.length > 5 && (
                  <div className="p-2 text-center text-sm text-muted-foreground border-t">
                    ... and {csvData.length - 5} more rows
                  </div>
                )}
              </div>

              <Button
                onClick={handleImport}
                disabled={isProcessing || !csvData.length}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {csvData.filter(r => r.email && r.full_name).length} Users
                  </>
                )}
              </Button>
            </div>
          )}

          {importResult && (
            <div className="p-4 rounded-lg bg-muted space-y-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>{importResult.success} successful</span>
                </div>
                {importResult.failed > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span>{importResult.failed} failed</span>
                  </div>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="space-y-1">
                  {importResult.errors.slice(0, 3).map((error, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{error}</span>
                    </div>
                  ))}
                  {importResult.errors.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      ...and {importResult.errors.length - 3} more errors
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li><strong>full_name</strong> and <strong>email</strong> are required fields</li>
            <li>Dates should be in YYYY-MM-DD format (e.g., 2023-06-01)</li>
            <li>Duplicate emails will be skipped</li>
            <li>Users will be created with 'employee' role by default</li>
            <li>A temporary password will be generated - use Credentials tab to set passwords</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
