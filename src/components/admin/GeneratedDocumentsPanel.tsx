import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ExternalLink, FileDown, FileText, Paperclip } from "lucide-react";
import {
  exportAndAttachDocument,
  getDocumentSignedUrl,
  loadBranding,
  type ExportFormat,
} from "@/lib/document-export";

const SOURCE_LABEL: Record<string, string> = {
  deal: "Deal",
  contact: "Contact",
  project: "Project",
  ticket: "Support ticket",
  employee: "Employee",
};

export function GeneratedDocumentsPanel() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["generated-documents", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from("generated_documents")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentTenant?.id,
    staleTime: 2 * 60 * 1000,
  });

  const runExport = async (doc: any, format: ExportFormat) => {
    if (!currentTenant?.id) return;
    setBusyId(doc.id + format);
    try {
      const { data: tpl } = doc.template_id
        ? await supabase.from("document_templates").select("branding").eq("id", doc.template_id).maybeSingle()
        : { data: null };
      const branding = await loadBranding(currentTenant.id, (tpl?.branding ?? null) as any);
      const res = await exportAndAttachDocument({
        tenantId: currentTenant.id,
        userId: user?.id ?? null,
        format,
        branding,
        doc: {
          id: doc.id,
          title: doc.title,
          templateName: doc.template_name,
          templateType: doc.template_type,
          fields: (doc.final_fields ?? doc.ai_fields ?? {}) as Record<string, string>,
          sourceType: doc.source_type,
          sourceId: doc.source_id,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["generated-documents"] });
      toast.success(
        res.attachedTo
          ? `${format.toUpperCase()} saved to the ${SOURCE_LABEL[doc.source_type]?.toLowerCase() ?? "record"}`
          : `${format.toUpperCase()} generated`,
      );
    } catch (error: any) {
      toast.error("Export failed: " + (error?.message ?? "unknown error"));
    } finally {
      setBusyId(null);
    }
  };

  const openFile = async (filePath: string) => {
    try {
      window.open(await getDocumentSignedUrl(filePath), "_blank", "noopener");
    } catch (error: any) {
      toast.error("Could not open file: " + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No generated documents yet. Use <span className="font-medium">AI auto-fill</span> on a template to create
          one.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc: any) => (
        <Card key={doc.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{doc.title}</p>
                <Badge variant={doc.status === "final" ? "default" : "secondary"}>{doc.status}</Badge>
                {doc.source_type && (
                  <Badge variant="outline">{SOURCE_LABEL[doc.source_type] ?? doc.source_type}</Badge>
                )}
                {doc.attached_record_table && (
                  <Badge variant="outline" className="gap-1">
                    <Paperclip className="h-3 w-3" />
                    Attached to record
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {doc.template_name ?? "Custom"} · {new Date(doc.created_at).toLocaleString()}
                {doc.file_name ? ` · ${doc.file_name}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {doc.file_path && (
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => openFile(doc.file_path)}>
                  <ExternalLink className="h-3 w-3" />
                  Open
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={busyId === doc.id + "pdf"}
                onClick={() => runExport(doc, "pdf")}
              >
                <FileDown className="h-3 w-3" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={busyId === doc.id + "docx"}
                onClick={() => runExport(doc, "docx")}
              >
                <FileText className="h-3 w-3" />
                Word
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default GeneratedDocumentsPanel;
