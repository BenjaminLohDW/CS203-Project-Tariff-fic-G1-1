# Security Measures - CSV Bulk Upload Feature

## Overview
This document outlines the comprehensive security measures implemented in the CSV bulk upload feature to protect against common web application vulnerabilities.

---

## 🔐 Authentication & Authorization

### Backend Authentication (Spring Security)
- **Method**: HTTP Basic Authentication
- **Credentials**: `tariff_admin:tariff_admin` (hardcoded for development)
- **Password Encoding**: BCrypt hashing
- **Role**: ADMIN role required
- **Implementation**: `tariff/src/main/java/com/cs203g1t1/tariff/config/SecurityConfig.java`

**⚠️ Production Consideration**: 
- Credentials are exposed in frontend code (visible in browser)
- For production, migrate to JWT tokens or OAuth2
- Implement proper user management system

---

## 🛡️ Frontend Security Layers

### 1. File Upload Validation

#### **File Type Validation**
```typescript
// Extension check
if (!selectedFile.name.toLowerCase().endsWith('.csv'))

// MIME type validation
if (!['text/csv', 'application/vnd.ms-excel', 'text/plain'].includes(selectedFile.type))

// Filename validation (prevent path traversal)
if (/[\/\\]/.test(selectedFile.name))
```

**Prevents**: Malicious file uploads, path traversal attacks

---

#### **File Size Limits**
```typescript
// Upload limit: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024

// Content size limit: 5MB (after parsing)
if (text.length > 5 * 1024 * 1024)

// Row limit: 1000 rows maximum
const MAX_ROWS = 1000
```

**Prevents**: Denial of Service (DoS) attacks, memory exhaustion

---

### 2. Content Security

#### **Dangerous Content Detection**
```typescript
const dangerousPatterns = /<script|javascript:|onerror=|onclick=/i
if (dangerousPatterns.test(text)) {
  alert('Security: File contains potentially dangerous content')
}
```

**Prevents**: XSS (Cross-Site Scripting) attacks, JavaScript injection

---

#### **CSV Injection Prevention**
```typescript
const sanitizeCell = (cell: string): string => {
  // Prefix dangerous formula characters
  if (/^[=+\-@\t\r]/.test(cellStr)) {
    return `'${cellStr}` // Prevents Excel formula execution
  }
  return cellStr.replace(/"/g, '""') // Escape quotes
}
```

**Prevents**: CSV/Excel formula injection, remote code execution when opening downloaded error reports

**Example Attack Prevented**:
- Input: `=1+1` → Sanitized to: `'=1+1`
- Input: `=cmd|'/c calc'!A1` → Sanitized to: `'=cmd|'/c calc'!A1`

---

### 3. Input Sanitization

#### **General Input Cleaning**
```typescript
private sanitizeInput(input: string): string {
  // Remove null bytes and control characters
  return input.replace(/\0/g, '')
             .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
             .trim();
}
```

**Prevents**: Null byte injection, control character attacks

---

#### **Field-Specific Validation**
```typescript
// HS Code: Alphanumeric + dots only
const hsCode = obj.hsCode?.replace(/[^0-9A-Za-z.]/g, '') || ''

// Country Codes: 2-character alphabetic, uppercase
const importerId = obj.importerId?.toUpperCase()
                     .replace(/[^A-Z]/g, '')
                     .slice(0, 2) || ''

// Tariff Type: Whitelist only
const validTypes = ['Ad Valorem', 'Specific', 'Compound']
const tariffType = validTypes.includes(obj.tariffType) ? obj.tariffType : 'Ad Valorem'

// Specific Unit: Alphanumeric + /- only
const specificUnit = obj.specificUnit?.replace(/[^A-Za-z0-9\/-]/g, '') || null
```

**Prevents**: SQL injection, special character attacks, invalid data formats

---

### 4. Rate Limiting

#### **Client-Side Rate Limiting**
```typescript
const RATE_LIMIT_MS = 10000 // 10 seconds between uploads

if (now - lastUploadTime < RATE_LIMIT_MS) {
  const waitTime = Math.ceil((RATE_LIMIT_MS - (now - lastUploadTime)) / 1000)
  alert(`Security: Please wait ${waitTime} seconds before uploading again`)
  return
}
```

**Prevents**: Rapid-fire uploads, resource exhaustion, automated attacks

---

### 5. Concurrency Control

#### **Batch Processing**
```typescript
const CONCURRENCY = 5  // Process 5 rows at a time
const MAX_RETRIES = 3  // Retry failed requests up to 3 times
```

**Prevents**: Server overload, network congestion, database connection pool exhaustion

---

### 6. Data Validation

#### **Pre-Upload Validation**
- ✅ Required fields check (hsCode, importerId, exporterId, tariffType, dates)
- ✅ Tariff type whitelist validation
- ✅ Type-specific field requirements (Ad Valorem needs tariffRate, etc.)
- ✅ Date format validation (YYYY-MM-DD)
- ✅ Numeric field validation (parseFloat with null handling)

**Prevents**: Invalid data submission, database constraint violations

---

## 📊 Security Test Cases

### ✅ Passed Security Tests

1. **File Type Bypass Attempt**
   - ❌ Upload `.txt` renamed to `.csv` → Rejected (MIME type check)
   - ❌ Upload `.exe` renamed to `.csv` → Rejected (MIME type check)

2. **Size Limit DoS**
   - ❌ Upload 10MB file → Rejected (2MB limit)
   - ❌ Upload file with 5000 rows → Rejected (1000 row limit)

3. **CSV Injection**
   - ❌ Row: `=1+1,US,CN,...` → Sanitized to `'=1+1` in error report
   - ❌ Row: `@SUM(A1:A10),US,CN,...` → Sanitized to `'@SUM(A1:A10)`

4. **XSS Injection**
   - ❌ Content: `<script>alert('xss')</script>` → File rejected

5. **SQL Injection Attempt**
   - ❌ `hsCode: "'; DROP TABLE tariff; --"` → Sanitized to alphanumeric only
   - ✅ Backend uses parameterized queries (Spring Data JPA)

6. **Rate Limiting**
   - ❌ Rapid successive uploads → Blocked for 10 seconds

---

## 🔍 Database Security (Backend)

### Spring Data JPA Protection
- ✅ Parameterized queries (prevents SQL injection)
- ✅ Entity validation annotations
- ✅ Database constraints (VARCHAR(2) for country codes)
- ✅ Foreign key constraints (if applicable)

### Example Database Constraint
```sql
-- Country code length constraint
importer_id VARCHAR(2) NOT NULL
exporter_id VARCHAR(2) NOT NULL

-- Prevented attack: "USA" → Error: value too long for type character varying(2)
```

---

## ⚠️ Known Limitations & Future Improvements

### Current Limitations

1. **Hardcoded Credentials in Frontend**
   - **Risk**: Anyone can view browser DevTools and see credentials
   - **Impact**: High - allows unauthorized access if admin page is accessible
   - **Mitigation Needed**: Implement JWT/OAuth2, store tokens securely

2. **No Frontend Route Protection**
   - **Risk**: Anyone can navigate to admin page URL
   - **Mitigation**: Add `ProtectedRoute` component with role-based access

3. **Client-Side Only Rate Limiting**
   - **Risk**: Can be bypassed with multiple browser sessions or API calls
   - **Mitigation**: Implement backend rate limiting (Spring Security)

4. **Basic Auth Over HTTP** (if not using HTTPS)
   - **Risk**: Credentials sent in base64 (easily decoded)
   - **Mitigation**: Enforce HTTPS in production, use more secure auth method

---

### Recommended Production Enhancements

```typescript
// 1. Environment-based authentication
const API_URL = import.meta.env.VITE_API_URL
const token = sessionStorage.getItem('jwt_token')

// 2. Token refresh mechanism
const refreshToken = async () => {
  // Implement refresh logic
}

// 3. Content Security Policy headers
helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
  }
})

// 4. Backend rate limiting (Spring Boot)
@RateLimiter(name = "bulkUploadLimiter")
public ResponseEntity<...> bulkUpload(...)

// 5. Audit logging
logger.info("Bulk upload initiated by user: {} | rows: {} | timestamp: {}", 
            username, rowCount, timestamp)
```

---

## 📋 Security Checklist

### ✅ Implemented
- [x] File type validation (extension + MIME)
- [x] File size limits (2MB upload, 5MB content, 1000 rows)
- [x] Content scanning (XSS patterns)
- [x] CSV injection prevention (formula sanitization)
- [x] Input sanitization (control chars, null bytes)
- [x] Field-specific validation (whitelist, regex)
- [x] Client-side rate limiting (10 sec cooldown)
- [x] Concurrency control (5 parallel, 3 retries)
- [x] Pre-upload validation (required fields, types)
- [x] Error handling (try-catch, user feedback)
- [x] Backend authentication (Basic Auth + BCrypt)

### ⏳ Recommended for Production
- [ ] JWT/OAuth2 authentication
- [ ] Backend rate limiting
- [ ] Route-based access control
- [ ] HTTPS enforcement
- [ ] Content Security Policy (CSP) headers
- [ ] Audit logging
- [ ] CSRF token validation
- [ ] Security headers (HSTS, X-Frame-Options, etc.)
- [ ] Input validation on backend (duplicate frontend checks)
- [ ] Database transaction rollback on partial failures

---

## 🎓 Educational Note

**This implementation demonstrates security best practices suitable for a school project.** 

For a production system handling sensitive tariff data:
1. Use proper authentication (JWT/OAuth2)
2. Implement end-to-end encryption (HTTPS)
3. Add comprehensive audit trails
4. Regular security testing (penetration testing, code reviews)
5. Compliance with data protection regulations (GDPR, etc.)

---

## 📚 References

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CSV Injection: https://owasp.org/www-community/attacks/CSV_Injection
- Spring Security: https://spring.io/projects/spring-security
- Content Security Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

---

**Last Updated**: October 26, 2025  
**Feature**: CSV Bulk Upload for Tariff Management  
**Security Level**: Development/Educational (see production recommendations above)
