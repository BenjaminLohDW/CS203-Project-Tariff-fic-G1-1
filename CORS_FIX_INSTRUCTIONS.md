# CORS Error Fix Instructions

## Problem

You're getting a CORS error when your frontend (localhost:5173) tries to call your tariff service (localhost:5004).

## Solution

I've added CORS configuration in two ways. You need to restart your Spring Boot application for the changes to take effect.

## Files Modified

### 1. Created: `CorsConfig.java`

Location: `tariff/src/main/java/com/cs203g1t1/tariff/config/CorsConfig.java`

This file configures CORS globally for all API endpoints.

### 2. Modified: `TariffController.java`

Added `@CrossOrigin` annotation to allow requests from your frontend.

## Steps to Fix

### Step 1: Restart Your Tariff Service

```bash
# Stop your current tariff service (Ctrl+C)
cd tariff
./mvnw spring-boot:run
```

### Step 2: Test the Integration

1. Make sure your frontend is running on `http://localhost:5173`
2. Go to your frontend
3. Switch to "Enter HS Code" mode
4. Enter an HS code like: `85171300`
5. Fill in quantity and cost
6. Select countries: Singapore (importer) and China (exporter)
7. Click "Calculate"

### Step 3: Verify CORS Headers (Optional)

Open browser dev tools (F12) → Network tab → Make the API call
You should see these headers in the response:

- `Access-Control-Allow-Origin: http://localhost:5173`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH`
- `Access-Control-Allow-Headers: *`

## What the CORS Configuration Does

**Allows requests from:**

- `http://localhost:5173` (your Vite dev server)
- `http://localhost:3000` (alternative React dev server)
- `http://127.0.0.1:5173` (alternative localhost)
- `http://127.0.0.1:3000` (alternative localhost)

**Allows HTTP methods:**

- GET, POST, PUT, DELETE, OPTIONS, PATCH

**Allows all headers and credentials**

## Troubleshooting

### If CORS error persists:

1. **Check the tariff service logs** - Look for startup messages about CORS configuration
2. **Verify the service restarted** - Make sure you stopped and restarted the Spring Boot app
3. **Check the exact URL** - Make sure the frontend is calling `http://localhost:5004/api/tariffs/...`
4. **Browser cache** - Try hard refresh (Ctrl+F5) or open in incognito mode

### Alternative Quick Fix (if still having issues):

Add this annotation to individual controller methods:

```java
@CrossOrigin(origins = "http://localhost:5173")
@GetMapping("/by-hs/{hsCode}")
public List<TariffResponse> listByHs(@PathVariable String hsCode) {
    // ... existing code
}
```

### Check if Service is Running:

Test this URL in your browser: http://localhost:5004/api/tariffs/all
You should see a JSON response (even if empty).

## Expected Result

After restarting the tariff service, your frontend should be able to:

1. Make API calls to the tariff service without CORS errors
2. Display real tariff data in the calculation results
3. Show proper tariff calculations based on the retrieved data

The error message should disappear and you should see tariff data loading in your frontend!
