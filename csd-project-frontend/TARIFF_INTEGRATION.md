# Tariff Microservice Integration

This document explains how the frontend connects to the tariff microservice for retrieving tariff data.

## Overview

The frontend now integrates with the tariff microservice to fetch real tariff data based on HS codes. When users click "Calculate", the system will:

1. Extract the HS code from the user's input (either from product selection or direct HS code entry)
2. Make API calls to the tariff microservice
3. Display the retrieved tariff data in the calculation results
4. Use the tariff data for accurate tariff amount calculations

## Setup

### Environment Configuration

Make sure your `.env.local` file contains the tariff service URL:

```bash
VITE_TARIFF_API_URL=http://localhost:5004
```

### Running the Services

1. **Start the Tariff Microservice**:

   ```bash
   cd tariff
   ./mvnw spring-boot:run
   ```

   The service will run on `http://localhost:5004`

2. **Start the Frontend**:
   ```bash
   cd csd-project-frontend
   npm run dev
   ```

## Features

### 1. HS Code Input Mode

Users can now toggle to "HS Code Input" mode to enter tariff codes directly:

- Toggle button in the ProductAutocomplete component
- Real-time validation of HS code format (4-10 digits)
- Visual feedback with checkmarks/error icons

### 2. Tariff API Integration

The `tariffService.js` provides methods to:

- `getTariffsByHsCode(hsCode)` - Get all tariffs for a specific HS code
- `getTariffsByCombo(hsCode, importer, exporter)` - Get tariffs for specific country combination
- `getEffectiveTariff(hsCode, importer, exporter, date)` - Get tariff effective on a specific date
- `calculateTariffAmount(tariff, goodsValue)` - Calculate tariff amount with business logic
- `formatTariffForDisplay(tariff)` - Format tariff data for UI display

### 3. Enhanced Calculation Flow

When users click "Calculate":

1. **HS Code Extraction**:

   - If using HS code input mode, use the entered code directly
   - If using product mode, the system will prompt for HS code input (product-to-HS mapping not implemented yet)

2. **API Call Strategy**:

   - If countries are selected: Call `/api/tariffs?hs_code={code}&importer={country}&exporter={country}`
   - If only HS code: Call `/api/tariffs/by-hs/{code}`

3. **Data Transformation**:
   - Convert API response to UI-compatible format
   - Apply tariff calculation logic (ad valorem, specific, compound)
   - Handle min/max tariff amounts

### 4. Tariff Calculation Logic

The system supports different tariff types:

- **Ad Valorem**: Percentage-based (`goodsValue * rate%`)
- **Specific**: Fixed amount per unit
- **Compound**: Combination of ad valorem and specific
- **Min/Max Caps**: Applied automatically when specified

## API Endpoints Used

### Tariff Microservice (Port 5004)

- `GET /api/tariffs/by-hs/{hsCode}` - Get all tariffs for HS code
- `GET /api/tariffs?hs_code={}&importer={}&exporter={}` - Get specific tariffs
- `GET /api/tariffs/effective?hs_code={}&importer={}&exporter={}&date={}` - Get effective tariff
- `POST /api/tariffs/effective/by-names` - Get effective tariff by names

## Testing

### Manual Testing

1. **Using HS Code Input**:

   - Toggle to "Enter HS Code" mode
   - Enter a valid HS code (e.g., "010121")
   - Fill in quantity and cost
   - Click Calculate

2. **Using Demo Component**:
   - Import and use the `TariffDemo` component
   - Test various HS codes
   - Verify API responses

### Sample HS Codes for Testing

Based on the tariff service seed data (`V2__seed_tariff_sample.sql`):

- `010121` - Live horses
- `010129` - Other live horses
- `020130` - Fresh or chilled meat of bovine animals

## Error Handling

The integration handles several error scenarios:

1. **Network Errors**: Shows user-friendly error messages
2. **No Tariffs Found**: Displays appropriate message
3. **Invalid HS Codes**: Real-time validation feedback
4. **API Service Down**: Graceful degradation with error notifications

## Future Enhancements

1. **Product-to-HS Mapping**: Integrate with product service to automatically get HS codes
2. **Caching**: Add client-side caching for frequently requested tariffs
3. **Batch Requests**: Support multiple HS code lookups
4. **Advanced Filters**: Filter by date ranges, countries, tariff types

## Development Notes

- The integration maintains backward compatibility with existing mock data
- All tariff calculations use the business logic from `tariffService.js`
- Error states are handled gracefully without breaking the UI
- The component design supports both manual and automated HS code input

## Troubleshooting

### Common Issues

1. **"Failed to fetch tariffs"**:

   - Check if tariff service is running on port 5004
   - Verify network connectivity
   - Check browser console for detailed errors

2. **"HS code lookup for product names not implemented"**:

   - Use HS code input mode instead
   - Or implement product service integration

3. **CORS Errors**:
   - Ensure tariff service allows frontend origin
   - Check if both services are running on expected ports

### Debug Tips

- Enable browser dev tools to monitor network requests
- Check the tariff service logs for API call details
- Use the TariffDemo component for isolated testing
