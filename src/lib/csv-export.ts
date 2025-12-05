export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns: { key: keyof T; label: string; transform?: (value: unknown) => string }[]
) {
  if (data.length === 0) return;

  const headers = columns.map((col) => col.label).join(",");
  
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        const transformed = col.transform ? col.transform(value) : String(value ?? "");
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        const escaped = transformed.replace(/"/g, '""');
        return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
      })
      .join(",")
  );

  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
