import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface PreviewRow {
  data: Record<string, string>;
  isValid: boolean;
  errors: string[];
}

interface CSVPreviewTableProps {
  rows: PreviewRow[];
  columns: string[];
  requiredColumns: string[];
}

export function CSVPreviewTable({ rows, columns, requiredColumns }: CSVPreviewTableProps) {
  const validCount = rows.filter(r => r.isValid).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">{validCount} valid rows</span>
        </div>
        {invalidCount > 0 && (
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-destructive">{invalidCount} invalid rows</span>
          </div>
        )}
      </div>

      <ScrollArea className="h-[300px] border rounded-lg">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="w-20">Status</TableHead>
              {columns.map((col) => (
                <TableHead key={col} className="min-w-[120px]">
                  {col}
                  {requiredColumns.includes(col) && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow 
                key={index}
                className={!row.isValid ? "bg-destructive/5" : undefined}
              >
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  {row.isValid ? (
                    <Badge variant="outline" className="text-primary border-primary/30">
                      Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      Error
                    </Badge>
                  )}
                </TableCell>
                {columns.map((col) => (
                  <TableCell 
                    key={col} 
                    className={
                      requiredColumns.includes(col) && !row.data[col]
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {row.data[col] || (
                      requiredColumns.includes(col) ? (
                        <span className="text-destructive italic">Missing</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {rows.some(r => !r.isValid) && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <p className="text-sm font-medium text-destructive mb-2">Validation Errors</p>
          <ul className="text-xs text-muted-foreground space-y-1 max-h-24 overflow-y-auto">
            {rows
              .map((row, idx) => row.errors.map(e => ({ row: idx + 1, error: e })))
              .flat()
              .slice(0, 10)
              .map((item, i) => (
                <li key={i}>• Row {item.row}: {item.error}</li>
              ))}
            {rows.flatMap(r => r.errors).length > 10 && (
              <li className="text-muted-foreground">
                ... and {rows.flatMap(r => r.errors).length - 10} more errors
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
