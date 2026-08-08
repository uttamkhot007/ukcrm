import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/api/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Check, FileDown, FileText, Loader2, Sparkles } from "lucide-react";
import { exportAndAttachDocument, loadBranding, type ExportFormat } from "@/lib/document-export";

type SourceType = "deal" | "contact" | "project" | "employee" | "ticket";

const SOURCES: { value: SourceType; label: string; table: string; labelColumn: string }[] = [
  { value: "deal", label: "Deal", table: "deals", labelColumn: "title" },
  { value: "contact", label: "Contact", table: "contacts", labelColumn: "name" },
  { value: "project", label: "Project", table: "projects", labelColumn: "name" },
  { value: "ticket", label: "Support ticket", table: "customer_support_tickets", labelColumn: "title" },
  { value: "employee", label: "Employee", table: "profiles", labelColumn: "full_name" },
];

interface AutoFillResult {
  title: string;
  fields: Record<string, string>;
  notes: string;
  missing: string[];
  model: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: { id: string; name: string; template_type: string } | null;
}

export function TemplateAutoFillDialog({ open, onOpenChange, template }: Props) {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [sourceType, setSourceType] = useState<SourceType>("deal");
  const [sourceId, setSourceId] = useState<string>("");
  const [instructions, setInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AutoFillResult | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftFields, setDraftFields] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState("");

  const source = useMemo(() => SOURCES.find((s) => s.value === sourceType)!, [sourceType]);

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["autofill-source", source.table, currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from(source.table as any)
        .select(`id, ${source.labelColumn}`)
        .eq("tenant_id", currentTenant.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: open && !!currentTenant?.id,
    staleTime: 5 * 60 * 1000,
  });

  const reset = () => {
    setResult(null);
    setDraftFields({});
    setDraftTitle("");
    setReviewNotes("");
    setSourceId("");
    setInstructions("");
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const generate = async () => {
    if (!template || !currentTenant?.id || !sourceId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("template-autofill", {
        body: {
          tenant_id: currentTenant.id,
          template_id: template.id,
          source_type: sourceType,
          source_id: sourceId,
          instructions,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const payload = data as AutoFillResult;
      setResult(payload);
      setDraftTitle(payload.title);
      setDraftFields(payload.fields ?? {});
    } catch (error: any) {
      toast.error("Auto-fill failed: " + (error.message ?? "unknown error"));
    } finally {
      setGenerating(false);
    }
  };

  const save = async (status: "draft" | "final", exportFormat?: ExportFormat) => {
    if (!template || !currentTenant?.id || !result) return;
    setSaving(true);
    try {
      const { data: inserted, error } = await supabase
        .from("generated_documents")
        .insert({
          tenant_id: currentTenant.id,
          template_id: template.id,
          template_name: template.name,
          template_type: template.template_type,
          title: draftTitle || template.name,
          source_type: sourceType,
          source_id: sourceId,
          ai_fields: result.fields,
          final_fields: draftFields,
          ai_notes: result.notes || null,
          review_notes: reviewNotes || null,
          ai_model: result.model,
          status,
          created_by: user?.id ?? null,
          finalized_by: status === "final" ? user?.id ?? null : null,
          finalized_at: status === "final" ? new Date().toISOString() : null,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (exportFormat) {
        const { data: tpl } = await supabase
          .from("document_templates")
          .select("branding")
          .eq("id", template.id)
          .maybeSingle();
        const branding = await loadBranding(currentTenant.id, (tpl?.branding ?? null) as any);
        const res = await exportAndAttachDocument({
          tenantId: currentTenant.id,
          userId: user?.id ?? null,
          format: exportFormat,
          branding,
          doc: {
            id: inserted.id,
            title: draftTitle || template.name,
            templateName: template.name,
            templateType: template.template_type,
            fields: draftFields,
            sourceType,
            sourceId,
          },
        });
        toast.success(
          res.attachedTo
            ? `${exportFormat.toUpperCase()} generated and saved to the ${SOURCES.find((s) => s.value === sourceType)?.label.toLowerCase()} record`
            : `${exportFormat.toUpperCase()} generated`,
        );
      } else {
        toast.success(status === "final" ? "Document finalised" : "Draft saved for later review");
      }

      queryClient.invalidateQueries({ queryKey: ["generated-documents"] });
      close(false);
    } catch (error: any) {
      toast.error("Could not save document: " + (error?.message ?? "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI auto-fill
          </DialogTitle>
          <DialogDescription>
            {template?.name} — filled from your workspace CRM data. Review and edit every section before
            finalising.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fill from</Label>
                <Select
                  value={sourceType}
                  onValueChange={(v) => {
                    setSourceType(v as SourceType);
                    setSourceId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Record</Label>
                <Select value={sourceId} onValueChange={setSourceId} disabled={recordsLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={recordsLoading ? "Loading…" : `Select a ${source.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {records.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r[source.labelColumn] || "Untitled"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Extra instructions (optional)</Label>
              <Textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. emphasise the managed SOC scope and 3-year commercial option"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Only data from your workspace is used. Nothing is saved until you approve the draft.
            </p>

            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button onClick={generate} disabled={!sourceId || generating} className="gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate draft
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Badge variant="outline" className="w-fit">
              Review step · generated with {result.model}
            </Badge>

            {(result.missing?.length ?? 0) > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Confirm before sending</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 text-xs">
                    {result.missing.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="max-h-[45vh] pr-3">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Document title</Label>
                  <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
                </div>

                {Object.entries(draftFields).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
                    <Textarea
                      rows={5}
                      value={value}
                      onChange={(e) => setDraftFields((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))}

                {result.notes && (
                  <p className="text-xs text-muted-foreground">AI notes: {result.notes}</p>
                )}

                <div className="space-y-2">
                  <Label>Reviewer notes (optional)</Label>
                  <Textarea rows={2} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" className="gap-1" onClick={() => setResult(null)} disabled={saving}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => save("draft")} disabled={saving}>
                  Save as draft
                </Button>
                <Button onClick={() => save("final")} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve &amp; finalise
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default TemplateAutoFillDialog;
