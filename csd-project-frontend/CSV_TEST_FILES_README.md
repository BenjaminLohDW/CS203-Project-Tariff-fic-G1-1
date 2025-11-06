# CSV Test Files - Usage Guide

## 📁 Test File Overview

### ✅ **1_test_initial_import.csv** - USE THIS FIRST
**Purpose:** Initial data import - creates 10 new tariff rules

**Contents:**
- 10 tariff rules with various types (Ad Valorem, Specific, Compound)
- HS codes: 851713, 851762, 850980, 847130, 850440, 851822, 852852, 853120
- Countries: US→CN/JP/KR/CA/MX/VN, SG→MY/TH/ID
- Date range: 2025-01-01 to 2025/2026-12-31
- **Lower/baseline rates**

**Expected Result on First Upload:**
- ✅ 10 Successful
- 🔄 0 Updated
- ⏭️ 0 Skipped
- ❌ 0 Failed

**Expected Result on Second Upload (Same File):**
- ✅ 0 Successful
- 🔄 0 Updated
- ⏭️ 10 Skipped (identical duplicates)
- ❌ 0 Failed

---

### 🔄 **2_test_update_rates.csv** - USE THIS SECOND
**Purpose:** Test UPDATE functionality - same tariffs but with different rates

**Contents:**
- Same 10 tariff rules (same HS codes, countries, dates)
- **Different rates** - First 4 rows have increased rates
- Tests the UPDATE logic when dates match but values differ

**Expected Result (After uploading File 1):**
- ✅ 0 Successful
- 🔄 4 Updated (first 4 rows with changed rates)
- ⏭️ 6 Skipped (remaining rows identical)
- ❌ 0 Failed

---

### 📈 **3_test_higher_rates.csv** - USE THIS THIRD
**Purpose:** Test UPDATE with significantly higher rates across all tariffs

**Contents:**
- Same 10 tariff rules (same HS codes, countries, dates)
- **All rates increased** significantly compared to File 1
- Tests full UPDATE scenario

**Rate Changes vs File 1:**
| Row | Product | Original | Updated | Change |
|-----|---------|----------|---------|--------|
| 1 | 851713 US→CN | 15.5% | 25.0% | +9.5% |
| 2 | 851713 US→JP | 10.0% | 15.0% | +5.0% |
| 3 | 851713 US→KR | 8.5% | 12.5% | +4.0% |
| 4 | 851762 US→CN | $25/unit | $35/unit | +$10 |
| 5 | 850980 US→MX | 5% + $10/kg | 7.5% + $15/kg | Both ⬆️ |
| 6 | 847130 SG→MY | 3.5%, min$5, max$100 | 5%, min$10, max$150 | All ⬆️ |
| 7 | 850440 US→CA | $15.50/kg | $20/kg | +$4.50 |
| 8 | 851822 SG→TH | 7.5% | 10.0% | +2.5% |
| 9 | 852852 US→VN | 12% + $8/unit | 15% + $12/unit | Both ⬆️ |
| 10 | 853120 SG→ID | $20/kg, min$10, max$500 | $25/kg, min$15, max$600 | All ⬆️ |

**Expected Result (After uploading File 1):**
- ✅ 0 Successful
- 🔄 10 Updated (all rows have changed rates)
- ⏭️ 0 Skipped
- ❌ 0 Failed

---

### ❌ **BROKEN_wrong_column_names.csv** - DO NOT USE
**Issue:** Uses wrong column names (`effectiveDate`, `expiryDate`)  
**Should be:** `startDate`, `endDate`

**This file will fail validation!**

---

## 🧪 Testing Sequence

### **Test 1: Fresh Import (INSERT)**
```bash
Upload: 1_test_initial_import.csv
Expected: 10 Successful ✅
```

### **Test 2: Duplicate Detection (SKIP)**
```bash
Upload: 1_test_initial_import.csv (again)
Expected: 10 Skipped ⏭️
```

### **Test 3: Partial Update**
```bash
Upload: 2_test_update_rates.csv
Expected: 4 Updated, 6 Skipped 🔄
```

### **Test 4: Full Update**
```bash
Upload: 3_test_higher_rates.csv
Expected: 10 Updated 🔄
```

### **Test 5: Rollback (UPDATE back to original)**
```bash
Upload: 1_test_initial_import.csv (after Test 4)
Expected: 10 Updated (rates go back down) 🔄
```

---

## 📊 Understanding Results

| Result | Icon | Meaning |
|--------|------|---------|
| **Successful** | ✅ | New tariff rules created (INSERT) |
| **Updated** | 🔄 | Existing rules modified (UPDATE) |
| **Skipped** | ⏭️ | Identical duplicates (no changes needed) |
| **Failed** | ❌ | Errors (validation, overlap, backend rejection) |

---

## 🔍 What Makes a Duplicate?

**Exact Match Required:**
- ✅ Same `hsCode`
- ✅ Same `importerId`
- ✅ Same `exporterId`
- ✅ Same `startDate`
- ✅ Same `endDate`

**If ALL 5 match:**
- Values same → **SKIP**
- Values different → **UPDATE**

**If dates differ:**
- → **INSERT** (new tariff rule for different time period)

---

## 📝 CSV Format Reference

```csv
hsCode,importerId,exporterId,tariffType,tariffRate,specificAmt,specificUnit,minTariffAmt,maxTariffAmt,startDate,endDate
851713,US,CN,Ad Valorem,15.5,,,,,2025-01-01,2025-12-31
```

**Required Columns:**
- `hsCode` - Harmonized System code (6+ digits)
- `importerId` - Importing country code (2 letters)
- `exporterId` - Exporting country code (2 letters)
- `tariffType` - "Ad Valorem", "Specific", or "Compound"
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)

**Conditional Columns:**
- `tariffRate` - Required for Ad Valorem and Compound types (percentage)
- `specificAmt` - Required for Specific and Compound types (amount)
- `specificUnit` - Required for Specific and Compound types (e.g., "USD/kg")
- `minTariffAmt` - Optional minimum cap
- `maxTariffAmt` - Optional maximum cap

**Important:** Leave fields empty (not "0" or "null") when not applicable!

---

## 🎯 Quick Reference

| File | Use Case | Expected Action |
|------|----------|----------------|
| **1_test_initial_import.csv** | First time setup | INSERT 10 new rules |
| **2_test_update_rates.csv** | Test UPDATE logic | UPDATE 4, SKIP 6 |
| **3_test_higher_rates.csv** | Test full UPDATE | UPDATE all 10 |
| **BROKEN_wrong_column_names.csv** | ❌ Don't use | Will fail |

Happy testing! 🚀
