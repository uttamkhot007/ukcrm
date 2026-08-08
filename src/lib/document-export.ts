import { jsPDF } from "jspdf";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { supabase } from "@/integrations/api/client";

export type ExportFormat = "pdf" | "docx";

export interface Branding {
  companyName: string;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  primaryColor: string;
}

export interface ExportableDocument {
  id?: string;
  title: string;
  templateName?: string | null;
  templateType?: string | null;
  fields: Record<string, string>;
  sourceType?: string | null;
  sourceId?: string | null;
}

const DEFAULT_COLOR = "#1E3A8A";

const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(full || "1E3A8A", 16);
  if (Number.isNaN(int)) return [30, 58, 138];
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

const normaliseHex = (value?: string | null) => {
  if (!value) return DEFAULT_COLOR;
  const v = value.trim();
  return /^#?[0-9a-fA-F]{3,6}$/.test(v) ? (v.startsWith("#") ? v : `#${v}`) : DEFAULT_COLOR;
};

export const humanizeKey = (key: string) =>
  key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Load tenant branding from organization settings, falling back to the template's branding block. */
export async function loadBranding(
  tenantId: string,
  templateBranding?: Record<string, any> | null,
): Promise<Branding> {
  let settings: any = null;
  try {
    const { data } = await supabase
      .from("organization_settings")
      .select("name, logo_url, address, phone, email, website_url")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    settings = data;
  } catch {
    settings = null;
  }

  const b = templateBranding ?? {};
  return {
    companyName: settings?.name || b.company_name || b.companyName || "Company",
    logoUrl: settings?.logo_url || b.logo_url || b.logoUrl || null,
    address: settings?.address ?? b.address ?? null,
    phone: settings?.phone ?? b.phone ?? null,
    email: settings?.email ?? b.email ?? null,
    website: settings?.website_url ?? b.website ?? null,
    primaryColor: normaliseHex(b.primary_color ?? b.primaryColor),
  };
}

interface LoadedImage {
  dataUrl: string;
  bytes: Uint8Array;
  type: "png" | "jpg";
  width: number;
  height: number;
}

async function loadLogo(url?: string | null): Promise<LoadedImage | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 200, height: img.naturalHeight || 60 });
      img.onerror = () => resolve({ width: 200, height: 60 });
      img.src = dataUrl;
    });
    const type = blob.type.includes("jpeg") || blob.type.includes("jpg") ? "jpg" : "png";
    return { dataUrl, bytes, type, width: dims.width, height: dims.height };
  } catch {
    return null;
  }
}

/* ------------------------------- PDF ------------------------------- */

export async function buildPdf(doc: ExportableDocument, branding: Branding): Promise<Blob> {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  const [r, g, b] = hexToRgb(branding.primaryColor);
  const logo = await loadLogo(branding.logoUrl);

  const drawHeader = () => {
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, pageWidth, 6, "F");

    let textLeft = margin;
    if (logo) {
      const h = 34;
      const w = Math.min(140, (logo.width / Math.max(logo.height, 1)) * h);
      try {
        pdf.addImage(logo.dataUrl, logo.type.toUpperCase(), margin, 24, w, h);
        textLeft = margin + w + 14;
      } catch {
        /* ignore unsupported image */
      }
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(r, g, b);
    pdf.text(branding.companyName, textLeft, 42);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(110, 110, 110);
    const contact = [branding.address, branding.phone, branding.email, branding.website]
      .filter(Boolean)
      .join("  |  ");
    if (contact) pdf.text(pdf.splitTextToSize(contact, contentWidth - (textLeft - margin))[0], textLeft, 56);
  };

  const drawFooter = (page: number) => {
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, pageHeight - 44, pageWidth - margin, pageHeight - 44);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(130, 130, 130);
    pdf.text(`${branding.companyName} — ${doc.title}`, margin, pageHeight - 28);
    pdf.text(`Page ${page}`, pageWidth - margin, pageHeight - 28, { align: "right" });
  };

  let page = 1;
  drawHeader();
  drawFooter(page);

  let y = 100;
  pdf.setTextColor(20, 20, 20);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(pdf.splitTextToSize(doc.title, contentWidth), margin, y);
  y += 22;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  const meta = [doc.templateName, new Date().toLocaleDateString()].filter(Boolean).join("  •  ");
  pdf.text(meta, margin, y);
  y += 24;

  const newPage = () => {
    pdf.addPage();
    page += 1;
    drawHeader();
    drawFooter(page);
    y = 100;
  };

  Object.entries(doc.fields).forEach(([key, value]) => {
    if (!value) return;
    if (y > pageHeight - 120) newPage();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(r, g, b);
    pdf.text(humanizeKey(key), margin, y);
    y += 6;
    pdf.setDrawColor(r, g, b);
    pdf.line(margin, y, margin + 40, y);
    y += 14;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(35, 35, 35);
    const lines = pdf.splitTextToSize(String(value), contentWidth) as string[];
    lines.forEach((line) => {
      if (y > pageHeight - 70) newPage();
      pdf.text(line, margin, y);
      y += 14;
    });
    y += 12;
  });

  return pdf.output("blob");
}

/* ------------------------------- DOCX ------------------------------- */

export async function buildDocx(doc: ExportableDocument, branding: Branding): Promise<Blob> {
  const color = branding.primaryColor.replace("#", "").toUpperCase();
  const logo = await loadLogo(branding.logoUrl);

  const headerChildren: Paragraph[] = [];
  if (logo) {
    const h = 40;
    const w = Math.min(160, Math.round((logo.width / Math.max(logo.height, 1)) * h));
    headerChildren.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: logo.type === "jpg" ? "jpg" : "png",
            data: logo.bytes,
            transformation: { width: w, height: h },
            altText: { title: branding.companyName, description: `${branding.companyName} logo`, name: "logo" },
          }),
        ],
      }),
    );
  }
  headerChildren.push(
    new Paragraph({
      children: [new TextRun({ text: branding.companyName, bold: true, size: 24, color, font: "Arial" })],
    }),
  );
  const contact = [branding.address, branding.phone, branding.email, branding.website].filter(Boolean).join("  |  ");
  if (contact) {
    headerChildren.push(
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 2 } },
        children: [new TextRun({ text: contact, size: 16, color: "6B7280", font: "Arial" })],
      }),
    );
  }

  const body: Paragraph[] = [
    new Paragraph({
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: doc.title, bold: true, size: 36, font: "Arial" })],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: [doc.templateName, new Date().toLocaleDateString()].filter(Boolean).join("  •  "),
          size: 18,
          color: "6B7280",
          font: "Arial",
        }),
      ],
    }),
  ];

  Object.entries(doc.fields).forEach(([key, value]) => {
    if (!value) return;
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
        children: [new TextRun({ text: humanizeKey(key), bold: true, size: 26, color, font: "Arial" })],
      }),
    );
    String(value)
      .split(/\n+/)
      .filter((line) => line.trim().length > 0)
      .forEach((line) => {
        body.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: line.trim(), size: 22, font: "Arial" })],
          }),
        );
      });
  });

  const document = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: { default: new Header({ children: headerChildren }) },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `${branding.companyName} — ${doc.title}   Page `, size: 16, color: "9CA3AF" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "9CA3AF" }),
                ],
              }),
            ],
          }),
        },
        children: body,
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  return blob;
}

/* --------------------------- Export pipeline --------------------------- */

const slug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "document";

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ExportResult {
  fileName: string;
  filePath: string;
  signedUrl: string | null;
  attachedTo: string | null;
}

/** Attach a stored document to the CRM record it was generated from. */
async function attachToRecord(params: {
  tenantId: string;
  userId?: string | null;
  doc: ExportableDocument;
  fileName: string;
  signedUrl: string | null;
  filePath: string;
}): Promise<{ table: string; id: string } | null> {
  const { tenantId, userId, doc, fileName, signedUrl, filePath } = params;
  if (!doc.sourceType || !doc.sourceId) return null;
  const link = signedUrl ?? filePath;
  const summary = `Document generated: ${doc.title} (${fileName})`;

  switch (doc.sourceType) {
    case "deal": {
      const { data, error } = await supabase
        .from("deal_activities")
        .insert({
          deal_id: doc.sourceId,
          tenant_id: tenantId,
          user_id: userId ?? null,
          activity_type: "document",
          description: `${summary} — ${link}`,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { table: "deal_activities", id: data.id };
    }
    case "project": {
      const { data, error } = await supabase
        .from("project_documents")
        .insert({
          project_id: doc.sourceId,
          document_type: doc.templateType || "generated",
          title: doc.title,
          content: Object.entries(doc.fields)
            .map(([k, v]) => `${humanizeKey(k)}\n${v}`)
            .join("\n\n"),
          is_ai_generated: true,
          file_url: link,
          created_by: userId ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { table: "project_documents", id: data.id };
    }
    case "ticket": {
      const { data, error } = await supabase
        .from("customer_support_ticket_comments")
        .insert({
          ticket_id: doc.sourceId,
          user_id: userId ?? null,
          comment: `${summary}\n${link}`,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      return { table: "customer_support_ticket_comments", id: data.id };
    }
    case "contact":
    case "organization": {
      const { data, error } = await supabase
        .from("organization_notes")
        .insert({
          organization_id: doc.sourceId,
          tenant_id: tenantId,
          user_id: userId ?? null,
          note_type: "document",
          content: `${summary}\n${link}`,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { table: "organization_notes", id: data.id };
    }
    default:
      return null;
  }
}

/**
 * Renders a branded PDF/DOCX, stores it in the tenant's private bucket, records the file
 * on generated_documents and links it back to the originating CRM record or ticket.
 */
export async function exportAndAttachDocument(options: {
  tenantId: string;
  userId?: string | null;
  doc: ExportableDocument;
  format: ExportFormat;
  branding: Branding;
  download?: boolean;
}): Promise<ExportResult> {
  const { tenantId, userId, doc, format, branding, download = true } = options;

  const blob = format === "pdf" ? await buildPdf(doc, branding) : await buildDocx(doc, branding);
  const fileName = `${slug(doc.title)}-${Date.now()}.${format}`;
  const filePath = `${tenantId}/${doc.sourceType ?? "unlinked"}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("generated-documents")
    .upload(filePath, blob, {
      contentType:
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data: signed } = await supabase.storage
    .from("generated-documents")
    .createSignedUrl(filePath, 60 * 60 * 24 * 30);
  const signedUrl = signed?.signedUrl ?? null;

  const attached = await attachToRecord({ tenantId, userId, doc, fileName, signedUrl, filePath });

  if (doc.id) {
    await supabase
      .from("generated_documents")
      .update({
        file_path: filePath,
        file_url: signedUrl,
        file_format: format,
        file_name: fileName,
        exported_at: new Date().toISOString(),
        attached_record_table: attached?.table ?? null,
        attached_record_id: attached?.id ?? null,
      })
      .eq("id", doc.id)
      .eq("tenant_id", tenantId);
  }

  if (download) downloadBlob(blob, fileName);

  return { fileName, filePath, signedUrl, attachedTo: attached?.table ?? null };
}

/** Re-issue a fresh signed link for a previously exported document. */
export async function getDocumentSignedUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from("generated-documents")
    .createSignedUrl(filePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
