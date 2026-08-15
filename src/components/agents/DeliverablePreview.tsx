import { Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeHtml } from "@/lib/sanitize-html";

interface DeliverablePreviewProps {
  title: string;
  html: string;
  subtitle?: string;
}

const wrapForExport = (title: string, html: string) => `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:'Bai Jamjuree','Segoe UI',sans-serif;color:#0b1f33;max-width:900px;margin:40px auto;padding:0 24px;line-height:1.6}
h1{font-size:26px;border-bottom:2px solid #1f6feb;padding-bottom:10px}
h2{font-size:19px;margin-top:28px;color:#123a63}
h3{font-size:16px;color:#123a63}
table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{border:1px solid #d9e8f5;padding:8px 10px;text-align:left;font-size:13px}
th{background:#f2f8ff}
.kpi-grid{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0}
.kpi{border:1px solid #d9e8f5;border-radius:12px;padding:12px 16px;min-width:150px;display:flex;flex-direction:column}
.kpi-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#5d7186}
.kpi-value{font-size:22px;font-weight:700}
.kpi-delta{font-size:12px;color:#5d7186}
</style></head><body><h1>${title}</h1>${html}</body></html>`;

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DeliverablePreview({ title, html, subtitle }: DeliverablePreviewProps) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "deliverable";

  const printDoc = () => {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(wrapForExport(title, sanitizeHtml(html)));
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            <span className="truncate">{title}</span>
          </CardTitle>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={printDoc}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => download(`${slug}.doc`, wrapForExport(title, sanitizeHtml(html)), "application/msword")}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> Word
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="agent-deliverable max-h-[60vh] overflow-y-auto rounded-lg border bg-card/50 p-5"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
        />
      </CardContent>
    </Card>
  );
}
