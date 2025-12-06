import * as XLSX from 'xlsx';

export interface ParsedRow {
  [key: string]: string;
}

export type SupportedFileType = 'csv' | 'xlsx' | 'xls' | 'docx' | 'pdf';

export function getFileType(file: File): SupportedFileType | null {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'csv':
      return 'csv';
    case 'xlsx':
    case 'xls':
      return extension as SupportedFileType;
    case 'docx':
    case 'doc':
      return 'docx';
    case 'pdf':
      return 'pdf';
    default:
      return null;
  }
}

export function getSupportedFileExtensions(): string {
  return '.csv,.xlsx,.xls,.docx,.doc,.pdf';
}

export function getFileTypeLabel(type: SupportedFileType): string {
  switch (type) {
    case 'csv':
      return 'CSV';
    case 'xlsx':
    case 'xls':
      return 'Excel';
    case 'docx':
      return 'Word';
    case 'pdf':
      return 'PDF';
    default:
      return 'Unknown';
  }
}

export async function parseExcelFile<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { 
          defval: '',
          raw: false 
        });
        
        // Normalize headers to lowercase with underscores
        const normalizedData = jsonData.map(row => {
          const normalizedRow: Record<string, string> = {};
          Object.entries(row).forEach(([key, value]) => {
            const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
            normalizedRow[normalizedKey] = String(value ?? '');
          });
          return normalizedRow as T;
        });
        
        resolve(normalizedData);
      } catch (error) {
        reject(new Error('Failed to parse Excel file: ' + (error instanceof Error ? error.message : 'Unknown error')));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export async function parseWordFile(file: File): Promise<string[][]> {
  // Word files are complex, we'll extract text and try to parse as table-like data
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        // For .docx files, we need to extract the XML content
        // Using JSZip to extract document.xml
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        const documentXml = await zip.file('word/document.xml')?.async('text');
        if (!documentXml) {
          throw new Error('Could not read Word document content');
        }
        
        // Parse XML and extract text from tables or paragraphs
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
        
        // Try to find tables first
        const tables = xmlDoc.getElementsByTagName('w:tbl');
        if (tables.length > 0) {
          const rows: string[][] = [];
          const table = tables[0];
          const tableRows = table.getElementsByTagName('w:tr');
          
          for (let i = 0; i < tableRows.length; i++) {
            const cells = tableRows[i].getElementsByTagName('w:tc');
            const rowData: string[] = [];
            
            for (let j = 0; j < cells.length; j++) {
              const textNodes = cells[j].getElementsByTagName('w:t');
              let cellText = '';
              for (let k = 0; k < textNodes.length; k++) {
                cellText += textNodes[k].textContent || '';
              }
              rowData.push(cellText.trim());
            }
            
            rows.push(rowData);
          }
          
          resolve(rows);
        } else {
          // Fall back to paragraphs, treat each line as a row with tab/comma separation
          const paragraphs = xmlDoc.getElementsByTagName('w:p');
          const rows: string[][] = [];
          
          for (let i = 0; i < paragraphs.length; i++) {
            const textNodes = paragraphs[i].getElementsByTagName('w:t');
            let lineText = '';
            for (let j = 0; j < textNodes.length; j++) {
              lineText += textNodes[j].textContent || '';
            }
            
            if (lineText.trim()) {
              // Split by tab or comma
              const cells = lineText.includes('\t') 
                ? lineText.split('\t') 
                : lineText.split(',');
              rows.push(cells.map(c => c.trim()));
            }
          }
          
          resolve(rows);
        }
      } catch (error) {
        reject(new Error('Failed to parse Word file: ' + (error instanceof Error ? error.message : 'Unknown error')));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read Word file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export async function parsePDFFile(file: File): Promise<string[][]> {
  // Use pdf.js to extract text from PDF
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        const rows: string[][] = [];
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Group text items by their y-position to form rows
          const lines: Map<number, string[]> = new Map();
          
          textContent.items.forEach((item: any) => {
            if ('str' in item && item.str.trim()) {
              const y = Math.round(item.transform[5]);
              if (!lines.has(y)) {
                lines.set(y, []);
              }
              lines.get(y)!.push(item.str.trim());
            }
          });
          
          // Sort by y-position (top to bottom) and add to rows
          const sortedY = Array.from(lines.keys()).sort((a, b) => b - a);
          sortedY.forEach(y => {
            const lineItems = lines.get(y)!;
            if (lineItems.length > 0) {
              rows.push(lineItems);
            }
          });
        }
        
        resolve(rows);
      } catch (error) {
        reject(new Error('Failed to parse PDF file: ' + (error instanceof Error ? error.message : 'Unknown error')));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read PDF file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export function convertRowsToObjects<T>(rows: string[][], hasHeader: boolean = true): T[] {
  if (rows.length === 0) return [];
  
  let headers: string[];
  let dataRows: string[][];
  
  if (hasHeader) {
    headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    dataRows = rows.slice(1);
  } else {
    // Generate generic headers
    headers = rows[0].map((_, i) => `column_${i + 1}`);
    dataRows = rows;
  }
  
  return dataRows
    .filter(row => row.some(cell => cell.trim() !== ''))
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => {
        obj[header] = row[i]?.trim() || '';
      });
      return obj as T;
    });
}

export async function parseFile<T>(file: File): Promise<T[]> {
  const fileType = getFileType(file);
  
  if (!fileType) {
    throw new Error(`Unsupported file type: ${file.name.split('.').pop()}`);
  }
  
  switch (fileType) {
    case 'csv': {
      // Use the existing CSV parser
      const Papa = (await import('papaparse')).default;
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
          complete: (results) => {
            resolve(results.data as T[]);
          },
          error: (error) => {
            reject(error);
          },
        });
      });
    }
    
    case 'xlsx':
    case 'xls':
      return parseExcelFile<T>(file);
    
    case 'docx': {
      const rows = await parseWordFile(file);
      return convertRowsToObjects<T>(rows);
    }
    
    case 'pdf': {
      const rows = await parsePDFFile(file);
      return convertRowsToObjects<T>(rows);
    }
    
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
