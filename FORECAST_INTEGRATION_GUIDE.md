# Forecast MS Integration Guide for App.tsx

## Step 1: Replace all `isManualTariff` references

Find and replace these occurrences in App.tsx:

### Line 768 - Calculation logic

**FROM:**

```typescript
if (isManualTariff) {
```

**TO:**

```typescript
if (tariffMode === 'manual' || tariffMode === 'predict') {
```

### Line 861 - Save calculation mode

**FROM:**

```typescript
mode: isManualTariff ? 'Manual Tariff' : 'Standard',
```

**TO:**

```typescript
mode: tariffMode === 'manual' ? 'Manual Tariff' : tariffMode === 'predict' ? 'Predict Tariff' : 'Standard',
```

### Line 1055 - Load from history

**FROM:**

```typescript
setIsManualTariff(isManualMode);
```

**TO:**

```typescript
setTariffMode(
  isManualMode
    ? "manual"
    : calculationData.mode === "Predict Tariff"
    ? "predict"
    : "normal"
);
```

### Line 1308 - Button validation

**FROM:**

```typescript
(isManualTariff && !tariffRate) ||
```

**TO:**

```typescript
(tariffMode === 'manual' && !tariffRate) ||
(tariffMode === 'predict' && predictedTariff === null) ||
```

### Line 1310 - Button validation continued

**FROM:**

```typescript
(!isManualTariff && (
```

**TO:**

```typescript
(tariffMode === 'normal' && (
```

### Line 1339 & Line 1348 - UI rendering (REPLACE ENTIRE SECTION)

This is the checkbox section - see Step 2 for complete replacement

### Line 2027 & 2029 - History display validation

**FROM:**

```typescript
(isManualTariff && !calculatedTariffRate) ||
  // ...
  (!isManualTariff &&
    (!calculatedProduct ||
      !calculatedImportingCountry ||
      !calculatedExportingCountry));
```

**TO:**

```typescript
(tariffMode === "manual" && !calculatedTariffRate) ||
  (tariffMode === "predict" && predictedTariff === null) ||
  (tariffMode === "normal" &&
    (!calculatedProduct ||
      !calculatedImportingCountry ||
      !calculatedExportingCountry));
```

---

## Step 2: Add Forecast Prediction Handler

Add this function after `handleTariffModeChange` (around line 255):

```typescript
const handlePredictTariff = async () => {
  setIsPredicting(true);
  setPredictError("");
  setPredictedTariff(null);

  try {
    // Validate inputs
    if (!selectedImportingCountry || !selectedExportingCountry) {
      setPredictError("Please select both importing and exporting countries");
      return;
    }

    if (!predictHistoricalRates) {
      setPredictError("Please enter historical tariff rates");
      return;
    }

    // Parse historical rates
    const ratesArray = predictHistoricalRates
      .split(",")
      .map((r) => parseFloat(r.trim()))
      .filter((r) => !isNaN(r));

    if (ratesArray.length < 2) {
      setPredictError(
        "Please enter at least 2 historical tariff rates (comma-separated)"
      );
      return;
    }

    // Get country codes
    const importerCode = getCountryCode(selectedImportingCountry);
    const exporterCode = getCountryCode(selectedExportingCountry);

    if (!importerCode || !exporterCode) {
      setPredictError("Invalid country selection");
      return;
    }

    // Call forecast service
    const result = await forecastService.predictTariff(
      importerCode,
      exporterCode,
      ratesArray,
      parseInt(predictHorizon) || 1
    );

    setPredictedTariff(result.predicted_tariff);
    // Also set it as the tariff rate to be used in calculations
    setTariffRate(result.predicted_tariff.toString());
  } catch (error: any) {
    console.error("Forecast prediction error:", error);
    setPredictError(
      error.message || "Failed to predict tariff. Please try again."
    );
  } finally {
    setIsPredicting(false);
  }
};
```

---

## Step 3: Replace Tariff Configuration Section

Find the "Tariff Configuration" Card section (around lines 1330-1450) and replace it with:

```typescript
{
  /* Second Container - Tariff Configuration */
}
<Card className="flex-1 bg-purple-50 border-purple-200">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="flex items-center text-lg text-purple-800">
        <span className="text-purple-600 mr-2">⚙️</span>
        Tariff Configuration
      </CardTitle>
      {/* Tariff Mode Dropdown */}
      <div className="w-48">
        <Select value={tariffMode} onValueChange={handleTariffModeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">🔍 Normal (Lookup)</SelectItem>
            <SelectItem value="manual">✏️ Manual Entry</SelectItem>
            <SelectItem value="predict">📊 Predict (Forecast)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </CardHeader>
  <CardContent className="flex flex-col gap-4">
    {tariffMode === "manual" ? (
      // Manual tariff mode - only show tariff rate field
      <div className="flex flex-col items-start text-left w-full">
        <label htmlFor="tariff-rate" className="font-medium mb-2">
          Tariff rate (%):
        </label>
        <input
          type="number"
          id="tariff-rate"
          value={tariffRate}
          onChange={handleTariffRateChange}
          placeholder="Enter tariff rate (0-100)"
          min="0"
          max="100"
          step="0.01"
          className="w-full p-3 text-base border-2 border-gray-300 rounded-lg bg-white text-gray-900 transition-colors hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder-gray-500"
        />
        <p className="text-sm text-gray-500 mt-1">
          Enter the tariff rate percentage directly
        </p>
      </div>
    ) : tariffMode === "predict" ? (
      // Predict mode - show forecast-specific fields
      <div className="flex flex-col gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 font-medium mb-1">
            📊 Tariff Prediction Mode
          </p>
          <p className="text-xs text-blue-600">
            Uses ML to forecast future tariffs based on historical data
          </p>
        </div>

        <div className="flex flex-col items-start text-left w-full">
          <label htmlFor="historical-rates" className="font-medium mb-2">
            Historical Tariff Rates (comma-separated):
          </label>
          <input
            type="text"
            id="historical-rates"
            value={predictHistoricalRates}
            onChange={(e) => setPredictHistoricalRates(e.target.value)}
            placeholder="e.g., 15.2, 15.5, 15.8"
            className="w-full p-3 text-base border-2 border-gray-300 rounded-lg bg-white text-gray-900 transition-colors hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder-gray-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter at least 2 recent monthly tariff rates
          </p>
        </div>

        <div className="flex flex-col items-start text-left w-full">
          <label htmlFor="predict-horizon" className="font-medium mb-2">
            Forecast Horizon (months):
          </label>
          <input
            type="number"
            id="predict-horizon"
            value={predictHorizon}
            onChange={(e) => setPredictHorizon(e.target.value)}
            min="1"
            max="12"
            className="w-full p-3 text-base border-2 border-gray-300 rounded-lg bg-white text-gray-900 transition-colors hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          <p className="text-sm text-gray-500 mt-1">
            How many months ahead to predict (currently only supports 1)
          </p>
        </div>

        <Button
          onClick={handlePredictTariff}
          disabled={
            isPredicting ||
            !selectedImportingCountry ||
            !selectedExportingCountry ||
            !predictHistoricalRates
          }
          className="w-full"
        >
          {isPredicting ? "🔄 Predicting..." : "🎯 Predict Tariff"}
        </Button>

        {predictError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800 font-medium">❌ Error</p>
            <p className="text-sm text-red-600">{predictError}</p>
          </div>
        )}

        {predictedTariff !== null && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 font-medium mb-2">
              ✅ Prediction Successful
            </p>
            <p className="text-2xl font-bold text-green-700">
              {predictedTariff.toFixed(2)}%
            </p>
            <p className="text-xs text-green-600 mt-2">
              Predicted tariff rate for {selectedImportingCountry} importing
              from {selectedExportingCountry}
            </p>
          </div>
        )}
      </div>
    ) : (
      // Normal mode - show all standard fields (product, countries, etc.)
      <>
        <div className="flex flex-col items-start text-left w-full">
          <label htmlFor="product-type">Product Type:</label>
          <ProductAutocomplete
            value={selectedProduct}
            onChange={handleProductChange}
            placeholder="Search and select a product..."
            disabled={isLoadingCountries}
            className="w-full"
          />
        </div>

        <div className="flex flex-col items-start text-left w-full">
          <label htmlFor="importing-country">Importing Country:</label>
          <Popover
            open={importingCountryOpen}
            onOpenChange={setImportingCountryOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={importingCountryOpen}
                className="w-full justify-between"
                disabled={isLoadingCountries}
              >
                {selectedImportingCountry
                  ? countries.find(
                      (country) => country.name === selectedImportingCountry
                    )?.name
                  : isLoadingCountries
                  ? "Loading countries..."
                  : "Select importing country..."}
                <ChevronsUpDown className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search country..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandGroup>
                    {!isLoadingCountries &&
                      countries.map((country) => (
                        <CommandItem
                          key={country.id}
                          value={country.name}
                          onSelect={(currentValue) => {
                            handleImportingCountryChange(
                              currentValue === selectedImportingCountry
                                ? ""
                                : currentValue
                            );
                            setImportingCountryOpen(false);
                          }}
                        >
                          {country.name}
                          <Check
                            className={cn(
                              "ml-auto",
                              selectedImportingCountry === country.name
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Rest of normal mode fields continue here... */}
        {/* Keep the existing exporting country, comparison mode, etc. */}
      </>
    )}
  </CardContent>
</Card>;
```

---

## Summary of Changes:

1. ✅ Replaced `isManualTariff` boolean with `tariffMode` enum ('normal' | 'manual' | 'predict')
2. ✅ Added forecast-specific state variables
3. ✅ Added `handleTariffModeChange` to switch between modes
4. ✅ Added `handlePredictTariff` to call forecast service
5. ✅ Updated UI to use Select dropdown instead of checkbox
6. ✅ Added conditional rendering for 3 different modes
7. ✅ Integrated forecast service to predict tariffs

## Testing Steps:

1. Select "Predict (Forecast)" mode from dropdown
2. Select importing and exporting countries
3. Enter historical rates (e.g., `15.2, 15.5, 15.8`)
4. Click "Predict Tariff" button
5. Predicted rate should appear and auto-populate the tariff field
6. Click "Calculate Tariff" to use the predicted rate in calculations

## Notes:

- The predict mode requires the forecast service to be running on port 5007
- Historical rates must be comma-separated numbers (minimum 2 values)
- The predicted tariff is automatically used in the calculation
- Country relationship scores are handled by the forecast service internally
