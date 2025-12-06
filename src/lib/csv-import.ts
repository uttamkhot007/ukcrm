import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { parseFile } from "./file-parser";

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

export interface EmployeeCSVRow {
  full_name: string;
  email: string;
  employee_code?: string;
  department?: string;
  job_title?: string;
  location?: string;
  birth_date?: string;
  hire_date?: string;
}

export interface ImportResult {
  success: boolean;
  recordCount: number;
  errors: string[];
}

export interface ParsedPreviewRow {
  data: Record<string, string>;
  isValid: boolean;
  errors: string[];
  isDuplicate?: boolean;
  duplicateInfo?: string;
}

export interface ParsePreviewResult {
  rows: ParsedPreviewRow[];
  columns: string[];
  requiredColumns: string[];
}

const VALID_DEAL_STAGES = ["pipeline", "upside", "strong_upside", "commit", "closed_won", "closed_lost"];

export async function parseContactsPreview(file: File): Promise<ParsePreviewResult> {
  const rawRows = await parseFile<ContactCSVRow>(file);
  const requiredColumns = ["name"];
  const columns = ["name", "email", "phone", "company", "designation", "notes"];

  // Fetch existing contacts for duplicate detection
  const { data: existingContacts } = await supabase
    .from("contacts")
    .select("id, email, name, phone");

  const existingEmailSet = new Set<string>();
  const existingNameSet = new Set<string>();
  
  existingContacts?.forEach((contact) => {
    if (contact.email) existingEmailSet.add(contact.email.toLowerCase());
    if (contact.name) existingNameSet.add(contact.name.toLowerCase());
  });

  const rows: ParsedPreviewRow[] = rawRows.map((row) => {
    const errors: string[] = [];
    let isDuplicate = false;
    let duplicateInfo = "";
    
    if (!row.name || row.name.trim() === "") {
      errors.push("Missing required field 'name'");
    }

    // Check for duplicates
    if (row.email && existingEmailSet.has(row.email.toLowerCase())) {
      isDuplicate = true;
      duplicateInfo = `Email "${row.email}" already exists`;
    } else if (row.name && existingNameSet.has(row.name.toLowerCase())) {
      isDuplicate = true;
      duplicateInfo = `Contact "${row.name}" already exists`;
    }

    return {
      data: {
        name: row.name || "",
        email: row.email || "",
        phone: row.phone || "",
        company: row.company || "",
        designation: row.designation || "",
        notes: row.notes || "",
      },
      isValid: errors.length === 0,
      errors,
      isDuplicate,
      duplicateInfo,
    };
  });

  return { rows, columns, requiredColumns };
}

export async function parseDealsPreview(file: File): Promise<ParsePreviewResult> {
  const rawRows = await parseFile<DealCSVRow>(file);
  const requiredColumns = ["title"];
  const columns = ["title", "value", "stage", "probability", "expected_close_date", "description", "contact_name", "contact_email"];

  // Fetch existing deals for duplicate detection
  const { data: existingDeals } = await supabase
    .from("deals")
    .select("id, title, value");

  const existingDealTitles = new Set<string>();
  existingDeals?.forEach((deal) => {
    if (deal.title) existingDealTitles.add(deal.title.toLowerCase());
  });

  const rows: ParsedPreviewRow[] = rawRows.map((row) => {
    const errors: string[] = [];
    let isDuplicate = false;
    let duplicateInfo = "";
    
    if (!row.title || row.title.trim() === "") {
      errors.push("Missing required field 'title'");
    }

    // Check for duplicates
    if (row.title && existingDealTitles.has(row.title.toLowerCase())) {
      isDuplicate = true;
      duplicateInfo = `Deal "${row.title}" already exists`;
    }

    // Validate stage if provided
    if (row.stage) {
      const normalizedStage = row.stage.toLowerCase().replace(/\s+/g, "_");
      if (!VALID_DEAL_STAGES.includes(normalizedStage)) {
        errors.push(`Invalid stage '${row.stage}'. Valid: ${VALID_DEAL_STAGES.join(", ")}`);
      }
    }

    // Validate date if provided
    if (row.expected_close_date) {
      const date = new Date(row.expected_close_date);
      if (isNaN(date.getTime())) {
        errors.push(`Invalid date format '${row.expected_close_date}'`);
      }
    }

    return {
      data: {
        title: row.title || "",
        value: row.value || "",
        stage: row.stage || "",
        probability: row.probability || "",
        expected_close_date: row.expected_close_date || "",
        description: row.description || "",
        contact_name: row.contact_name || "",
        contact_email: row.contact_email || "",
      },
      isValid: errors.length === 0,
      errors,
      isDuplicate,
      duplicateInfo,
    };
  });

  return { rows, columns, requiredColumns };
}

export async function parseEmployeesPreview(file: File): Promise<ParsePreviewResult> {
  const rawRows = await parseFile<EmployeeCSVRow>(file);
  const requiredColumns = ["full_name", "email"];
  const columns = ["full_name", "email", "employee_code", "department", "job_title", "location", "birth_date", "hire_date"];

  // Fetch existing profiles for duplicate detection
  const { data: existingProfiles } = await supabase
    .from("profiles")
    .select("id, email, full_name");

  const existingEmailSet = new Set<string>();
  existingProfiles?.forEach((profile) => {
    if (profile.email) existingEmailSet.add(profile.email.toLowerCase());
  });

  const rows: ParsedPreviewRow[] = rawRows.map((row) => {
    const errors: string[] = [];
    let isDuplicate = false;
    let duplicateInfo = "";

    if (!row.full_name || row.full_name.trim() === "") {
      errors.push("Missing required field 'full_name'");
    }

    if (!row.email || row.email.trim() === "") {
      errors.push("Missing required field 'email'");
    } else {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email.trim())) {
        errors.push("Invalid email format");
      }
    }

    // Check for duplicates
    if (row.email && existingEmailSet.has(row.email.toLowerCase())) {
      isDuplicate = true;
      duplicateInfo = `Employee with email "${row.email}" already exists`;
    }

    // Validate date formats
    if (row.birth_date) {
      const date = new Date(row.birth_date);
      if (isNaN(date.getTime())) {
        errors.push(`Invalid birth date format '${row.birth_date}'`);
      }
    }

    if (row.hire_date) {
      const date = new Date(row.hire_date);
      if (isNaN(date.getTime())) {
        errors.push(`Invalid hire date format '${row.hire_date}'`);
      }
    }

    return {
      data: {
        full_name: row.full_name || "",
        email: row.email || "",
        employee_code: row.employee_code || "",
        department: row.department || "",
        job_title: row.job_title || "",
        location: row.location || "",
        birth_date: row.birth_date || "",
        hire_date: row.hire_date || "",
      },
      isValid: errors.length === 0,
      errors,
      isDuplicate,
      duplicateInfo,
    };
  });

  return { rows, columns, requiredColumns };
}

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

// Import from preview data (edited rows)
export async function importContactsFromPreview(
  rows: ParsedPreviewRow[],
  userId: string
): Promise<ImportResult> {
  const errors: string[] = [];
  let successCount = 0;

  const validRows = rows.filter(r => r.isValid);
  
  if (validRows.length === 0) {
    return { success: false, recordCount: 0, errors: ["No valid rows to import"] };
  }

  const contactsToInsert = validRows.map((row) => ({
    name: row.data.name.trim(),
    email: row.data.email?.trim() || null,
    phone: row.data.phone?.trim() || null,
    company: row.data.company?.trim() || null,
    designation: row.data.designation?.trim() || null,
    notes: row.data.notes?.trim() || null,
    user_id: userId,
  }));

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
}

export async function importEmployeesFromPreview(
  rows: ParsedPreviewRow[]
): Promise<ImportResult> {
  const errors: string[] = [];
  let successCount = 0;

  const validRows = rows.filter(r => r.isValid && !r.isDuplicate);

  if (validRows.length === 0) {
    return { success: false, recordCount: 0, errors: ["No valid rows to import"] };
  }

  // For each employee, we need to:
  // 1. Create an auth user (or skip if exists)
  // 2. Update their profile with the additional data

  for (const row of validRows) {
    try {
      // Check if user already exists in profiles by email
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("email", row.data.email.toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const updateData: Record<string, any> = {
          full_name: row.data.full_name.trim(),
          department: row.data.department?.trim() || null,
          job_title: row.data.job_title?.trim() || null,
        };

        if (row.data.birth_date) {
          const date = new Date(row.data.birth_date);
          if (!isNaN(date.getTime())) {
            updateData.birth_date = date.toISOString().split("T")[0];
          }
        }

        if (row.data.hire_date) {
          const date = new Date(row.data.hire_date);
          if (!isNaN(date.getTime())) {
            updateData.hire_date = date.toISOString().split("T")[0];
          }
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", existingProfile.id);

        if (updateError) {
          errors.push(`Failed to update ${row.data.email}: ${updateError.message}`);
        } else {
          successCount++;
        }
      } else {
        // Profile doesn't exist - user needs to be created through auth signup first
        // We can only update existing profiles, not create new auth users from here
        errors.push(`No user account exists for ${row.data.email}. User must sign up first.`);
      }
    } catch (error) {
      errors.push(`Error processing ${row.data.email}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return {
    success: successCount > 0,
    recordCount: successCount,
    errors,
  };
}

export async function importDealsFromPreview(
  rows: ParsedPreviewRow[],
  userId: string
): Promise<ImportResult> {
  const errors: string[] = [];
  let successCount = 0;

  const validRows = rows.filter(r => r.isValid);
  
  if (validRows.length === 0) {
    return { success: false, recordCount: 0, errors: ["No valid rows to import"] };
  }

  // Get existing contacts to match by email
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

  const dealsToInsert = validRows.map((row) => {
    // Try to find matching contact
    let contactId: string | null = null;
    if (row.data.contact_email) {
      contactId = contactEmailMap.get(row.data.contact_email.toLowerCase()) || null;
    }
    if (!contactId && row.data.contact_name) {
      contactId = contactNameMap.get(row.data.contact_name.toLowerCase()) || null;
    }

    // Validate and normalize stage
    let stage = "pipeline";
    if (row.data.stage) {
      const normalizedStage = row.data.stage.toLowerCase().replace(/\s+/g, "_");
      if (VALID_DEAL_STAGES.includes(normalizedStage)) {
        stage = normalizedStage;
      }
    }

    // Parse value
    const value = row.data.value ? parseFloat(row.data.value.replace(/[^0-9.-]/g, "")) || 0 : 0;

    // Parse probability
    const probability = row.data.probability ? parseInt(row.data.probability.replace(/[^0-9]/g, ""), 10) || 10 : 10;

    // Parse expected close date
    let expectedCloseDate: string | null = null;
    if (row.data.expected_close_date) {
      const date = new Date(row.data.expected_close_date);
      if (!isNaN(date.getTime())) {
        expectedCloseDate = date.toISOString().split("T")[0];
      }
    }

    return {
      title: row.data.title.trim(),
      value,
      stage: stage as "pipeline" | "upside" | "strong_upside" | "commit" | "closed_won" | "closed_lost",
      probability,
      expected_close_date: expectedCloseDate,
      description: row.data.description?.trim() || null,
      contact_id: contactId,
      user_id: userId,
    };
  });

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
}
