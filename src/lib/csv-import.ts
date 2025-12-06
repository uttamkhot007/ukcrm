import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";

export interface ContactCSVRow {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  designation?: string;
  notes?: string;
}

export interface DealCSVRow {
  title: string;
  value?: string;
  stage?: string;
  probability?: string;
  expected_close_date?: string;
  description?: string;
  contact_name?: string;
  contact_email?: string;
}

export interface ImportResult {
  success: boolean;
  recordCount: number;
  errors: string[];
}

const VALID_DEAL_STAGES = ["pipeline", "upside", "strong_upside", "commit", "closed_won", "closed_lost"];

export async function parseCSVFile<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (results) => {
        resolve(results.data as T[]);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export async function importContacts(file: File, userId: string): Promise<ImportResult> {
  const errors: string[] = [];
  let successCount = 0;

  try {
    const rows = await parseCSVFile<ContactCSVRow>(file);

    if (rows.length === 0) {
      return { success: false, recordCount: 0, errors: ["No data found in CSV file"] };
    }

    const contactsToInsert = rows
      .filter((row, index) => {
        if (!row.name || row.name.trim() === "") {
          errors.push(`Row ${index + 2}: Missing required field 'name'`);
          return false;
        }
        return true;
      })
      .map((row) => ({
        name: row.name.trim(),
        email: row.email?.trim() || null,
        phone: row.phone?.trim() || null,
        company: row.company?.trim() || null,
        designation: row.designation?.trim() || null,
        notes: row.notes?.trim() || null,
        user_id: userId,
      }));

    if (contactsToInsert.length === 0) {
      return { success: false, recordCount: 0, errors };
    }

    // Insert in batches of 50
    const batchSize = 50;
    for (let i = 0; i < contactsToInsert.length; i += batchSize) {
      const batch = contactsToInsert.slice(i, i + batchSize);
      const { error } = await supabase.from("contacts").insert(batch);

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        successCount += batch.length;
      }
    }

    return {
      success: successCount > 0,
      recordCount: successCount,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      recordCount: 0,
      errors: [error instanceof Error ? error.message : "Failed to parse CSV file"],
    };
  }
}

export async function importDeals(file: File, userId: string): Promise<ImportResult> {
  const errors: string[] = [];
  let successCount = 0;

  try {
    const rows = await parseCSVFile<DealCSVRow>(file);

    if (rows.length === 0) {
      return { success: false, recordCount: 0, errors: ["No data found in CSV file"] };
    }

    // First, get existing contacts to match by email
    const { data: existingContacts } = await supabase
      .from("contacts")
      .select("id, email, name");

    const contactEmailMap = new Map<string, string>();
    const contactNameMap = new Map<string, string>();
    
    existingContacts?.forEach((contact) => {
      if (contact.email) {
        contactEmailMap.set(contact.email.toLowerCase(), contact.id);
      }
      if (contact.name) {
        contactNameMap.set(contact.name.toLowerCase(), contact.id);
      }
    });

    const dealsToInsert = rows
      .filter((row, index) => {
        if (!row.title || row.title.trim() === "") {
          errors.push(`Row ${index + 2}: Missing required field 'title'`);
          return false;
        }
        return true;
      })
      .map((row) => {
        // Try to find matching contact
        let contactId: string | null = null;
        if (row.contact_email) {
          contactId = contactEmailMap.get(row.contact_email.toLowerCase()) || null;
        }
        if (!contactId && row.contact_name) {
          contactId = contactNameMap.get(row.contact_name.toLowerCase()) || null;
        }

        // Validate and normalize stage
        let stage = "pipeline";
        if (row.stage) {
          const normalizedStage = row.stage.toLowerCase().replace(/\s+/g, "_");
          if (VALID_DEAL_STAGES.includes(normalizedStage)) {
            stage = normalizedStage;
          }
        }

        // Parse value
        const value = row.value ? parseFloat(row.value.replace(/[^0-9.-]/g, "")) || 0 : 0;

        // Parse probability
        const probability = row.probability ? parseInt(row.probability.replace(/[^0-9]/g, ""), 10) || 10 : 10;

        // Parse expected close date
        let expectedCloseDate: string | null = null;
        if (row.expected_close_date) {
          const date = new Date(row.expected_close_date);
          if (!isNaN(date.getTime())) {
            expectedCloseDate = date.toISOString().split("T")[0];
          }
        }

        return {
          title: row.title.trim(),
          value,
          stage: stage as "pipeline" | "upside" | "strong_upside" | "commit" | "closed_won" | "closed_lost",
          probability,
          expected_close_date: expectedCloseDate,
          description: row.description?.trim() || null,
          contact_id: contactId,
          user_id: userId,
        };
      });

    if (dealsToInsert.length === 0) {
      return { success: false, recordCount: 0, errors };
    }

    // Insert in batches of 50
    const batchSize = 50;
    for (let i = 0; i < dealsToInsert.length; i += batchSize) {
      const batch = dealsToInsert.slice(i, i + batchSize);
      const { error } = await supabase.from("deals").insert(batch);

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        successCount += batch.length;
      }
    }

    return {
      success: successCount > 0,
      recordCount: successCount,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      recordCount: 0,
      errors: [error instanceof Error ? error.message : "Failed to parse CSV file"],
    };
  }
}
