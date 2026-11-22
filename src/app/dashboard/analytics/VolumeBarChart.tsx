'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { formatUsd } from '@/lib/utils';

export interface VolumeBarChartDatum {
  name: string;
  amount: number;
  /** Volume for the same status in the previous period (#793). */
  prevAmount?: number;
}

export interface VolumeBarChartProps {
  data: VolumeBarChartDatum[];
  /** When true, renders previous-period bars next to the current ones. */
  compare?: boolean;
  height?: number;
}

export default function VolumeBarChart({
  data,
  compare = false,
  height = 250,
}: VolumeBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatUsd(v)} />
        <Tooltip formatter={(value: number, name: string) => [formatUsd(value), name]} />
        <Legend />
        <Bar dataKey="amount" name="Current period" fill="#2563eb" />
        {compare && (
          <Bar dataKey="prevAmount" name="Previous period" fill="#93c5fd" />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
