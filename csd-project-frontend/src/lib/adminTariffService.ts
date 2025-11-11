/**
 * Admin Tariff Service
 * Handles admin operations for tariff management
 * 
 * Authentication: Using Firebase JWT tokens
 */

import { getIdToken } from './auth'

export interface TariffCreateRequest {
  hsCode: string;
  importerId: string;      // Country code e.g., "SG"
  exporterId: string;      // Country code e.g., "MY"
  tariffType: 'Ad Valorem' | 'Specific' | 'Compound';
  tariffRate: number | null;
  specificAmt: number | null;
  specificUnit: string | null;
  minTariffAmt: number | null;
  maxTariffAmt: number | null;
  startDate: string;       // ISO date format "YYYY-MM-DD"
  endDate: string;         // ISO date format "YYYY-MM-DD"
}

export interface TariffResponse {
  id: number;
  hsCode: string;
  importerId: string;       // Country code like "SG", "CN"
  exporterId: string;       // Country code like "MY", "US"
  tariffType: string;       // "Ad Valorem", "Specific", "Compound"
  tariffRate: number | null;
  specificAmt: number | null;
  specificUnit: string | null;
  minTariffAmt: number | null;
  maxTariffAmt: number | null;
  startDate: string;
  endDate: string;
}

export interface CsvUploadError {
  row: number;
  error: string;
  data: string;
}

export interface CsvUploadResult {
  successful: number;
  updated: number;
  skipped: number;
  failed: number;
  errors?: CsvUploadError[];
}

class AdminTariffService {
  private static instance: AdminTariffService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = import.meta.env.VITE_TARIFF_API_URL || 'http://localhost:5004';
  }

  public static getInstance(): AdminTariffService {
    if (!AdminTariffService.instance) {
      AdminTariffService.instance = new AdminTariffService();
    }
    return AdminTariffService.instance;
  }

  /**
   * Get authentication header using Firebase JWT token
   * Automatically refreshes token if needed
   */
  private async getAuthHeader(): Promise<HeadersInit> {
    try {
      // Force refresh token to ensure it's valid (Firebase caches for 5 minutes)
      const token = await getIdToken()
      if (token) {
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    } catch (error) {
      console.error('Failed to get Firebase JWT token:', error)
      throw new Error('Authentication failed: Unable to get JWT token. Please log in again.')
    }
    
    throw new Error('Authentication failed: No user logged in. Please log in first.')
  }

  /**
   * Create a new tariff record
   */
  async createTariff(tariff: TariffCreateRequest): Promise<TariffResponse> {
    try {
      const headers = await this.getAuthHeader()
      const response = await fetch(`${this.baseUrl}/tariffs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(tariff),
      });

      if (!response.ok) {
        // Try to parse error response as JSON first
        let errorMessage = `Failed to create tariff: ${response.status}`;
        try {
          const errorBody = await response.json();
          if (errorBody.message) {
            errorMessage = errorBody.message;
          }
        } catch {
          // If JSON parsing fails, try as text
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating tariff:', error);
      throw error;
    }
  }

  /**
   * Get all tariffs
   */
  async getAllTariffs(): Promise<TariffResponse[]> {
    try {
      const headers = await this.getAuthHeader()
      const response = await fetch(`${this.baseUrl}/tariffs/all`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tariffs: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching tariffs:', error);
      throw error;
    }
  }

  /**
   * Update an existing tariff record
   */
  async updateTariff(id: number, tariff: TariffCreateRequest): Promise<TariffResponse> {
    try {
      const headers = await this.getAuthHeader()
      const response = await fetch(`${this.baseUrl}/tariffs/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(tariff),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update tariff: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating tariff:', error);
      throw error;
    }
  }

  /**
   * Bulk upload tariffs from CSV file (Frontend-only implementation)
   * Uses existing create API with robust error handling, retry logic, and duplicate detection
   * 
   * @param file CSV file with columns: hsCode, importerId, exporterId, tariffType, tariffRate, specificAmt, specificUnit, startDate, endDate
   * @param onProgress Optional callback for progress updates (current, total)
   * @returns Upload result with counts of successful, updated, and failed entries
   */
  async bulkUploadTariffs(
    file: File, 
    onProgress?: (current: number, total: number) => void
  ): Promise<CsvUploadResult> {
    try {
      // Step 1: Parse CSV
      const rows = await this.parseCsvFile(file);
      
      // Security: Limit maximum number of rows to prevent DoS
      const MAX_ROWS = 1000;
      if (rows.length > MAX_ROWS) {
        return {
          successful: 0,
          updated: 0,
          skipped: 0,
          failed: rows.length,
          errors: [{
            row: 0,
            error: `Security: Maximum ${MAX_ROWS} rows allowed. File contains ${rows.length} rows.`,
            data: 'File rejected'
          }]
        };
      }
      
      // Step 2: Validate all rows before starting
      const validationErrors = this.validateCsvRows(rows);
      if (validationErrors.length > 0) {
        return {
          successful: 0,
          updated: 0,
          skipped: 0,
          failed: validationErrors.length,
          errors: validationErrors,
        };
      }
      
      // Step 3: Fetch existing tariffs to detect duplicates
      const existingTariffs = await this.getAllTariffs();
      const existingMap = this.buildTariffMap(existingTariffs);
      
      // Step 4: Process rows with concurrency control
      const results = await this.processRowsWithConcurrency(
        rows, 
        existingMap, 
        onProgress
      );
      
      return results;
    } catch (error) {
      console.error('Error during bulk upload:', error);
      throw error;
    }
  }

  /**
   * Parse CSV file into array of tariff objects
   */
  private async parseCsvFile(file: File): Promise<TariffCreateRequest[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            throw new Error('CSV file is empty or has no data rows');
          }
          
          // Parse header
          const headers = lines[0].split(',').map(h => h.trim());
          
          // Parse data rows
          const tariffs: TariffCreateRequest[] = [];
          for (let i = 1; i < lines.length; i++) {
            const values = this.parseCsvLine(lines[i]);
            const tariff = this.csvRowToTariff(headers, values);
            if (tariff) tariffs.push(tariff);
          }
          
          resolve(tariffs);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Parse CSV line handling quoted fields with commas
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  }

  /**
   * Sanitize string input to prevent injection attacks
   */
  private sanitizeInput(input: string): string {
    if (!input) return '';
    // Remove null bytes, control characters, and trim
    return input.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  }

  /**
   * Convert CSV row to TariffCreateRequest
   */
  private csvRowToTariff(
    headers: string[], 
    values: string[]
  ): TariffCreateRequest | null {
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      // Security: Sanitize input values
      obj[header] = this.sanitizeInput(values[idx] || '');
    });
    
    // Security: Validate and sanitize HS code (alphanumeric only)
    const hsCode = obj.hsCode?.replace(/[^0-9A-Za-z.]/g, '') || '';
    
    // Security: Validate country codes (2-char alpha only)
    const importerId = obj.importerId?.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || '';
    const exporterId = obj.exporterId?.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || '';
    
    // Security: Validate tariff type (whitelist only)
    const validTypes = ['Ad Valorem', 'Specific', 'Compound'];
    const tariffType = validTypes.includes(obj.tariffType) ? obj.tariffType as 'Ad Valorem' | 'Specific' | 'Compound' : 'Ad Valorem';
    
    // Security: Sanitize unit (alphanumeric, /, - only)
    const specificUnit = obj.specificUnit?.replace(/[^A-Za-z0-9\/-]/g, '') || null;
    
    return {
      hsCode,
      importerId,
      exporterId,
      tariffType,
      tariffRate: obj.tariffRate ? parseFloat(obj.tariffRate) : null,
      specificAmt: obj.specificAmt ? parseFloat(obj.specificAmt) : null,
      specificUnit,
      minTariffAmt: obj.minTariffAmt ? parseFloat(obj.minTariffAmt) : null,
      maxTariffAmt: obj.maxTariffAmt ? parseFloat(obj.maxTariffAmt) : null,
      startDate: obj.startDate || obj.effectiveDate || '',
      endDate: obj.endDate || obj.expiryDate || '',
    };
  }

  /**
   * Validate all CSV rows before processing
   */
  private validateCsvRows(rows: TariffCreateRequest[]): CsvUploadError[] {
    const errors: CsvUploadError[] = [];
    
    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // +2 for header and 0-index
      const rowErrors: string[] = [];
      
      // Required fields
      if (!row.hsCode) rowErrors.push('hsCode is required');
      if (!row.importerId) rowErrors.push('importerId is required');
      if (!row.exporterId) rowErrors.push('exporterId is required');
      if (!row.tariffType) rowErrors.push('tariffType is required');
      if (!row.startDate) rowErrors.push('startDate is required');
      if (!row.endDate) rowErrors.push('endDate is required');
      
      // Tariff type validation
      if (row.tariffType && !['Ad Valorem', 'Specific', 'Compound'].includes(row.tariffType)) {
        rowErrors.push(`Invalid tariffType: "${row.tariffType}". Must be: Ad Valorem, Specific, or Compound`);
      }
      
      // Type-specific validation
      if (row.tariffType === 'Ad Valorem' || row.tariffType === 'Compound') {
        if (!row.tariffRate && row.tariffRate !== 0) {
          rowErrors.push('tariffRate is required for Ad Valorem and Compound tariffs');
        }
      }
      
      if (row.tariffType === 'Specific' || row.tariffType === 'Compound') {
        if (!row.specificAmt && row.specificAmt !== 0) {
          rowErrors.push('specificAmt is required for Specific and Compound tariffs');
        }
        if (!row.specificUnit) {
          rowErrors.push('specificUnit is required for Specific and Compound tariffs');
        }
      }
      
      // Date validation
      if (row.startDate && !this.isValidDate(row.startDate)) {
        rowErrors.push(`Invalid startDate format: "${row.startDate}". Use YYYY-MM-DD`);
      }
      if (row.endDate && !this.isValidDate(row.endDate)) {
        rowErrors.push(`Invalid endDate format: "${row.endDate}". Use YYYY-MM-DD`);
      }
      
      if (rowErrors.length > 0) {
        errors.push({
          row: rowNum,
          error: rowErrors.join('; '),
          data: JSON.stringify(row),
        });
      }
    });
    
    return errors;
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  private isValidDate(dateStr: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Build map of existing tariffs for duplicate detection
   * Key: hsCode|importerId|exporterId|tariffType|startDate|endDate
   * NOTE: All 6 fields must match EXACTLY for UPDATE (same tariff rule)
   * Different tariffType or dates = different tariff rules (INSERT)
   */
  private buildTariffMap(tariffs: TariffResponse[]): Map<string, TariffResponse> {
    const map = new Map<string, TariffResponse>();
    tariffs.forEach(tariff => {
      const key = `${tariff.hsCode}|${tariff.importerId}|${tariff.exporterId}|${tariff.tariffType}|${tariff.startDate}|${tariff.endDate}`;
      map.set(key, tariff);
    });
    return map;
  }

  /**
   * Compare existing tariff with CSV row to determine if update is needed
   * Returns true if any value differs (except ID and timestamps)
   */
  private tariffNeedsUpdate(existing: TariffResponse, newData: TariffCreateRequest): boolean {
    // Compare all editable fields
    return (
      existing.endDate !== newData.endDate ||
      existing.tariffType !== newData.tariffType ||
      existing.tariffRate !== newData.tariffRate ||
      existing.specificAmt !== newData.specificAmt ||
      existing.specificUnit !== newData.specificUnit ||
      existing.minTariffAmt !== newData.minTariffAmt ||
      existing.maxTariffAmt !== newData.maxTariffAmt
    );
  }

  /**
   * Process rows with concurrency control and retry logic
   * If duplicate detected with different values, UPDATE existing tariff
   */
  private async processRowsWithConcurrency(
    rows: TariffCreateRequest[],
    existingMap: Map<string, TariffResponse>,
    onProgress?: (current: number, total: number) => void
  ): Promise<CsvUploadResult> {
    const CONCURRENCY = 5; // Process 5 rows at a time
    const MAX_RETRIES = 3;
    
    let successful = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: CsvUploadError[] = [];
    
    // Process in batches
    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const batch = rows.slice(i, i + CONCURRENCY);
      
      const batchPromises = batch.map(async (row, batchIdx) => {
        const rowNum = i + batchIdx + 2; // +2 for header and 0-index
        const key = `${row.hsCode}|${row.importerId}|${row.exporterId}|${row.tariffType}|${row.startDate}|${row.endDate}`;
        const existingTariff = existingMap.get(key);
        
        // Check if duplicate exists
        if (existingTariff) {
          // Compare values to see if update is needed
          const needsUpdate = this.tariffNeedsUpdate(existingTariff, row);
          
          if (needsUpdate) {
            // Try to UPDATE existing tariff with retries
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
              try {
                await this.updateTariff(existingTariff.id, row);
                updated++;
                return; // Success, exit retry loop
              } catch (error) {
                // If last attempt, record error
                if (attempt === MAX_RETRIES - 1) {
                  failed++;
                  errors.push({
                    row: rowNum,
                    error: `Update failed: ${error instanceof Error ? error.message : String(error)}`,
                    data: JSON.stringify(row),
                  });
                } else {
                  // Wait before retry (exponential backoff)
                  await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
                }
              }
            }
          } else {
            // Identical duplicate - skip silently (no update needed)
            skipped++;
            return;
          }
        } else {
          // Try to CREATE new tariff with retries
          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              await this.createTariff(row);
              successful++;
              return; // Success, exit retry loop
            } catch (error) {
              // If last attempt, record error
              if (attempt === MAX_RETRIES - 1) {
                failed++;
                errors.push({
                  row: rowNum,
                  error: error instanceof Error ? error.message : String(error),
                  data: JSON.stringify(row),
                });
              } else {
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
              }
            }
          }
        }
      });
      
      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Report progress
      if (onProgress) {
        onProgress(Math.min(i + CONCURRENCY, rows.length), rows.length);
      }
    }
    
    return { successful, updated, skipped, failed, errors };
  }
}

export default AdminTariffService.getInstance();
