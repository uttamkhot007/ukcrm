/**
 * Template preview + lightweight editor.
 *
 * Lets a user inspect a library template as it will look once installed and
 * tweak its name, sections/variables, header/footer options and branding
 * colours before committing it to the tenant's template list.
 */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Download, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { LibraryTemplate } from "@/lib/template-library";

interface FieldRow {
  id: string;
  label: string;
  type: string;
}

interface SectionRow {
  id: string;
  title: string;
  required?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: LibraryTemplate | null;
  branding: {
    companyName?: string | null;
    logoUrl?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
  };
  installing?: boolean;
  canInstall?: boolean;
  onInstall: (template: LibraryTemplate) => void;
}

const slug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "field";

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  template,
  branding,
  installing = false,
  canInstall = true,
  onInstall,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [headerTitle, setHeaderTitle] = useState("");
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [colors, setColors] = useState({ primaryColor: "", secondaryColor: "", accentColor: "" });
  const [showLogo, setShowLogo] = useState(true);
  const [showCompanyInfo, setShowCompanyInfo] = useState(true);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [showConfidential, setShowConfidential] = useState(true);
  const [newField, setNewField] = useState("");

  const reset = () => {
    if (!template) return;
    const content = (template.content ?? {}) as Record<string, any>;
    setName(template.name);
    setDescription(template.description);
    setHeaderTitle(String((template.header_content as any)?.title ?? template.name));
    setFields(Array.isArray(content.fields) ? (content.fields as FieldRow[]).map((f) => ({ ...f })) : []);
    setSections(
      Array.isArray(content.sections) ? (content.sections as SectionRow[]).map((s) => ({ ...s })) : [],
    );
    setColors({
      primaryColor: template.branding?.primaryColor ?? "#2563eb",
      secondaryColor: template.branding?.secondaryColor ?? "#1e40af",
      accentColor: template.branding?.accentColor ?? "#60a5fa",
    });
    setShowLogo((template.header_content as any)?.showLogo !== false);
    setShowCompanyInfo((template.header_content as any)?.showCompanyInfo !== false);
    setShowPageNumbers((template.footer_content as any)?.showPageNumbers !== false);
    setShowConfidential((template.footer_content as any)?.showConfidential !== false);
    setNewField("");
  };

  useEffect(reset, [template?.key, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const customised: LibraryTemplate | null = useMemo(() => {
    if (!template) return null;
    return {
      ...template,
      name: name.trim() || template.name,
      description: description.trim() || template.description,
      content: {
        ...(template.content as Record<string, unknown>),
        ...(fields.length > 0 ? { fields } : {}),
        ...(sections.length > 0 ? { sections } : {}),
      },
      header_content: {
        ...(template.header_content as Record<string, unknown>),
        title: headerTitle.trim() || template.name,
        showLogo,
        showCompanyInfo,
      },
      footer_content: {
        ...(template.footer_content as Record<string, unknown>),
        showPageNumbers,
        showConfidential,
      },
      branding: { ...template.branding, ...colors },
    };
  }, [
    template, name, description, fields, sections, headerTitle,
    showLogo, showCompanyInfo, showPageNumbers, showConfidential, colors,
  ]);

  if (!template) return null;

  const addField = () => {
    const label = newField.trim();
    if (!label) return;
    setFields((prev) => [...prev, { id: slug(label), label, type: "text" }]);
    setNewField("");
  };

  const previewRows = fields.length > 0
    ? fields.map((f) => ({ key: f.id, label: f.label, hint: f.type }))
    : sections.map((s) => ({ key: s.id, label: s.title, hint: s.required ? "required" : "optional" }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Preview &amp; edit template</DialogTitle>
          <DialogDescription>
            Tweak the content, variables and colours — changes apply only to your installed copy.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* ------------------------------------------------ live preview */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
            <ScrollArea className="h-[420px] pr-3">
              <div className="rounded-md border bg-background shadow-sm">
                <div
                  className="rounded-t-md px-4 py-3 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primaryColor}, ${colors.secondaryColor})`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {showLogo && branding.logoUrl ? (
                      <img
                        src={branding.logoUrl}
                        alt={`${branding.companyName ?? "Company"} logo`}
                        className="h-8 w-8 rounded bg-white/90 object-contain p-0.5"
                      />
                    ) : showLogo ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-white/20 text-[10px]">
                        LOGO
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold uppercase tracking-wide">
                        {headerTitle || template.name}
                      </p>
                      {showCompanyInfo && (
                        <p className="truncate text-[11px] opacity-90">
                          {branding.companyName ?? "Your company"}
                          {branding.website ? ` · ${branding.website}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <p className="text-sm font-semibold">{name || template.name}</p>
                    <p className="text-xs text-muted-foreground">{description || template.description}</p>
                  </div>
                  <Separator />
                  {previewRows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">This template has no editable variables.</p>
                  ) : (
                    <div className="space-y-2">
                      {previewRows.map((row, i) => (
                        <div key={`${row.key}-${i}`} className="rounded border p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium">{row.label}</span>
                            <Badge variant="outline" className="text-[10px]">{row.hint}</Badge>
                          </div>
                          <div
                            className="mt-1 h-2 w-full rounded"
                            style={{ backgroundColor: `${colors.accentColor}33` }}
                          />
                          <div
                            className="mt-1 h-2 w-2/3 rounded"
                            style={{ backgroundColor: `${colors.accentColor}22` }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t px-4 py-2 text-[10px] text-muted-foreground">
                  <span>{showConfidential ? "Confidential" : ""}</span>
                  <span>{showPageNumbers ? "Page 1 of 1" : ""}</span>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* ------------------------------------------------------ editor */}
          <div>
            <Tabs defaultValue="content">
              <TabsList className="mb-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
                <TabsTrigger value="branding">Branding</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[420px] pr-3">
                <TabsContent value="content" className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Template name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Document header title</Label>
                    <Input value={headerTitle} onChange={(e) => setHeaderTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2 rounded-md border p-3">
                    {[
                      ["Show logo", showLogo, setShowLogo],
                      ["Show company info", showCompanyInfo, setShowCompanyInfo],
                      ["Show page numbers", showPageNumbers, setShowPageNumbers],
                      ["Confidential footer", showConfidential, setShowConfidential],
                    ].map(([label, value, setter]: any) => (
                      <div key={label} className="flex items-center justify-between">
                        <Label className="text-xs font-normal">{label}</Label>
                        <Switch checked={value} onCheckedChange={setter} />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="variables" className="space-y-3">
                  {fields.length === 0 && sections.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No variables defined — add one below to capture data in this document.
                    </p>
                  )}

                  {fields.map((field, index) => (
                    <div key={`${field.id}-${index}`} className="flex items-center gap-2">
                      <Input
                        value={field.label}
                        onChange={(e) =>
                          setFields((prev) =>
                            prev.map((f, i) =>
                              i === index ? { ...f, label: e.target.value, id: slug(e.target.value) } : f,
                            ),
                          )
                        }
                      />
                      <Input
                        className="w-32"
                        value={field.type}
                        onChange={(e) =>
                          setFields((prev) => prev.map((f, i) => (i === index ? { ...f, type: e.target.value } : f)))
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  {sections.map((section, index) => (
                    <div key={`${section.id}-${index}`} className="flex items-center gap-2">
                      <Input
                        value={section.title}
                        onChange={(e) =>
                          setSections((prev) =>
                            prev.map((s, i) =>
                              i === index ? { ...s, title: e.target.value, id: slug(e.target.value) } : s,
                            ),
                          )
                        }
                      />
                      <div className="flex w-32 items-center gap-2">
                        <Switch
                          checked={!!section.required}
                          onCheckedChange={(checked) =>
                            setSections((prev) =>
                              prev.map((s, i) => (i === index ? { ...s, required: checked } : s)),
                            )
                          }
                        />
                        <span className="text-[11px] text-muted-foreground">Required</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSections((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      placeholder="Add a variable or section"
                      value={newField}
                      onChange={(e) => setNewField(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (sections.length > 0 && fields.length === 0) {
                            const title = newField.trim();
                            if (title) {
                              setSections((prev) => [...prev, { id: slug(title), title, required: false }]);
                              setNewField("");
                            }
                          } else {
                            addField();
                          }
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        if (sections.length > 0 && fields.length === 0) {
                          const title = newField.trim();
                          if (!title) return;
                          setSections((prev) => [...prev, { id: slug(title), title, required: false }]);
                          setNewField("");
                        } else {
                          addField();
                        }
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="branding" className="space-y-3">
                  {([
                    ["Primary colour", "primaryColor"],
                    ["Secondary colour", "secondaryColor"],
                    ["Accent colour", "accentColor"],
                  ] as const).map(([label, key]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label={label}
                          className="h-9 w-12 cursor-pointer rounded border bg-background"
                          value={colors[key] || "#000000"}
                          onChange={(e) => setColors((prev) => ({ ...prev, [key]: e.target.value }))}
                        />
                        <Input
                          value={colors[key]}
                          onChange={(e) => setColors((prev) => ({ ...prev, [key]: e.target.value }))}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Company name, logo and contact details are merged from your workspace branding at install time.
                  </p>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" className="gap-1" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Reset changes
          </Button>
          <Button
            className="gap-1"
            disabled={installing || !canInstall || !customised}
            onClick={() => customised && onInstall(customised)}
          >
            {installing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : canInstall ? (
              <Download className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {canInstall ? "Install with changes" : "No install access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TemplatePreviewDialog;
