import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface PreviewRow {
  data: Record<string, string>;
  isValid: boolean;
  errors: string[];
  isDuplicate?: boolean;
  duplicateInfo?: string;
}

interface CSVPreviewTableProps {
  rows: PreviewRow[];
  columns: string[];
  requiredColumns: string[];
}

export function CSVPreviewTable({ rows, columns, requiredColumns }: CSVPreviewTableProps) {
  const validCount = rows.filter(r => r.isValid && !r.isDuplicate).length;
  const invalidCount = rows.filter(r => !r.isValid).length;
  const duplicateCount = rows.filter(r => r.isDuplicate).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">{validCount} new rows</span>
        </div>
        {duplicateCount > 0 && (
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-amber-500" />
            <span className="text-amber-600">{duplicateCount} duplicates</span>
          </div>
        )}
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
                className={
                  !row.isValid 
                    ? "bg-destructive/5" 
                    : row.isDuplicate 
                    ? "bg-amber-500/10" 
                    : undefined
                }
              >
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  {!row.isValid ? (
                    <Badge variant="destructive" className="text-xs">
                      Error
                    </Badge>
                  ) : row.isDuplicate ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
                            Duplicate
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{row.duplicateInfo}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Badge variant="outline" className="text-primary border-primary/30">
                      New
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

      {rows.some(r => r.isDuplicate) && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm font-medium text-amber-600 mb-2">Duplicate Warning</p>
          <p className="text-xs text-muted-foreground">
            {rows.filter(r => r.isDuplicate).length} row(s) already exist in the database. 
            These will still be imported as new records unless you remove them.
          </p>
        </div>
      )}

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
