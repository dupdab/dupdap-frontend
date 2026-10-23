'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import type { RevenueBreakdownRow } from '@/lib/revenue-breakdown';

const COLORS = [
  '#3b82f6',
  '#22c55e',
  '#eab308',
  '#a855f7',
  '#ef4444',
  '#6b7280',
];

export default function RevenueByMethodChart({
  data,
}: {
  data: RevenueBreakdownRow[];
}) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
