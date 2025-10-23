# Cost Breakdown Pie Chart - Usage Guide

## Overview

The `CostBreakdownPieChart` component displays an interactive pie chart showing the complete cost breakdown for imports, including:

- Base cost of goods
- Each individual tariff applied
- Each agreement (override, surcharge, multiplier)

## Location

`src/components/CostBreakdownPieChart.tsx`

## Props

```typescript
interface CostBreakdownPieChartProps {
  baseCost: number; // The base cost of goods (quantity * unit cost)
  quantity: number; // Number of units
  tariffData: TariffData[]; // Array of tariffs from your state
  agreementsData: Agreement[]; // Array of agreements from your state
  importerCountry?: string; // Optional: Name of importing country
  exporterCountry?: string; // Optional: Name of exporting country
}
```

## Integration in App.tsx

### 1. Add Import (at the top with other imports)

```typescript
import { CostBreakdownPieChart } from "./components/CostBreakdownPieChart";
```

### 2. Insert Component in Results Section

Find the "Calculation Results" section (around line 980-1320) and add the pie chart.

**Recommended placement:** After the "Applied Agreements Summary Table" and before the calculation details.

```typescript
{
  /* After the agreements table, around line 1090 */
}

{
  /* Cost Breakdown Pie Chart */
}
{
  calculatedQuantity && calculatedCost && (
    <div className="mb-4">
      <CostBreakdownPieChart
        baseCost={Number(calculatedQuantity) * Number(calculatedCost)}
        quantity={Number(calculatedQuantity)}
        tariffData={tariffData}
        agreementsData={agreementsData}
        importerCountry={calculatedImportingCountry}
        exporterCountry={calculatedExportingCountry}
      />
    </div>
  );
}

{
  /* Then continue with your calculation details */
}
```

## Example Integration

Here's a complete example showing where to place it:

```typescript
// Around line 1090 in App.tsx, after agreements table
{
  agreementsData.length > 0 && (
    <div className="mb-4">{/* ... existing agreements table code ... */}</div>
  );
}

{
  /* NEW: Add Cost Breakdown Pie Chart here */
}
{
  calculatedQuantity && calculatedCost && (
    <div className="mb-4">
      <CostBreakdownPieChart
        baseCost={Number(calculatedQuantity) * Number(calculatedCost)}
        quantity={Number(calculatedQuantity)}
        tariffData={tariffData}
        agreementsData={agreementsData}
        importerCountry={calculatedImportingCountry}
        exporterCountry={calculatedExportingCountry}
      />
    </div>
  );
}

{
  /* Existing calculation details */
}
{
  calculatedProduct && (
    <div className="text-gray-700 space-y-1">
      {/* ... existing product display ... */}
    </div>
  );
}
```

## Features

### Automatic Calculations

- ✅ Automatically calculates each tariff amount using `tariffService.calculateTariffAmount()`
- ✅ Handles all tariff types: ad_valorem, specific, compound
- ✅ Applies agreement logic: override, surcharge, multiplier
- ✅ Shows total cost in the center of the donut chart

### Visual Design

- 🎨 Color-coded segments (uses Tailwind chart colors)
- 📊 Donut chart with center label showing total
- 🖱️ Interactive tooltips on hover
- 📱 Responsive design

### Empty State

Shows a helpful message when:

- No cost data is available
- User hasn't calculated yet

## Chart Breakdown

The pie chart will show:

1. **Base Cost** (chart-1 color - blue)

   - The cost of goods before any tariffs/agreements
   - Calculated as: `quantity × unit_cost`

2. **Each Tariff** (chart-2 through chart-5 colors - rotating)

   - One segment per tariff
   - Label includes tariff description
   - Amount calculated based on tariff type

3. **Agreements** (chart colors - rotating)
   - **Override**: Replaces all tariffs with single percentage
   - **Surcharge**: Additional percentage of base cost
   - **Multiplier**: Multiplies the total tariff amount

## Footer Information

The chart footer displays:

- Number of tariffs and agreements applied
- Base cost amount
- Additional cost (tariffs + agreements)

## Example Output

For a calculation with:

- Base Cost: $10,000
- 2 tariffs: $500 (5%) and $300 (3%)
- 1 surcharge agreement: $200 (2%)

The chart will show:

```
┌─────────────────────────────┐
│   Cost Breakdown            │
│   USA → China               │
├─────────────────────────────┤
│                             │
│        $11,000              │ (center label)
│       Total Cost            │
│                             │
├─────────────────────────────┤
│ 2 tariffs + 1 agreement     │
│ Base: $10,000 • Additional: │
│ $1,000                      │
└─────────────────────────────┘
```

## Styling

The component uses:

- Shadcn Card components for container
- Recharts for visualization
- Tailwind CSS for styling
- CSS variables for chart colors (`--chart-1` through `--chart-5`)

## Troubleshooting

### Chart not showing?

Check that:

1. `calculatedQuantity` and `calculatedCost` have values
2. You've imported the component correctly
3. The tariffService is available

### Colors not appearing?

Ensure your Chart.tsx component defines the CSS chart color variables.

### Data not accurate?

The component relies on:

- `tariffService.calculateTariffAmount()` for tariff calculations
- The `originalData` property in your `tariffData` array
- Proper agreement types: 'override', 'surcharge', 'multiplier'

## Dependencies

The component requires these to be installed (already in your project):

- recharts
- @/components/ui/Card
- @/components/ui/Chart
- @/lib/tariffService
- @/types (TariffData, Agreement)
