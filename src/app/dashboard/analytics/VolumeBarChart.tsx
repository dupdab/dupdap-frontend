'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

import { formatUsd } from '@/lib/utils';

// Lazy-load recharts so the chart library is only pulled into the analytics
// route bundle when this chart actually renders, not on first dashboard visit.
const LineChart = dynamic(
  () => import('recharts').then((m) => m.LineChart),
  { ssr: false }
);
const Line = dynamic(() => import('recharts').then((m) => m.Line), {
  ssr: false,
});
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), {
  ssr: false,
});
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), {
  ssr: false,
});
const Legend = dynamic(() => import('recharts').then((m) => m.Legend), {
  ssr: false,
});
const ResponsiveContainer = dynamic(
  () => import('recharts').then((m) => m.ResponsiveContainer),
  { ssr: false }
);

interface BarDataPoint {
  name: string;
  amount: number;
  count?: number;
  previousAmount?: number;
  previousCount?: number;
}

interface Props {
  data: BarDataPoint[];
}

export default function VolumeBarChart({ data }: Props) {
  const [compare, setCompare] = useState(false);
  const hasPrevious = data.some(
    (d) => d.previousAmount !== undefined || d.previousCount !== undefined
  );

  return (
    <div>
      {hasPrevious && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 8,
          }}
        >
          <label
            style={{
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
            />
            Compare to previous period
          </label>
        </div>
      )}
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="volume"
            tick={{ fontSize: 12 }}
            tickFormatter={(v: number) => formatUsd(v)}
          />
          <YAxis
            yAxisId="count"
            orientation="right"
            tick={{ fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value: number, name: string) =>
              name.toLowerCase().includes('volume') ||
              name.toLowerCase().includes('amount')
                ? formatUsd(value)
                : value
            }
          />
          <Legend />
          <Line
            yAxisId="volume"
            type="monotone"
            dataKey="amount"
            name="Volume (USD)"
            stroke="#eab308"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="count"
            name="Payments"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          {compare && (
            <Line
              yAxisId="volume"
              type="monotone"
              dataKey="previousAmount"
              name="Previous volume (USD)"
              stroke="#eab308"
              strokeDasharray="4 4"
              strokeWidth={2}
              dot={false}
            />
          )}
          {compare && (
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="previousCount"
              name="Previous payments"
              stroke="#3b82f6"
              strokeDasharray="4 4"
              strokeWidth={2}
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
