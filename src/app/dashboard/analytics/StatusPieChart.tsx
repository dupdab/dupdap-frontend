'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export interface StatusPieChartDatum {
  name: string;
  value: number;
  color?: string;
}

export interface StatusPieChartProps {
  data: StatusPieChartDatum[];
  height?: number;
}

const DEFAULT_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7'];

export default function StatusPieChart({ data, height = 300 }: StatusPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="80%"
          label
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={entry.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
