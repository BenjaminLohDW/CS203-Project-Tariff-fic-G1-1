/**
 * FUTURE Admin Tariff Service - WITS Trade Measures Dataset
 * 
 * This file documents the planned schema for the WITS baseline tariff data
 * with U.S. trade policy overlays (FTA, Section 301, IEEPA reciprocal tariffs).
 * 
 * Dataset: Tariffs_with_US_Trade_Measures_v5
 * Scope: HS Chapters 84 and 85 (tech products)
 * 
 * DO NOT USE THIS FILE YET - Current schema is in adminTariffService.ts
 * This is a planning document for database migration.
 */

/**
 * WITS Tariff Record with U.S. Trade Policy Overlays
 * Based on Sheet: "Tariffs + Agreements (Updated)"
 */
export interface WitsTariffRecord {
  // Core Identifiers
  id?: number;                          // Database primary key
  reporter: string;                     // Reporting economy (e.g., "United States")
  reporterName: string;                 // Full country name
  partner: string;                      // Partner economy code (e.g., "CN", "CA")
  partnerName: string;                  // Partner's full country name
  
  // Product Information
  product: string;                      // HS 6-digit product code (e.g., "840991")
  productName: string;                  // Description of HS product
  
  // Temporal
  tariffYear: number;                   // Year of tariff data (e.g., 2022)
  
  // Tariff Components
  dutyType: string;                     // e.g., "Derived (MFN/AHS)"
  preferentialRate: number | null;      // Preferential (FTA/applied) rate from WITS (%)
  mfnRate: number | null;               // Most-Favoured-Nation rate from WITS (%)
  section301Rate: number | null;        // U.S. retaliatory tariff (Trade Act §301) - 25% or 7.5% for China
  ieepaReciprocalRate: number | null;   // Additional surcharge from EO 2025-08 (%)
  totalEffectiveRate: number;           // Calculated: (Preferential > 0 ? Preferential : MFN) + Section301 + IEEPA
  
  // Policy Measures
  agreement: string;                    // Semicolon-separated list (e.g., "USMCA (FTA); U.S. Section 301 Tariff")
  
  // Metadata
  tradeSource: string;                  // Data source (e.g., "WITS/UNCTAD/World Bank")
}

/**
 * Request payload for creating WITS tariff record
 */
export interface WitsTariffCreateRequest {
  reporter: string;
  reporterName: string;
  partner: string;
  partnerName: string;
  product: string;                      // HS 6-digit code
  productName: string;
  tariffYear: number;
  dutyType: string;
  preferentialRate?: number | null;
  mfnRate?: number | null;
  section301Rate?: number | null;
  ieepaReciprocalRate?: number | null;
  agreement: string;
  tradeSource: string;
}

/**
 * HS Translation/Reference Record
 * Based on Sheet: "HS_Translations"
 */
export interface HSTranslation {
  hsCode: string;                       // HS 6-digit reference
  description: string;                  // Official WITS/UNCTAD description
  chapter?: string;                     // HS Chapter (e.g., "84", "85")
  // Additional metadata columns as needed
}

/**
 * Parsed Agreement structure
 * For frontend display of semicolon-separated agreement field
 */
export interface TariffAgreement {
  type: 'FTA' | 'Section 301' | 'IEEPA' | 'Other';
  name: string;                         // e.g., "USMCA", "U.S. Section 301 Tariff"
  description?: string;
}

/**
 * Migration Notes:
 * 
 * 1. Database Schema Changes Required:
 *    - Rename: importerId → partner, exporterId → reporter
 *    - Add: reporterName, partnerName, productName, tariffYear
 *    - Remove: tariffType, specificAmt, specificUnit, startDate, endDate
 *    - Add: preferentialRate, mfnRate, section301Rate, ieepaReciprocalRate
 *    - Add: totalEffectiveRate (calculated field or stored)
 *    - Add: agreement (text/varchar), dutyType, tradeSource
 * 
 * 2. Business Logic Changes:
 *    - Total Effective Rate calculation:
 *      totalEffectiveRate = (preferentialRate > 0 ? preferentialRate : mfnRate) 
 *                          + section301Rate + ieepaReciprocalRate
 *    - Agreement parsing: Split semicolon-separated string for display
 *    - FTA auto-tagging: When partner in [CA, MX, KR, AU, SG, etc.] → add FTA to agreement
 *    - Section 301: Only applies to partner === "CN" (China)
 *    - IEEPA overlay: Country-based reciprocal surcharge from EO 2025-08
 * 
 * 3. UI Display Changes:
 *    - Replace "Tariff Type" dropdown with policy measure badges
 *    - Show breakdown: Preferential/MFN + Section 301 + IEEPA = Total
 *    - Add "Agreement" column with parsed list of measures
 *    - Add year filter (tariffYear)
 *    - Update table columns to show Reporter/Partner instead of Importer/Exporter
 *    - Add Product Name for better UX
 * 
 * 4. Current vs Future Field Mapping:
 *    OLD                  → NEW
 *    -------------------    -------------------
 *    hsCode               → product (HS 6-digit)
 *    importerId           → partner (country code)
 *    exporterId           → reporter (always "US" for this dataset)
 *    tariffType           → REMOVE (replaced by agreement field)
 *    tariffRate           → preferentialRate OR mfnRate (logic-based)
 *    specificAmt          → REMOVE (not in WITS schema)
 *    specificUnit         → REMOVE (not in WITS schema)
 *    startDate/endDate    → tariffYear (single year instead of date range)
 *    N/A                  → section301Rate (NEW)
 *    N/A                  → ieepaReciprocalRate (NEW)
 *    N/A                  → totalEffectiveRate (NEW)
 *    N/A                  → agreement (NEW)
 *    N/A                  → productName (NEW)
 *    N/A                  → reporterName/partnerName (NEW)
 * 
 * 5. Known FTA Countries (for auto-tagging):
 *    - USMCA: CA (Canada), MX (Mexico)
 *    - KORUS: KR (South Korea)
 *    - AUSFTA: AU (Australia)
 *    - USSFTA: SG (Singapore)
 *    - CAFTA-DR: CR, SV, GT, HN, NI, DO (Central America + Dominican Republic)
 *    - And others as documented in WITS FTA policy list
 * 
 * 6. Backend Migration Steps (for teammate):
 *    a. Create new database table with WITS schema
 *    b. Add migration script to transform old data → new schema
 *    c. Update REST endpoints to use new field names
 *    d. Add calculated field for totalEffectiveRate
 *    e. Add CSV bulk import endpoint for WITS dataset
 *    f. Add filtering by tariffYear, partner, product
 * 
 * 7. Frontend Migration Steps:
 *    a. Update adminTariffService.ts with new interfaces
 *    b. Update Admin.tsx form to match new schema
 *    c. Update table columns to show new fields
 *    d. Add agreement parser utility function
 *    e. Add tariff breakdown display (show components)
 *    f. Update validation rules (no more date ranges, use tariffYear)
 *    g. Add CSV upload UI for bulk import
 */

// Utility function for parsing agreement field
export function parseAgreements(agreementString: string): TariffAgreement[] {
  if (!agreementString) return [];
  
  return agreementString
    .split(';')
    .map(a => a.trim())
    .filter(a => a.length > 0)
    .map(agreementName => {
      let type: TariffAgreement['type'] = 'Other';
      
      if (agreementName.includes('FTA') || agreementName.includes('USMCA') || 
          agreementName.includes('KORUS') || agreementName.includes('AUSFTA') ||
          agreementName.includes('USSFTA') || agreementName.includes('CAFTA')) {
        type = 'FTA';
      } else if (agreementName.includes('Section 301')) {
        type = 'Section 301';
      } else if (agreementName.includes('IEEPA') || agreementName.includes('Reciprocal')) {
        type = 'IEEPA';
      }
      
      return { type, name: agreementName };
    });
}

// Utility function for calculating total effective rate
export function calculateTotalEffectiveRate(
  preferentialRate: number | null,
  mfnRate: number | null,
  section301Rate: number | null,
  ieepaReciprocalRate: number | null
): number {
  const baseRate = (preferentialRate && preferentialRate > 0) ? preferentialRate : (mfnRate || 0);
  const section301 = section301Rate || 0;
  const ieepa = ieepaReciprocalRate || 0;
  
  return baseRate + section301 + ieepa;
}

/**
 * Example usage in Admin.tsx (future):
 * 
 * const tariffForm = {
 *   reporter: 'United States',
 *   reporterName: 'United States',
 *   partner: 'CN',
 *   partnerName: 'China',
 *   product: '840991',
 *   productName: 'Parts suitable for use solely with engines of heading 8407 or 8408',
 *   tariffYear: 2022,
 *   dutyType: 'Derived (MFN/AHS)',
 *   preferentialRate: 0,
 *   mfnRate: 2.5,
 *   section301Rate: 25,
 *   ieepaReciprocalRate: 0,
 *   agreement: 'U.S. Section 301 Tariff',
 *   tradeSource: 'WITS/UNCTAD/World Bank'
 * };
 * 
 * // Total Effective Rate = 0 + 2.5 + 25 + 0 = 27.5%
 */
