# Dashboard Components

Components for displaying dashboard data, metrics, and visualizations.

## Overview

These components provide:
- KPI cards and metrics
- Charts and graphs
- Data tables and lists
- Real-time updates
- Summary widgets
- Interactive visualizations

## Component Categories

### Metrics & KPIs
- `metric-card.tsx` - Single metric display with trend
- `kpi-grid.tsx` - Grid of KPI cards
- `stat-widget.tsx` - Statistical widget
- `trend-indicator.tsx` - Up/down trend indicator

### Charts
- `line-chart.tsx` - Line chart for trends
- `bar-chart.tsx` - Bar chart for comparisons
- `pie-chart.tsx` - Pie chart for distributions
- `area-chart.tsx` - Area chart for cumulative data
- `heatmap.tsx` - Heatmap for risk/concentration

### Data Tables
- `positions-table.tsx` - Trading positions table
- `limits-table.tsx` - Position/market limits table
- `alerts-table.tsx` - Active alerts table
- `recent-trades.tsx` - Recent transactions

### Widgets
- `portfolio-summary.tsx` - Portfolio overview
- `risk-summary.tsx` - Risk metrics summary
- `market-overview.tsx` - Market data overview
- `notification-feed.tsx` - Recent notifications

## Usage Examples

### KPI Card
```typescript
import { MetricCard } from '@/components/dashboard/metric-card';

<MetricCard
  title="Total Position Value"
  value="$12.5M"
  trend={{ direction: 'up', percentage: 5.2 }}
  icon={<TrendingUpIcon />}
/>
```

### Chart Component
```typescript
import { LineChart } from '@/components/dashboard/line-chart';

<LineChart
  data={historicalData}
  xAxis="date"
  yAxis="value"
  title="Position Value Over Time"
  height={300}
/>
```

### KPI Grid
```typescript
import { KPIGrid } from '@/components/dashboard/kpi-grid';

<KPIGrid
  metrics={[
    { title: 'Total Positions', value: '45', trend: 'up' },
    { title: 'Active Alerts', value: '3', trend: 'down' },
    { title: 'Risk Score', value: '72', trend: 'neutral' },
    { title: 'Compliance', value: '98%', trend: 'up' }
  ]}
/>
```

## Chart Library

Charts use Recharts library:

```typescript
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export function TrendChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

## Real-Time Updates

Dashboard components can update in real-time:

```typescript
import { useDashboardData } from '@/hooks/use-dashboard-data';

export function LiveMetrics() {
  const { data, isLoading } = useDashboardData({
    refreshInterval: 30000 // Refresh every 30 seconds
  });

  return (
    <div>
      {isLoading ? <Skeleton /> : <MetricCard {...data} />}
    </div>
  );
}
```

## Responsive Design

All dashboard components are responsive:

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <MetricCard {...metric1} />
  <MetricCard {...metric2} />
  <MetricCard {...metric3} />
  <MetricCard {...metric4} />
</div>
```

## Data Formatting

Utility functions for formatting dashboard data:

```typescript
// Format currency
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Format percentage
export const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`;
};

// Format large numbers
export const formatNumber = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};
```

## Color Schemes

Consistent color schemes for data visualization:

```typescript
const colorScheme = {
  primary: '#3b82f6',     // Blue
  success: '#10b981',     // Green
  warning: '#f59e0b',     // Yellow
  danger: '#ef4444',      // Red
  neutral: '#6b7280'      // Gray
};

// Trend colors
const trendColors = {
  up: colorScheme.success,
  down: colorScheme.danger,
  neutral: colorScheme.neutral
};
```

## Loading States

Show loading states while fetching data:

```typescript
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardMetric({ isLoading, data }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  return <MetricCard {...data} />;
}
```

## Empty States

Handle empty data gracefully:

```typescript
export function PositionsTable({ positions }) {
  if (positions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No positions to display</p>
      </div>
    );
  }

  return (
    <Table>
      {/* Table content */}
    </Table>
  );
}
```

## Interactive Features

### Drill-Down
Allow users to drill into details:
```typescript
<MetricCard
  onClick={() => router.push('/detailed-view')}
  clickable
/>
```

### Filters
Add filtering capabilities:
```typescript
<DashboardFilters
  onFilterChange={setFilters}
  options={{
    dateRange: ['today', 'week', 'month', 'year'],
    commodity: ['All', 'Crude Oil', 'Natural Gas'],
    exchange: ['All', 'NYMEX', 'ICE']
  }}
/>
```

### Tooltips
Provide additional context:
```typescript
<MetricCard
  title="Risk Score"
  value="72"
  tooltip="Risk score is calculated based on position concentration, volatility, and exposure."
/>
```

## Performance

Optimize dashboard performance:

1. **Lazy Loading**: Load charts only when visible
2. **Memoization**: Memoize expensive calculations
3. **Virtual Scrolling**: For large tables
4. **Debouncing**: Debounce filter updates
5. **Caching**: Cache API responses

```typescript
import { useMemo } from 'react';

export function ExpensiveChart({ data }) {
  const processedData = useMemo(() => {
    return processData(data);
  }, [data]);

  return <Chart data={processedData} />;
}
```

## Accessibility

Ensure dashboard is accessible:

1. **ARIA Labels**: Add labels to interactive elements
2. **Keyboard Navigation**: Support keyboard shortcuts
3. **Screen Readers**: Provide text alternatives for charts
4. **Color Contrast**: Ensure sufficient contrast
5. **Focus Indicators**: Clear focus states

```typescript
<button
  aria-label="View detailed metrics"
  aria-describedby="metric-tooltip"
>
  <MetricCard {...data} />
</button>
```

## Best Practices

1. **Clarity**: Keep visualizations simple and clear
2. **Consistency**: Use consistent colors and layouts
3. **Context**: Provide context for metrics (trends, comparisons)
4. **Responsiveness**: Work on all screen sizes
5. **Performance**: Optimize for fast loading
6. **Interactivity**: Make dashboards interactive where appropriate
7. **Real-Time**: Update critical metrics in real-time
8. **Error Handling**: Handle errors gracefully
