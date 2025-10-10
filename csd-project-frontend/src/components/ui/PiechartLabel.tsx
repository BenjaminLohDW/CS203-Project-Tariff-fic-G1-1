import {LabelList, Pie, PieChart} from 'recharts';

import {Card, CardContent, CardHeader, CardTitle} from './Card';
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from './Chart';

const chartData = [
  {browser: 'chrome', visitors: 275, fill: 'var(--color-chrome)'},
  {browser: 'safari', visitors: 200, fill: 'var(--color-safari)'},
  {browser: 'firefox', visitors: 187, fill: 'var(--color-firefox)'},
  {browser: 'edge', visitors: 173, fill: 'var(--color-edge)'},
  {browser: 'other', visitors: 90, fill: 'var(--color-other)'},
];

const chartConfig = {
  visitors: {
    label: 'Visitors',
  },
  chrome: {
    label: 'PDP',
    color: 'var(--chart-1)',
  },
  safari: {
    label: 'PEP',
    color: 'var(--chart-2)',
  },
  firefox: {
    label: 'General - Remote Connectivity',
    color: 'var(--chart-3)',
  },
  edge: {
    label: 'EPP',
    color: 'var(--chart-4)',
  },
  other: {
    label: 'Other',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig;

export function PiechartLabel() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-lg">ZTA Technologies within UBS</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-text]:fill-background mx-auto aspect-square max-h-[400px]"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="visitors" hideLabel />} />
            <Pie data={chartData} dataKey="visitors">
              <LabelList
                dataKey="browser"
                className="fill-background"
                stroke="none"
                fontSize={12}
                formatter={(value: keyof typeof chartConfig) => chartConfig[value]?.label}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default PiechartLabel;
