// This file is intentionally NOT 'use client' — it is always imported via
// next/dynamic from analytics/page.tsx, which handles the client boundary.
'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#6b7280'];

interface PieDataPoint {
  name: string;
  value: number;
}

interface Props {
  data: PieDataPoint[];
}

export default function StatusPieChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          minAngle={8}
          label={({ name, value, percent }: { name: string; value: number; percent?: number }) =>
            percent && percent > 0.08 ? `${name}: ${value}` : ''
          }
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
