'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatUsd } from '@/lib/utils';

interface BarDataPoint {
  name: string;
  amount: number;
}

interface Props {
  data: BarDataPoint[];
}

export default function VolumeBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => formatUsd(v)} />
        <Bar dataKey="amount" fill="#eab308" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
