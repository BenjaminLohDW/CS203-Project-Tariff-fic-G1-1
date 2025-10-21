import * as React from "react"
import { Label, Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/Chart"
import { TariffData, Agreement } from "@/types"
import tariffService from "@/lib/tariffService"

interface CostBreakdownPieChartProps {
  baseCost: number
  quantity: number
  tariffData: TariffData[]
  agreementsData: Agreement[]
  importerCountry?: string
  exporterCountry?: string
}

export function CostBreakdownPieChart({
  baseCost,
  quantity,
  tariffData,
  agreementsData,
  importerCountry = "Importer",
  exporterCountry = "Exporter"
}: CostBreakdownPieChartProps) {
  const chartData = React.useMemo(() => {
    const data: Array<{ name: string; value: number; fill: string }> = []
    
    // Base cost
    data.push({
      name: "Base Cost",
      value: baseCost,
      fill: "var(--chart-1)"
    })
    
    // Add each tariff
    tariffData.forEach((tariff, index) => {
      const result = tariffService.calculateTariffAmount(
        tariff.originalData,
        baseCost,
        quantity
      )
      
      if (result.tariffAmount > 0) {
        const tariffName = tariff["Tariff Description"] || 
                          `${tariff["Tariff Type"]} Tariff`
        data.push({
          name: tariffName,
          value: result.tariffAmount,
          fill: `var(--chart-${(index % 4) + 2})` // Use chart-2 through chart-5
        })
      }
    })
    
    // Add agreements
    const overrideAgreement = agreementsData.find(a => a.kind === 'override')
    
    if (overrideAgreement) {
      // Override: add only the override amount
      const overrideAmount = baseCost * overrideAgreement.value
      data.push({
        name: `Agreement Override (${exporterCountry} ⇄ ${importerCountry})`,
        value: overrideAmount,
        fill: "var(--chart-5)"
      })
    } else {
      // Non-override agreements
      agreementsData.forEach((agreement, index) => {
        let agreementAmount = 0
        let agreementName = ""
        
        if (agreement.kind === 'surcharge') {
          agreementAmount = baseCost * agreement.value
          agreementName = `Agreement Surcharge (${(agreement.value * 100).toFixed(1)}%)`
        } else if (agreement.kind === 'multiplier') {
          // Calculate total tariffs for multiplier
          const totalTariffs = tariffData.reduce((sum, tariff) => {
            const result = tariffService.calculateTariffAmount(
              tariff.originalData,
              baseCost,
              quantity
            )
            return sum + result.tariffAmount
          }, 0)
          agreementAmount = totalTariffs * (agreement.value - 1)
          agreementName = `Agreement Multiplier (×${agreement.value})`
        }
        
        if (agreementAmount !== 0) {
          data.push({
            name: agreementName,
            value: Math.abs(agreementAmount), // Use absolute value for chart
            fill: `var(--chart-${((tariffData.length + index) % 4) + 2})`
          })
        }
      })
    }
    
    return data
  }, [baseCost, quantity, tariffData, agreementsData, importerCountry, exporterCountry])

  const totalCost = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0)
  }, [chartData])

  const chartConfig: ChartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      value: {
        label: "Amount",
      },
    }
    
    chartData.forEach((item) => {
      config[item.name] = {
        label: item.name,
        color: item.fill.replace('var(', '').replace(')', ''),
      }
    })
    
    return config
  }, [chartData])

  // If no data, show message
  if (chartData.length === 0 || totalCost === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Cost Breakdown</CardTitle>
          <CardDescription>No cost data available</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0 flex items-center justify-center min-h-[250px]">
          <p className="text-muted-foreground text-sm">
            Enter cost details and calculate to see the breakdown
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Cost Breakdown</CardTitle>
        <CardDescription>
          {importerCountry && exporterCountry 
            ? `${exporterCountry} → ${importerCountry}` 
            : "Importer Cost Analysis"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="aspect-square w-full max-h-[500px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          ${totalCost.toLocaleString('en-US', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Total Cost
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          <span>
            {tariffData.length} tariff{tariffData.length !== 1 ? 's' : ''} 
            {agreementsData.length > 0 && ` + ${agreementsData.length} agreement${agreementsData.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="text-muted-foreground leading-none text-center">
          Base: ${baseCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
          {" • "}
          Additional: ${(totalCost - baseCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </CardFooter>
    </Card>
  )
}
