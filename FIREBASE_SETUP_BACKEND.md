# Firebase Setup for Backend

## Quick Start

You have **two options** to authenticate with Firebase:

---

## Option 1: Service Account Key (Recommended for Local Development)

### Step 1: Download Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the ⚙️ gear icon → **Project Settings**
4. Navigate to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the JSON file securely (e.g., `firebase-service-account.json`)

### Step 2: Set Environment Variable

**Windows (PowerShell):**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\firebase-service-account.json"
```

**Windows (Command Prompt):**
```cmd
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\firebase-service-account.json
```

**Linux/Mac:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/firebase-service-account.json"
```

### Step 3: Start the Backend

```bash
cd tariff
./mvnw spring-boot:run
```

---

## Option 2: Application Default Credentials (Production/Cloud)

This option works automatically in Google Cloud environments (Cloud Run, App Engine, etc.)

**For Local Development:**

1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Run:
   ```bash
   gcloud auth application-default login
   ```
3. Follow the browser login flow
4. Start the backend:
   ```bash
   cd tariff
   ./mvnw spring-boot:run
   ```

---

## Verify Firebase is Working

### Check Backend Logs

When the backend starts, you should see:

```
Firebase initialized with Application Default Credentials
```

OR

```
Firebase initialized with service account
```

### Test JWT Authentication

1. Login to your frontend application
2. Open browser console and get JWT token:
   ```javascript
   const token = await firebase.auth().currentUser.getIdToken();
   console.log(token);
   ```

3. Test API with cURL:
   ```bash
   curl -X GET http://localhost:5004/api/tariffs/all \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

4. You should get a 200 response with tariff data

---

## Troubleshooting

### Error: "Failed to initialize Firebase"

**Cause:** Cannot find credentials

**Solution:**
- Verify `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
- Check file path exists and is readable
- Make sure JSON file is valid

### Error: "Token verification failed"

**Cause:** Firebase project mismatch

**Solution:**
- Ensure service account key is from the correct Firebase project
- Verify frontend Firebase config matches backend service account
- Check Firebase project ID in both frontend and backend

### Error: 401 Unauthorized

**Cause:** Token invalid or expired

**Solutions:**
- Login again to get fresh token
- Check token format: should be `Bearer <long-token>`
- Verify user is logged in: `firebase.auth().currentUser`

---

## Docker Deployment

### Add to docker-compose.yml

```yaml
services:
  tariff:
    build: ./tariff
    ports:
      - "5004:5004"
    environment:
      - GOOGLE_APPLICATION_CREDENTIALS=/app/firebase-key.json
    volumes:
      - ./firebase-service-account.json:/app/firebase-key.json:ro
```

### OR Use Environment Variable

```yaml
services:
  tariff:
    build: ./tariff
    ports:
      - "5004:5004"
    environment:
      - FIREBASE_SERVICE_ACCOUNT_JSON=${FIREBASE_SERVICE_ACCOUNT_JSON}
```

Then set in `.env` file:
```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

---

## Next Steps

1. **Set up Firebase credentials** (choose Option 1 or 2)
2. **Start backend**: `./mvnw spring-boot:run` in `tariff` directory
3. **Test with frontend**: Login and try bulk upload
4. **Check logs**: Verify JWT verification succeeds

---

## Security Notes

⚠️ **NEVER commit service account keys to Git!**

Add to `.gitignore`:
```
firebase-service-account*.json
serviceAccountKey.json
*-firebase-adminsdk-*.json
```

✅ **For Production:**
- Use Google Cloud Secret Manager
- Use environment variables
- Rotate service account keys regularly
- Limit service account permissions
