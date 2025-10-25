# Firebase JWT Integration Guide

## 🎉 Yes, Firebase Uses JWT Tokens!

Firebase Authentication provides **JWT (JSON Web Tokens)** that are cryptographically signed and can be verified by your backend.

---

## 🔑 What We've Implemented

### ✅ Frontend Changes

#### 1. **Added JWT Token Retrieval (`auth.ts`)**

```typescript
/**
 * Get Firebase ID Token (JWT) for authenticated user
 */
export const getIdToken = async (): Promise<string | null> => {
  if (!auth?.currentUser) return null
  
  try {
    const token = await auth.currentUser.getIdToken(false) // cached
    return token
  } catch (error) {
    console.error('Error getting ID token:', error)
    return null
  }
}

/**
 * Force refresh the Firebase ID Token
 */
export const refreshIdToken = async (): Promise<string | null> => {
  if (!auth?.currentUser) return null
  
  try {
    const token = await auth.currentUser.getIdToken(true) // force refresh
    return token
  } catch (error) {
    console.error('Error refreshing ID token:', error)
    return null
  }
}
```

#### 2. **Updated API Service to Use JWT (`adminTariffService.ts`)**

```typescript
import { getIdToken } from './auth'

private async getAuthHeader(): Promise<HeadersInit> {
  // Try Firebase JWT first
  try {
    const token = await getIdToken()
    if (token) {
      return {
        'Authorization': `Bearer ${token}`, // ⭐ JWT token!
        'Content-Type': 'application/json',
      }
    }
  } catch (error) {
    console.warn('Failed to get Firebase JWT, falling back to Basic Auth:', error)
  }
  
  // Fallback to Basic Auth (for development/compatibility)
  const credentials = btoa('tariff_admin:tariff_admin')
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
  }
}
```

---

## 🔐 How Firebase JWT Works

### **Token Structure**

Firebase ID tokens are standard JWTs with 3 parts:

```
eyJhbGciOiJSUzI1NiIsImtpZCI6IjFkYz...  ← Header
.
eyJpc3MiOiJodHRwczovL3NlY3VyZXRva...  ← Payload
.
S7Y3BqZGJ5cWRxZGJ5cWRxZGJ5cWRxZ...  ← Signature
```

### **Decoded Payload Example**

```json
{
  "iss": "https://securetoken.google.com/your-project-id",
  "aud": "your-project-id",
  "auth_time": 1729900000,
  "user_id": "abc123xyz456",
  "sub": "abc123xyz456",
  "iat": 1729900000,
  "exp": 1729903600,
  "email": "user@example.com",
  "email_verified": true,
  "firebase": {
    "identities": {
      "email": ["user@example.com"]
    },
    "sign_in_provider": "password"
  }
}
```

### **Key Claims**

| Claim | Description |
|-------|-------------|
| `iss` | Issuer (Firebase) |
| `sub` | Subject (User ID) |
| `aud` | Audience (Your Firebase Project ID) |
| `exp` | Expiration time (1 hour default) |
| `iat` | Issued at time |
| `user_id` | Firebase User UID |
| `email` | User's email |
| `email_verified` | Email verification status |

---

## 🔒 Security Benefits Over Basic Auth

### ⚠️ **Basic Auth (Before)**
```
Authorization: Basic dGFyaWZmX2FkbWluOnRhcmlmZl9hZG1pbg==
                     ↑ base64("tariff_admin:tariff_admin")
```
- ❌ Credentials hardcoded in frontend (visible to anyone)
- ❌ Same credentials for all users
- ❌ No expiration
- ❌ Can't revoke without changing code
- ❌ No user identity information

### ✅ **Firebase JWT (After)**
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZ...
```
- ✅ Token specific to each user
- ✅ Automatically expires (1 hour)
- ✅ Can be revoked instantly via Firebase
- ✅ Cryptographically signed (RSA256)
- ✅ Contains user identity (email, UID, roles)
- ✅ Stateless (no server-side session needed)
- ✅ Industry standard (OAuth 2.0 / OpenID Connect)

---

## 🛡️ Backend Verification (Spring Boot)

To fully secure your backend, you need to verify Firebase JWTs in Spring Boot:

### **Step 1: Add Firebase Admin SDK Dependency**

```xml
<!-- In tariff/pom.xml -->
<dependency>
    <groupId>com.google.firebase</groupId>
    <artifactId>firebase-admin</artifactId>
    <version>9.2.0</version>
</dependency>
```

### **Step 2: Create JWT Filter**

```java
// JwtAuthenticationFilter.java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            try {
                // Verify Firebase token
                FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
                String uid = decodedToken.getUid();
                String email = decodedToken.getEmail();
                
                // Create Spring Security authentication
                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
                
                // Check for admin role (you can store this in Firebase custom claims)
                if (decodedToken.getClaims().containsKey("admin") 
                    && (Boolean) decodedToken.getClaims().get("admin")) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                }
                
                UsernamePasswordAuthenticationToken auth = 
                    new UsernamePasswordAuthenticationToken(email, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
                
            } catch (FirebaseAuthException e) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }
        
        filterChain.doFilter(request, response);
    }
}
```

### **Step 3: Update SecurityConfig**

```java
@EnableWebSecurity
@Configuration
public class SecurityConfig {
    
    @Autowired
    private JwtAuthenticationFilter jwtAuthFilter;
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            // Add JWT filter BEFORE Basic Auth filter
            .addFilterBefore(jwtAuthFilter, BasicAuthenticationFilter.class)
            .httpBasic(Customizer.withDefaults()) // Keep as fallback
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**").permitAll()
                .requestMatchers("/ping/**", "/api/tariffs/health").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().authenticated()
            );
        
        return http.build();
    }
}
```

### **Step 4: Initialize Firebase Admin SDK**

```java
@Configuration
public class FirebaseConfig {
    
    @PostConstruct
    public void initialize() throws IOException {
        // Use service account key (store in environment variable)
        String serviceAccountPath = System.getenv("FIREBASE_SERVICE_ACCOUNT_PATH");
        
        if (serviceAccountPath != null) {
            FileInputStream serviceAccount = new FileInputStream(serviceAccountPath);
            
            FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .build();
            
            FirebaseApp.initializeApp(options);
        }
    }
}
```

---

## 📋 Current Implementation Status

### ⚠️ **IMPORTANT: Backend JWT Not Yet Implemented**

**The frontend is ready for JWT, but the backend still only accepts Basic Auth.**

Until backend JWT verification is added, the code uses Basic Auth by default:

```typescript
// adminTariffService.ts - Current configuration
private async getAuthHeader(): Promise<HeadersInit> {
  // Using Basic Auth (backend doesn't support JWT yet)
  const credentials = btoa('tariff_admin:tariff_admin')
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
  }
}
```

### ✅ **Completed (Frontend - Ready for JWT)**
- [x] Firebase Authentication integrated
- [x] JWT token retrieval functions added (`getIdToken`, `refreshIdToken`)
- [x] Code prepared to use JWT tokens
- [x] **Currently using Basic Auth** (backend limitation)

### ⏳ **Pending (Backend - Blocks JWT Usage)**
- [ ] Add Firebase Admin SDK to `pom.xml`
- [ ] Create `JwtAuthenticationFilter`
- [ ] Update `SecurityConfig` to use JWT filter
- [ ] Initialize Firebase Admin SDK
- [ ] **Then uncomment JWT code in `adminTariffService.ts`**

### 🎯 **Benefits Once Backend is Complete**
- ✅ **No more hardcoded credentials in frontend**
- ✅ **Per-user authentication** (each user has unique token)
- ✅ **Automatic token expiration** (1 hour, auto-renewed)
- ✅ **Instant revocation** (via Firebase console)
- ✅ **Role-based access control** (via custom claims)
- ✅ **Production-ready security**

---

## 🧪 Testing JWT Implementation

### **1. Check if JWT is being sent**

Open browser DevTools → Network tab → Find API request → Check headers:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjFk...
```

### **2. Decode JWT Token (jwt.io)**

Copy token and paste into [https://jwt.io](https://jwt.io) to inspect payload.

### **3. Verify Token Expiration**

Wait 1 hour → Firebase will auto-refresh token → New request should have new JWT.

### **4. Test Revocation**

1. Go to Firebase Console → Authentication → Users
2. Disable user account
3. Try making API request → Should fail with 401 Unauthorized

---

## 🔄 Token Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│ User Login (Email/Password)                             │
│ ↓                                                        │
│ Firebase Auth creates JWT (expires in 1 hour)           │
│ ↓                                                        │
│ Frontend stores reference to Firebase user              │
│ ↓                                                        │
│ On API call: getIdToken() retrieves fresh/cached JWT    │
│ ↓                                                        │
│ JWT sent in Authorization header to backend             │
│ ↓                                                        │
│ Backend verifies JWT signature with Firebase            │
│ ↓                                                        │
│ If valid: Grant access | If expired: 401 Unauthorized   │
│ ↓                                                        │
│ Frontend auto-refreshes token when needed               │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Next Steps

### **For Development (Current)**
- ✅ Frontend sends JWT tokens automatically
- ✅ Falls back to Basic Auth if no user logged in
- ✅ Works with existing Basic Auth backend

### **For Production (Recommended)**
1. **Add Firebase Admin SDK** to backend
2. **Implement JWT verification** in Spring Security
3. **Remove Basic Auth** credentials from frontend
4. **Set up custom claims** for admin roles
5. **Configure Firebase service account** in production environment

---

## 📚 References

- **Firebase ID Tokens**: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- **Firebase Admin SDK (Java)**: https://firebase.google.com/docs/admin/setup#java
- **JWT.io** (token debugger): https://jwt.io
- **Spring Security**: https://docs.spring.io/spring-security/reference/index.html

---

**Status**: ✅ Frontend ready | ⏳ Backend pending  
**Security Level**: Development → Production (after backend implementation)  
**Last Updated**: October 26, 2025
