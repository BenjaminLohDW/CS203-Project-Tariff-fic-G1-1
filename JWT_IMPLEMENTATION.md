# JWT Authentication Implementation

## Overview
This document describes the Firebase JWT authentication implementation for the Tariff microservice.

## Changes Made

### 1. Backend Changes

#### Added Dependencies (`pom.xml`)
```xml
<dependency>
  <groupId>com.google.firebase</groupId>
  <artifactId>firebase-admin</artifactId>
  <version>9.2.0</version>
</dependency>
```

#### New Files Created

**`FirebaseService.java`**
- Initializes Firebase Admin SDK using service account credentials from `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- Falls back to Application Default Credentials if env var not set
- **Graceful degradation**: App starts successfully even if Firebase credentials are missing (logs warning)
- Provides methods to verify JWT tokens
- Extracts user information (UID, email) from tokens
- Returns appropriate error if Firebase not initialized when trying to verify tokens

**`JwtAuthenticationFilter.java`**
- Spring Security filter that runs before authentication
- **Method-aware endpoint checking**: Distinguishes between GET (public) and POST/PUT/DELETE (protected) on same paths
- Extracts JWT token from `Authorization` header (supports both `Bearer <token>` and raw token)
- Verifies token with Firebase
- Sets Spring Security authentication context
- Skips authentication for public endpoints:
  - Swagger/API docs
  - Health checks
  - **All GET requests** to `/api/tariffs/**` (read-only tariff data)
  - OPTIONS requests (CORS preflight)

#### Modified Files

**`SecurityConfig.java`**
- **Removed** Basic Auth configuration (`.httpBasic()`)
- **Removed** `BCryptPasswordEncoder` bean (not needed for JWT)
- **Removed** `UserDetailsService` bean with in-memory user (`tariff_admin:tariff_admin`)
- **Added** JWT authentication filter to security chain
- **Added** Granular endpoint security:
  - Public: All GET requests to `/api/tariffs/**` (read-only access)
  - Protected: POST/PUT/DELETE requests require JWT authentication
- Now authenticates using Firebase JWT tokens for write operations only

**`TariffServiceApplication.java`**
- **Excluded** `UserDetailsServiceAutoConfiguration` to prevent Spring Security's default in-memory auth from interfering with JWT

#### Docker & Deployment

**`Dockerfile`**
- Added comment explaining Firebase credentials are mounted via Docker Compose volume

**`compose.yml`**
- Added `GOOGLE_APPLICATION_CREDENTIALS` environment variable pointing to `/app/firebase-credentials.json`
- Added volume mount: `./tariff/firebase-credentials.json:/app/firebase-credentials.json:ro`
- **Note**: App works without this file (read endpoints public, write endpoints return 401)

**`.gitignore`**
- Added `**/firebase-credentials.json` and `firebase-adminsdk-*.json` to prevent committing secrets

### 2. Frontend Changes

#### Modified Files

**`adminTariffService.ts`**
- Uncommented Firebase JWT token import
- Updated `getAuthHeader()` to use JWT tokens instead of Basic Auth
- Sends `Authorization: Bearer <token>` header with all admin requests

**`Admin.tsx`**
- Fixed input validation bug: Changed `parseFloat(value) || null` to proper handling that allows `0` values
- Now uses nullish coalescing (`??`) instead of logical OR (`||`) for default values
- Tariff Rate and Specific Amount fields now accept `0` as valid input

## How It Works

### Authentication Flow

1. **User logs in** via Firebase on the frontend
2. **Frontend gets JWT token** from Firebase Authentication
3. **Frontend sends request** with `Authorization: Bearer <token>` header
4. **Backend JWT filter intercepts** the request
5. **Filter checks**: Is this a public endpoint? (GET requests are public)
6. **If protected**: Verifies token with Firebase Admin SDK
7. **Firebase confirms** token validity and returns user info
8. **Filter sets authentication** in Spring Security context
9. **Request proceeds** to controller with authenticated user (or anonymous for public endpoints)

### Token Format

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4MmU...
```

### User Information Available

After successful JWT verification, the following user information is available in the security context:

- **UID**: Firebase user ID
- **Email**: User's email address  
- **Authorities**: `ROLE_USER` (all authenticated users)

## Firebase Configuration

### Required: Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click gear icon ⚙️ → **Project settings**
4. Go to **Service accounts** tab
5. Click **"Generate new private key"**
6. Download the JSON file
7. Save as `tariff/firebase-credentials.json` (this path is gitignored)
           .build();
       FirebaseApp.initializeApp(options);
   }
   ```

#### Option 2: Application Default Credentials (Current)

Works automatically in:
- Google Cloud environments (Cloud Run, App Engine, GCE)
- When `gcloud auth application-default login` is run locally

### Production Deployment

For AWS/Docker deployment:

1. Download Firebase service account key JSON
2. Add to Docker container as environment variable or mount as file
3. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable
4. Update `FirebaseService.java` to use service account path

## Testing

### Test with cURL

```bash
# 1. Get Firebase JWT token (from browser console)
const token = await firebase.auth().currentUser.getIdToken();
console.log(token);

# 2. Test API endpoint
curl -X GET http://localhost:5004/api/tariffs/all \
  -H "Authorization: Bearer <paste-token-here>"
```

### Test with Frontend

1. Login to the application
2. Navigate to Admin panel
3. Try to upload CSV or create tariff
4. Check browser Network tab for `Authorization: Bearer ...` header
5. Backend should accept the request

### Verify Token Format

In browser console:
```javascript
import { getIdToken } from './lib/auth';
const token = await getIdToken();
console.log('Token:', token);
console.log('Decoded:', JSON.parse(atob(token.split('.')[1])));
```

## Security Considerations

### ✅ Strengths

1. **Stateless**: No session storage required
2. **Secure**: Tokens are cryptographically signed by Firebase
3. **Short-lived**: Tokens expire after 1 hour
4. **Verified**: Backend verifies every token with Firebase
5. **User info**: Email and UID available for audit trails

### ⚠️ Considerations

1. **Token Refresh**: Frontend automatically refreshes tokens before expiry
2. **Public Endpoints**: Health checks and Swagger remain publicly accessible
3. **CORS**: Ensure CORS allows Authorization header
4. **Token Storage**: Tokens stored in memory only (not localStorage)

## Troubleshooting

### 401 Unauthorized Error

### Firebase Not Initialized (Graceful Degradation)

**Symptom**: App starts but admin operations return 401

**Cause**: Firebase credentials not configured (this is by design - app can run without Firebase)

**Expected Behavior**:
- ✅ App starts successfully
- ✅ Public endpoints work (GET /api/tariffs/**)
- ❌ Admin endpoints return 401 (POST/PUT/DELETE /api/tariffs/**)
- ⚠️ Logs show: "Firebase not configured. Public endpoints work, admin requires setup"

**Solutions**:
1. This is normal for development - app works for regular users
2. To enable admin features: Add `tariff/firebase-credentials.json` (see setup above)
3. Restart the tariff service: `docker compose restart tariff`

### 403 Forbidden on Public Endpoints

**Symptom**: GET requests to `/api/tariffs/effective` return 403

**Cause**: JWT filter not distinguishing between GET (public) and POST (protected) methods

**Solution**: Already fixed in `JwtAuthenticationFilter.isPublicEndpoint()` - checks both path AND method

### 401 Unauthorized on Admin Operations

**Symptom**: POST/PUT/DELETE return 401 even with valid JWT

**Cause**: Token verification failed or user not signed in

**Solutions**:
1. Check if user is logged in: `firebase.auth().currentUser`
2. Verify token is being sent: Check Network tab → Headers → Authorization
3. Check backend logs for Firebase errors
4. Ensure Firebase is initialized: Check `FirebaseService` logs
5. Verify Firebase project ID matches frontend config

### Cannot Type "0" in Tariff Form

**Symptom**: Typing "0" in Tariff Rate or Specific Amount fields clears the input

**Cause**: JavaScript falsy value bug: `parseFloat("0") || null` treats 0 as falsy

**Solution**: Already fixed in `Admin.tsx` - proper empty string check and nullish coalescing

### Token Expired Error

**Cause**: JWT token expired (1 hour lifetime)

**Solutions**:
1. Frontend should auto-refresh tokens (check `auth.ts`)
2. Logout and login again
3. Check token expiry: Decode token and check `exp` claim

### CORS Error

**Cause**: Browser blocking Authorization header

**Solutions**:
1. Check `CorsConfig.java` allows `Authorization` header
2. Ensure `Access-Control-Allow-Headers` includes `Authorization`
3. Verify preflight OPTIONS requests return 200

## Migration from Basic Auth

### What Changed

| Aspect | Before (Basic Auth) | After (JWT) |
|--------|-------------------|-------------|
| Authentication | Username/Password | Firebase JWT Token |
| Header Format | `Basic dGFyaWZmX2FkbWluOnRhcmlmZl9hZG1pbg==` | `Bearer eyJhbGci...` |
| Token Storage | Hardcoded in code | Retrieved from Firebase |
| User Management | In-memory (1 user) | Firebase (unlimited) |
| Security | Static credentials | Dynamic, expiring tokens |
| Backend Verification | Password comparison | Cryptographic signature |
| Read Endpoints | Required Basic Auth | **Now Public** (no auth) |
| Write Endpoints | Required Basic Auth | Require JWT |
| App Startup | Required password | **Works without credentials** |

### Components Removed

The following Basic Auth components were **completely removed** as they are not needed with JWT:

#### 1. BCryptPasswordEncoder Bean
```java
// ❌ REMOVED - Not needed for JWT
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```
**Why Removed**: 
- Basic Auth used this to hash/verify passwords
- JWT uses Firebase's cryptographic signature verification instead
- Firebase handles all password management on their servers

#### 2. UserDetailsService Bean
```java
// ❌ REMOVED - Not needed for JWT
@Bean
public UserDetailsService userDetailsService() {
    UserDetails user = User.withUsername("tariff_admin")
        .password(passwordEncoder().encode("tariff_admin"))
        .roles("ADMIN")
        .build();
    
    return new InMemoryUserDetailsManager(user);
}
```
**Why Removed**:
- Basic Auth needed in-memory user store
- JWT extracts user info (email, UID) directly from verified token
- Firebase manages all users centrally

#### 3. HTTP Basic Authentication
```java
// ❌ REMOVED from SecurityFilterChain
.httpBasic(Customizer.withDefaults())
```
**Why Removed**:
- Basic Auth configuration no longer needed
- Replaced by `JwtAuthenticationFilter`

### New Endpoint Security Model

#### Public Endpoints (No Authentication)
```java
// ✅ NEW: Read-only access for everyone
.requestMatchers(
    org.springframework.http.HttpMethod.GET,
    "/api/tariffs",
    "/api/tariffs/effective",
    "/api/tariffs/effective/by-names",
    "/api/tariffs/by-hs/**",
    "/api/tariffs/all"
).permitAll()
```

**Rationale**: Regular users need to calculate tariffs without login

#### Protected Endpoints (JWT Required)
```java
// ✅ NEW: Write operations require authentication
.requestMatchers(org.springframework.http.HttpMethod.POST, "/api/tariffs/**").authenticated()
.requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/tariffs/**").authenticated()
.requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/tariffs/**").authenticated()
```

**Rationale**: Only authenticated admins can create/modify tariff data

### Rollback (If Needed)

To rollback to Basic Auth:

1. Restore old `SecurityConfig.java`:
   - Add `.httpBasic(Customizer.withDefaults())`
   - Add `PasswordEncoder` bean back
   - Add `UserDetailsService` bean back
   - Change `.permitAll()` back to `.authenticated()` for all `/api/**`
   - Remove JWT filter

2. Restore old `adminTariffService.ts` `getAuthHeader()`:
   ```typescript
   const credentials = btoa('tariff_admin:tariff_admin');
   return {
     'Authorization': `Basic ${credentials}`,
     'Content-Type': 'application/json',
   };
   ```

3. Remove Firebase dependency from `pom.xml`

## Bug Fixes & Corrections During Implementation

### Issue 1: App Crashes on Startup Without Firebase Credentials

**Problem**: 
- `FirebaseService.initialize()` threw `RuntimeException` when credentials not found
- Spring Boot app failed to start entirely
- Blocked development for users without Firebase setup

**Root Cause**:
```java
// ❌ BEFORE - Crashed the app
throw new RuntimeException("Failed to initialize Firebase", e);
```

**Fix Applied**:
```java
// ✅ AFTER - Graceful degradation
logger.warn("Firebase not configured. Public endpoints work, admin requires Firebase credentials.");
// App continues to start
```

**Files Modified**: `FirebaseService.java`

**Impact**: App now starts successfully without Firebase, public endpoints work, admin returns 401 until configured

---

### Issue 2: GET Requests Also Returning 403 (Blocked Public Endpoints)

**Problem**:
- `JwtAuthenticationFilter.isPublicEndpoint()` only checked path, not HTTP method
- Both GET and POST to `/api/tariffs/effective` were treated the same
- Public read operations incorrectly required authentication

**Root Cause**:
```java
// ❌ BEFORE - Path-only check
private boolean isPublicEndpoint(String path) {
    return path.equals("/api/tariffs/effective"); // Both GET and POST allowed!
}
```

**Fix Applied**:
```java
// ✅ AFTER - Method-aware check
private boolean isPublicEndpoint(String path, String method) {
    if ("GET".equalsIgnoreCase(method)) {
        if (path.equals("/api/tariffs/effective")) {
            return true; // Only GET is public
        }
    }
    return false; // POST/PUT/DELETE require auth
}
```

**Files Modified**: `JwtAuthenticationFilter.java`

**Impact**: GET requests now work without authentication, POST/PUT/DELETE properly require JWT

---

### Issue 3: Spring Security Default Auth Interfering with JWT

**Problem**:
- Logs showed: `Using generated security password: d5b1d61b-c972-447e-b893-504997f37bd8`
- `UserDetailsServiceAutoConfiguration` created default in-memory user
- Conflicted with custom JWT authentication

**Root Cause**:
Spring Boot autoconfiguration enabled both default security AND custom JWT filter

**Fix Applied**:
```java
// ✅ Excluded auto-configuration
@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class})
public class TariffServiceApplication {
```

**Files Modified**: `TariffServiceApplication.java`

**Impact**: Clean JWT-only authentication, no interference from default security

---

### Issue 4: Cannot Type "0" in Admin Form Number Inputs

**Problem**:
- Users reported: "I cannot type 0 in tariff rate field and specific amount"
- Typing "0" immediately cleared the input field
- Made it impossible to enter zero tariffs or amounts

**Root Cause**:
```tsx
// ❌ BEFORE - Treats 0 as falsy
onChange={(e) => setTariffForm({ 
  ...tariffForm, 
  tariffRate: parseFloat(e.target.value) || null  // 0 || null = null
})}
```

**Fix Applied**:
```tsx
// ✅ AFTER - Proper empty string check
onChange={(e) => {
  const val = e.target.value;
  setTariffForm({ 
    ...tariffForm, 
    tariffRate: val === '' ? null : parseFloat(val)  // 0 is kept as 0
  });
}}

// Also fixed value display
value={tariffForm.tariffRate ?? ''}  // Use ?? instead of ||
```

**Files Modified**: `Admin.tsx` (both `tariffRate` and `specificAmt` fields)

**Impact**: Users can now enter 0 as a valid tariff rate or specific amount

---

### Issue 5: OPTIONS Requests Not Excluded from Auth

**Problem**:
- CORS preflight (OPTIONS) requests were being authenticated
- Browsers blocked requests before they could send JWT token

**Fix Applied**:
```java
// ✅ Added to isPublicEndpoint()
if ("OPTIONS".equalsIgnoreCase(method)) {
    return true; // Always allow CORS preflight
}
```

**Files Modified**: `JwtAuthenticationFilter.java`

**Impact**: CORS preflight requests work correctly

---

## Next Steps

### Enhancements

1. **Role-based Access Control**
   - Add custom claims to Firebase tokens for admin role
   - Check roles in JWT filter
   - Restrict admin endpoints to admin users only

2. **Audit Logging**
   - Log user email/UID for all admin operations
   - Track who created/updated tariffs

3. **Token Refresh Strategy**
   - Implement automatic token refresh before expiry
   - Handle refresh token errors gracefully

4. **Rate Limiting**
   - Add rate limiting per user (using UID)
   - Prevent abuse of admin endpoints

## References

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firebase Auth Verify ID Tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Spring Security Filter Chain](https://docs.spring.io/spring-security/reference/servlet/architecture.html)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
