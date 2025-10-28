# Forecast Prediction Integration - Summary

## Overview

The forecast microservice has been successfully integrated into the frontend with a new workflow: **Predict Future Tariffs After Calculation**.

## How It Works

### 1. User Flow

1. User performs a **normal calculation** (selects product, countries, quantity, cost, date)
2. Clicks **"Calculate"** to see current tariff results
3. After seeing current results, a new **"🔮 Predict Future Tariff"** button appears
4. Clicking this button calls the forecast MS to predict future tariff rates
5. A **new card** appears below showing predicted results with the same format (pie chart, agreements, cost breakdown)

### 2. Tariff Mode Dropdown

- **Removed** the "Predict (Forecast)" option from dropdown
- Dropdown now has **only 2 modes**:
  - 🔍 **Normal (Lookup)** - Standard database lookup
  - ✏️ **Manual Entry** - User enters tariff rate directly

### 3. API Integration

#### forecastService.ts

Added new method `getPredictedTariff()`:

```typescript
async getPredictedTariff(
  productName: string,
  importCountry: string,
  exportCountry: string,
  horizon: number = 1
): Promise<number>
```

**Endpoint Called**: `POST /forecast/predict`

**Request Body**:

```json
{
  "product_name": "smartphones",
  "import_country": "US",
  "export_country": "CN",
  "horizon": 1
}
```

**Response**:

```json
{
  "code": 200,
  "predicted_tariff": 15.75,
  "import_country": "US",
  "export_country": "CN"
}
```

### 4. State Management

#### New State Variables

```typescript
const [predictedResults, setPredictedResults] = useState<any>(null);
const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
const [predictionError, setPredictionError] = useState<string>("");
```

#### Removed State Variables

- ❌ `predictHistoricalRates` - No longer needed
- ❌ `predictHorizon` - Fixed to 1 month
- ❌ `predictedTariff` - Replaced with `predictedResults`
- ❌ `isPredicting` - Replaced with `isLoadingPrediction`
- ❌ `predictError` - Replaced with `predictionError`

### 5. Key Functions

#### handlePredictCalculation()

Main function that:

1. Validates that a calculation has been completed
2. Calls `forecastService.getPredictedTariff()` with product name and countries
3. Fetches tariff data using `tariffService.getEffectiveTariffByNames()`
4. Fetches agreements using `agreementService.getActiveAgreements()`
5. Calculates costs with predicted ad valorem rate
6. Stores results in `predictedResults` state
7. Auto-scrolls to predicted results section

### 6. UI Components

#### Predict Button

- **Location**: Appears after "Save Calculation" button
- **Condition**: Only shows when `calculatedProduct`, `calculatedImportingCountry`, and `calculatedExportingCountry` exist
- **States**:
  - Normal: "🔮 Predict Future Tariff"
  - Loading: "🔄 Predicting..."
  - Disabled when: `isLoadingPrediction` or missing data

#### Predicted Results Card

- **ID**: `predicted-results` (for auto-scroll)
- **Theme**: Blue gradient (`from-blue-50 to-indigo-50`)
- **Layout**: Same 2-column format as current calculation
  - **Left**: Pie chart showing cost breakdown
  - **Right**: Details (tariff rate, agreements, tariff lines, cost breakdown, comparison)

#### Special Features in Predicted Results

1. **Predicted Tariff Rate Card** - Prominently displays predicted rate
2. **Agreements Table** - Shows active agreements with proper formatting
3. **Tariff Information Table** - Shows HS codes and descriptions
4. **Cost Breakdown** - Shows base cost, predicted tariff, and total
5. **Comparison Section** - Compares current vs. predicted rates
   - Shows increase/decrease with color coding (red for higher, green for lower)

### 7. Forecast MS Requirements

The forecast service expects:

- **product_name**: Resolved via Product service to HS code
- **import_country**: Country code (e.g., "US", "SG")
- **export_country**: Country code (e.g., "CN", "SG")
- **horizon**: Number of months ahead (default: 1)

The ML model:

- Uses historical tariff rates from Tariff service
- Considers country relationships from Country/Agreement services
- Returns ad valorem percentage rate

### 8. Error Handling

Errors are displayed in:

1. **Prediction Error Banner** - Red alert if prediction fails
2. **Console Logs** - For debugging
3. **User-Friendly Messages**:
   - "Please run a calculation first before predicting"
   - "Missing country information from calculation"
   - "Invalid country selection"
   - "Could not fetch tariff data for prediction"
   - Custom error from forecast service

### 9. Type Safety

All components use proper TypeScript interfaces:

- `Agreement` - From `types/index.ts`
- `TariffData` - From `types/index.ts`
- Uses existing types, no new interfaces needed

### 10. Testing Checklist

- [ ] Start forecast service on port 5007
- [ ] Perform normal calculation with product name
- [ ] Click "Predict Future Tariff" button
- [ ] Verify prediction appears with:
  - [ ] Predicted tariff rate
  - [ ] Pie chart
  - [ ] Agreements table
  - [ ] Tariff lines table
  - [ ] Cost breakdown
  - [ ] Comparison with current rate
- [ ] Test error scenarios:
  - [ ] Forecast service down
  - [ ] Invalid product name
  - [ ] No historical data available
- [ ] Verify auto-scroll to predicted results
- [ ] Test with different countries and products

### 11. File Changes Summary

#### Modified Files:

1. **`csd-project-frontend/src/App.tsx`**

   - Removed predict mode from dropdown
   - Cleaned up predict-related state
   - Added `handlePredictCalculation()` function
   - Added "Predict" button after calculation
   - Added predicted results card section

2. **`csd-project-frontend/src/lib/forecastService.ts`**
   - Added `getPredictedTariff()` method
   - Uses product_name instead of last_rates

#### No Changes Needed:

- ✓ `tariffService.ts` - Already has required methods
- ✓ `agreementService.ts` - Already has required methods
- ✓ `types/index.ts` - Existing types are sufficient
- ✓ `.env.local` - VITE_FORECAST_API_URL already configured

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. User performs normal calculation                   │ │
│  │  2. Clicks "Calculate" → sees current results          │ │
│  │  3. Clicks "Predict Future Tariff" button              │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  handlePredictCalculation()                            │ │
│  │  - Gets product, importer, exporter from calculation   │ │
│  │  - Calls forecastService.getPredictedTariff()          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              forecastService.getPredictedTariff()            │
│  POST /forecast/predict                                      │
│  {                                                           │
│    "product_name": "smartphones",                            │
│    "import_country": "US",                                   │
│    "export_country": "CN",                                   │
│    "horizon": 1                                              │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                 Forecast MS (Flask + XGBoost)                │
│  1. Resolves product_name → HS code (via Product MS)        │
│  2. Fetches historical rates (via Tariff MS)                │
│  3. Fetches country relationship (via Country/Agreement MS) │
│  4. Runs ML prediction with XGBoost                          │
│  5. Returns predicted_tariff percentage                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  handlePredictCalculation() continued                  │ │
│  │  - Receives predicted tariff rate (e.g., 15.75%)       │ │
│  │  - Fetches tariff data with predicted rate             │ │
│  │  - Fetches agreements                                  │ │
│  │  - Calculates total cost with predicted tariff         │ │
│  │  - Displays predicted results card                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Benefits

1. **Non-Intrusive**: Prediction is optional, doesn't interfere with normal workflow
2. **Clean Separation**: Normal calculation and prediction are clearly separated
3. **Product-Based**: Uses product name (user-friendly) instead of requiring historical rates
4. **Consistent UI**: Predicted results use same layout as current results
5. **Easy Comparison**: Shows current vs. predicted rates side-by-side
6. **Type-Safe**: Full TypeScript support with existing interfaces

## Next Steps

1. Test with real forecast service
2. Verify ML predictions are accurate
3. Consider adding:
   - Option to save predicted calculations
   - Trend visualization (current → predicted)
   - Confidence intervals from ML model
   - Multi-month predictions (horizon > 1)
