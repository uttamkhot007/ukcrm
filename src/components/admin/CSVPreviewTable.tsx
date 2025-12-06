import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Copy, Pencil, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  onCellEdit?: (rowIndex: number, column: string, value: string) => void;
  onRowDelete?: (rowIndex: number) => void;
  onRemoveAllDuplicates?: () => void;
}

export function CSVPreviewTable({ rows, columns, requiredColumns, onCellEdit, onRowDelete, onRemoveAllDuplicates }: CSVPreviewTableProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const validCount = rows.filter(r => r.isValid && !r.isDuplicate).length;
  const invalidCount = rows.filter(r => !r.isValid).length;
  const duplicateCount = rows.filter(r => r.isDuplicate).length;

  const handleStartEdit = (rowIndex: number, column: string, currentValue: string) => {
    if (!onCellEdit) return;
    setEditingCell({ row: rowIndex, col: column });
    setEditValue(currentValue);
  };

  const handleFinishEdit = () => {
    if (editingCell && onCellEdit) {
      onCellEdit(editingCell.row, editingCell.col, editValue);
    }
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleFinishEdit();
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditValue("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">{validCount} new rows</span>
          </div>
          {duplicateCount > 0 && (
            <div className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-amber-500" />
              <span className="text-amber-600">{duplicateCount} duplicates</span>
              {onRemoveAllDuplicates && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs ml-1 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                  onClick={onRemoveAllDuplicates}
                >
                  Remove all
                </Button>
              )}
            </div>
          )}
          {invalidCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-destructive">{invalidCount} invalid rows</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {onCellEdit && (
            <div className="flex items-center gap-1">
              <Pencil className="w-3 h-3" />
              <span>Click to edit</span>
            </div>
          )}
          {onRowDelete && (
            <div className="flex items-center gap-1">
              <Trash2 className="w-3 h-3" />
              <span>Delete rows</span>
            </div>
          )}
        </div>
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
              {onRowDelete && <TableHead className="w-12"></TableHead>}
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
                {columns.map((col) => {
                  const isEditing = editingCell?.row === index && editingCell?.col === col;
                  const cellValue = row.data[col] || "";
                  const isMissing = requiredColumns.includes(col) && !cellValue;

                  return (
                    <TableCell 
                      key={col} 
                      className={cn(
                        "p-0",
                        isMissing ? "text-destructive" : "text-muted-foreground"
                      )}
                    >
                      {isEditing ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleFinishEdit}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className="h-8 text-sm border-primary focus-visible:ring-1"
                        />
                      ) : (
                        <div
                          onClick={() => handleStartEdit(index, col, cellValue)}
                          className={cn(
                            "px-4 py-2 min-h-[40px] flex items-center",
                            onCellEdit && "cursor-pointer hover:bg-muted/50 transition-colors"
                          )}
                        >
                          {cellValue || (
                            isMissing ? (
                              <span className="text-destructive italic">Missing</span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )
                          )}
                        </div>
                      )}
                    </TableCell>
                  );
                })}
                {onRowDelete && (
                  <TableCell className="p-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onRowDelete(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remove row</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                )}
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