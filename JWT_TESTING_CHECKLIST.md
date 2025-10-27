# JWT Implementation - Testing & Deployment Checklist

## ✅ Pre-Testing Setup

### 1. Firebase Credentials (REQUIRED)

Choose **ONE** option:

#### Option A: Service Account Key (Recommended)
```powershell
# 1. Download service account key from Firebase Console
# 2. Save as firebase-service-account.json
# 3. Set environment variable (PowerShell)
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\firebase-service-account.json"

# 4. Verify it's set
echo $env:GOOGLE_APPLICATION_CREDENTIALS
```

#### Option B: Google Cloud SDK
```bash
# 1. Install Google Cloud SDK
# 2. Run authentication
gcloud auth application-default login
```

### 2. Backend Build

```powershell
cd "c:\SMU\Collab Dev\Project\CS203-Project-Tariff-fic-G1-1\tariff"
.\mvnw.cmd clean install -DskipTests
```

**Expected Output**: `BUILD SUCCESS`

---

## 🧪 Testing Steps

### Step 1: Start Backend

```powershell
cd "c:\SMU\Collab Dev\Project\CS203-Project-Tariff-fic-G1-1\tariff"
.\mvnw.cmd spring-boot:run
```

**Expected Log Messages**:
```
Firebase initialized with Application Default Credentials
...
Tomcat started on port 5004
```

### Step 2: Start Frontend

```powershell
cd "c:\SMU\Collab Dev\Project\CS203-Project-Tariff-fic-G1-1\csd-project-frontend"
npm run dev
```

### Step 3: Test Authentication Flow

1. **Open browser** → http://localhost:5173
2. **Login** with Firebase credentials
3. **Navigate** to Admin panel
4. **Open DevTools** → Network tab
5. **Try any admin operation** (create tariff, bulk upload)
6. **Check request headers** → Should see:
   ```
   Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4MmU...
   ```

### Step 4: Verify Backend Logs

Check terminal running backend for:

```
DEBUG - JWT authentication successful for user: user@example.com
```

### Step 5: Test Bulk Upload

1. **Navigate** to Admin → Tariffs tab
2. **Upload** `test_data_bulk_upload.csv`
3. **Expected Result**: 
   - ✅ Progress bar shows upload
   - ✅ Success message with counts
   - ✅ No 401 errors

### Step 6: Manual Token Test (Optional)

```javascript
// Browser Console (while logged in)
const token = await firebase.auth().currentUser.getIdToken();
console.log('Token:', token);
console.log('Token length:', token.length); // Should be ~800-1000 chars

// Copy token and test with cURL
```

```powershell
# PowerShell
$token = "paste-your-token-here"
curl -X GET http://localhost:5004/api/tariffs/all `
  -H "Authorization: Bearer $token"
```

**Expected Response**: JSON array of tariffs

---

## ✅ Success Criteria

| Test | Expected Result | Status |
|------|----------------|--------|
| Backend starts | "Firebase initialized" message | ⬜ |
| User login | Successful, redirects to dashboard | ⬜ |
| Admin access | Can access Admin panel | ⬜ |
| JWT header sent | Network tab shows `Bearer <token>` | ⬜ |
| Create tariff | 200 OK response | ⬜ |
| Bulk upload | Successful upload with counts | ⬜ |
| Backend logs | Shows user email in logs | ⬜ |
| Token refresh | No 401 errors after 5 minutes | ⬜ |

---

## ❌ Troubleshooting

### Problem: "Firebase initialization failed"

**Symptoms**: 
- Backend crashes on startup
- Error: "Failed to initialize Firebase"

**Solutions**:
1. Check `GOOGLE_APPLICATION_CREDENTIALS` is set
2. Verify file path exists and is correct
3. Ensure JSON file is valid (open in text editor)
4. Try absolute path instead of relative path

### Problem: "401 Unauthorized"

**Symptoms**:
- API requests return 401
- Network tab shows request failing

**Solutions**:

**A. User not logged in**
```javascript
// Check in console
console.log(firebase.auth().currentUser); // Should not be null
```

**B. Token not being sent**
```javascript
// Check in Network tab → Headers
// Should see: Authorization: Bearer <token>
```

**C. Firebase project mismatch**
- Verify frontend Firebase config matches backend service account
- Check project ID in Firebase Console

**D. Token expired**
```javascript
// Force refresh token
import { refreshIdToken } from './lib/auth';
const newToken = await refreshIdToken();
```

### Problem: "Token verification failed"

**Symptoms**:
- Backend logs: "Firebase token verification failed"
- 403 Forbidden errors

**Solutions**:

1. **Check Firebase project ID matches**
   - Frontend: `firebaseConfig.projectId`
   - Backend: Service account key `project_id` field

2. **Verify service account key is correct**
   - Re-download from Firebase Console
   - Ensure it's from the correct project

3. **Check clock sync**
   - JWT tokens are time-sensitive
   - Ensure system clock is correct

### Problem: Backend doesn't recognize Firebase module

**Symptoms**:
- Compilation errors about Firebase classes
- ClassNotFoundException

**Solutions**:
```powershell
# Clean and rebuild
cd tariff
.\mvnw.cmd clean install -U
```

---

## 🚀 Deployment Checklist

### Local Development
- [x] Firebase Admin SDK added to pom.xml
- [x] JwtAuthenticationFilter created
- [x] FirebaseService created
- [x] SecurityConfig updated
- [x] Frontend updated to send JWT
- [ ] Firebase credentials configured
- [ ] Backend tested successfully
- [ ] Frontend tested successfully

### Production (Future)

#### Backend
- [ ] Add Firebase service account to environment variables
- [ ] Update Docker compose to inject credentials
- [ ] Test JWT in staging environment
- [ ] Enable debug logs for first deployment
- [ ] Monitor error rates after deployment

#### Frontend
- [ ] Verify Firebase config is correct for production
- [ ] Test token refresh logic
- [ ] Add error handling for authentication failures
- [ ] Monitor 401/403 error rates

#### Security
- [ ] Rotate service account keys regularly
- [ ] Add rate limiting per user
- [ ] Implement role-based access control
- [ ] Set up audit logging with user emails
- [ ] Review Firebase security rules

---

## 📋 Files Changed Summary

### Backend (Java)
- ✅ `pom.xml` - Added Firebase dependency
- ✅ `FirebaseService.java` - NEW: Token verification
- ✅ `JwtAuthenticationFilter.java` - NEW: JWT filter
- ✅ `SecurityConfig.java` - MODIFIED: Removed Basic Auth

### Frontend (TypeScript)
- ✅ `adminTariffService.ts` - MODIFIED: Uses JWT tokens
- ✅ `auth.ts` - Already has `getIdToken()` function

### Documentation
- ✅ `JWT_IMPLEMENTATION.md` - Complete technical guide
- ✅ `FIREBASE_SETUP_BACKEND.md` - Setup instructions
- ✅ `JWT_IMPLEMENTATION_SUMMARY.md` - Overview
- ✅ `JWT_TESTING_CHECKLIST.md` - This file

---

## 🎯 Next Actions

1. **IMMEDIATE**: Set up Firebase credentials
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\firebase-key.json"
   ```

2. **START**: Backend and frontend servers
   ```powershell
   # Terminal 1: Backend
   cd tariff
   .\mvnw.cmd spring-boot:run
   
   # Terminal 2: Frontend
   cd csd-project-frontend
   npm run dev
   ```

3. **TEST**: Login and try bulk upload

4. **VERIFY**: Check all success criteria above

5. **REPORT**: Document any issues found

---

## 📞 Support Resources

- **Firebase Console**: https://console.firebase.google.com/
- **Firebase Admin SDK Docs**: https://firebase.google.com/docs/admin/setup
- **Spring Security Docs**: https://docs.spring.io/spring-security/reference/
- **JWT Debugger**: https://jwt.io/ (decode tokens for debugging)

---

**Status**: Ready for Testing ✅
**Next Step**: Configure Firebase credentials and start testing
