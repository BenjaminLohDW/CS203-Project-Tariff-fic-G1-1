# Security Configuration - Public vs Protected Endpoints

## 🎯 Current Configuration

### Public Endpoints (No Authentication Required)

#### Read-Only Tariff Data
- ✅ `GET /api/tariffs` - List tariffs by HS code + countries
- ✅ `GET /api/tariffs/effective` - Get effective tariff for date
- ✅ `GET /api/tariffs/effective/by-names` - Get tariff by product/country names
- ✅ `GET /api/tariffs/by-hs/{hsCode}` - List tariffs by HS code
- ✅ `GET /api/tariffs/all` - List all tariffs

**Rationale**: Regular users need to calculate tariffs and lookup rates without authentication. This is the core functionality of the application.

#### Health Checks
- ✅ `GET /ping` - Service health check
- ✅ `GET /api/tariffs/health` - Tariff service health

#### Documentation
- ✅ `/swagger-ui/**` - API documentation
- ✅ `/v3/api-docs/**` - OpenAPI specs

#### CORS Preflight
- ✅ `OPTIONS /**` - CORS preflight requests

---

### Protected Endpoints (JWT Authentication Required)

#### Admin Operations
- 🔒 `POST /api/tariffs` - Create new tariff record
- 🔒 `PUT /api/tariffs/**` - Update tariff record (future)
- 🔒 `DELETE /api/tariffs/**` - Delete tariff record (future)

**Rationale**: Only authenticated admin users should be able to create, update, or delete tariff data.

---

## 🔐 Security Model

### Read Access: Public
```
User → GET /api/tariffs/effective → ✅ No auth needed
```

**Why?**
- Tariff data is public information
- Users need to calculate import costs
- No sensitive data in tariff records
- Rate limiting prevents abuse

### Write Access: Protected
```
Admin → Login → Get JWT → POST /api/tariffs → ✅ JWT verified → Create tariff
User → No login → POST /api/tariffs → ❌ 401 Unauthorized
```

**Why?**
- Prevents unauthorized data modification
- Audit trail via JWT user info
- Only trusted admins can manage tariffs

---

## 📊 Impact on Services

### Frontend Services Affected

#### `tariffService.ts` (Regular Users)
- **Status**: ✅ **WORKS** - No authentication needed
- **Endpoints Used**:
  - `GET /api/tariffs/effective`
  - `GET /api/tariffs/effective/by-names`
  - `GET /api/tariffs/by-hs/{code}`
  - `GET /api/tariffs?hs_code=...`
- **Can Remove**: Basic Auth code (no longer needed)

#### `adminTariffService.ts` (Admin Users)
- **Status**: 🔒 **Requires JWT**
- **Endpoints Used**:
  - `POST /api/tariffs` (create)
  - `GET /api/tariffs/all` (now public, but admin still uses JWT)
- **Authentication**: Firebase JWT token

---

## 🛡️ Security Layers

### Layer 1: Public Endpoints
- **Protection**: Rate limiting (future)
- **Validation**: Input validation on all parameters
- **Risk**: Low - read-only access to public data

### Layer 2: Protected Endpoints
- **Protection**: JWT authentication
- **Validation**: Firebase token verification
- **Audit**: User email/UID logged
- **Risk**: Minimal - only authenticated admins

### Layer 3: Database
- **Protection**: PostgreSQL constraints
- **Validation**: JPA entity validation
- **Backup**: Regular backups (production)

---

## 🔄 Migration Impact

### Before (Basic Auth on Everything)
```java
// ALL /api/** endpoints required Basic Auth
.requestMatchers("/api/**").authenticated()
.httpBasic(Customizer.withDefaults())

// Components used:
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}

@Bean
public UserDetailsService userDetailsService() {
    UserDetails user = User.withUsername("tariff_admin")
        .password(passwordEncoder().encode("tariff_admin"))
        .roles("ADMIN")
        .build();
    return new InMemoryUserDetailsManager(user);
}
```

**Problems**:
- ❌ Regular users needed hardcoded password
- ❌ No per-user tracking
- ❌ Credentials in frontend code
- ❌ Can't revoke access per user
- ❌ All endpoints required authentication (even reads)

### After (Public Reads + JWT Writes)
```java
// READ: Public access (no BCryptPasswordEncoder needed)
.requestMatchers(GET, "/api/tariffs/**").permitAll()

// WRITE: JWT authentication required (no UserDetailsService needed)
.requestMatchers(POST|PUT|DELETE, "/api/tariffs/**").authenticated()
.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)

// Components removed:
// ❌ BCryptPasswordEncoder - Not needed (JWT uses signatures)
// ❌ UserDetailsService - Not needed (users in Firebase)
// ❌ .httpBasic() - Not needed (JWT replaces Basic Auth)
```

**Benefits**:
- ✅ Regular users: no authentication needed
- ✅ Admin users: secure JWT authentication
- ✅ Per-user audit trails
- ✅ Token auto-expiry (1 hour)
- ✅ Instant revocation via Firebase
- ✅ Simpler code (no password hashing beans)

---

## 📝 Recommendations

### Immediate Actions

1. **Remove Basic Auth from `tariffService.ts`** (optional)
   - Regular users don't need authentication anymore
   - Simplifies frontend code
   - Example:
     ```typescript
     // Before
     headers: {
       'Authorization': getBasicAuthHeader()
     }
     
     // After
     headers: {
       'Content-Type': 'application/json'
     }
     ```

2. **Test public endpoints**
   ```bash
   # Should work without authentication
   curl http://localhost:5004/api/tariffs/effective?hs_code=010121&importer=SG&exporter=MY&date=2025-10-27
   ```

3. **Test protected endpoints**
   ```bash
   # Should fail without JWT
   curl -X POST http://localhost:5004/api/tariffs \
     -H "Content-Type: application/json" \
     -d '{"hsCode":"010121",...}'
   # Expected: 401 Unauthorized
   
   # Should succeed with JWT
   curl -X POST http://localhost:5004/api/tariffs \
     -H "Authorization: Bearer <jwt-token>" \
     -H "Content-Type: application/json" \
     -d '{"hsCode":"010121",...}'
   # Expected: 201 Created
   ```

### Future Enhancements

1. **Rate Limiting**
   - Add rate limiting to public endpoints
   - Prevent abuse of tariff lookup API
   - Example: 100 requests per minute per IP

2. **Caching**
   - Cache frequent tariff queries
   - Reduce database load
   - Improve response times

3. **API Keys** (Alternative)
   - Issue API keys for programmatic access
   - Track usage per client
   - Monetization opportunity (future)

4. **Read-Only User Accounts**
   - Allow users to save favorite tariffs
   - Track calculation history
   - Personalized experience

---

## 🧪 Testing Matrix

| User Type | Endpoint | Auth | Expected Result |
|-----------|----------|------|----------------|
| Anonymous | `GET /api/tariffs/effective` | None | ✅ 200 OK |
| Anonymous | `POST /api/tariffs` | None | ❌ 401 Unauthorized |
| Anonymous | `GET /api/tariffs/all` | None | ✅ 200 OK |
| Admin | `GET /api/tariffs/effective` | None | ✅ 200 OK |
| Admin | `GET /api/tariffs/all` | JWT | ✅ 200 OK |
| Admin | `POST /api/tariffs` | JWT | ✅ 201 Created |
| Admin | `POST /api/tariffs` | None | ❌ 401 Unauthorized |
| Admin | `POST /api/tariffs` | Basic Auth | ❌ 401 Unauthorized |

---

## 🎯 Summary

**Read Operations**: Public (no authentication)
- Tariff lookup
- Calculate import costs
- Browse tariff data

**Write Operations**: Protected (JWT required)
- Create tariffs
- Update tariffs (future)
- Delete tariffs (future)

**Result**: 
- ✅ Regular users: seamless experience, no login needed
- ✅ Admin users: secure authentication with JWT
- ✅ Best of both worlds!
