'use client';

import {
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface FunnelDataPoint {
  /** Stage name, e.g. "Created", "Confirmed", "Settled". */
  name: string;
  /** Payment count at this stage. */
  value: number;
  /** Fill colour for the funnel slice. */
  fill: string;
}

interface Props {
  data: FunnelDataPoint[];
}

/**
 * Conversion funnel: Created → Confirmed → Settled.
 *
 * Uses recharts FunnelChart so the narrowing shape visually communicates
 * drop-off between stages. The same data is also rendered in a visually-hidden
 * table by the parent page for screen-reader access (#375).
 */
export default function PaymentFunnelChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <FunnelChart>
        <Tooltip />
        <Funnel dataKey="value" data={data} isAnimationActive stroke="#ffffff">
          <LabelList
            position="right"
            fill="#374151"
            stroke="none"
            dataKey="name"
            formatter={(name: string) => `${name}`}
          />
          <LabelList
            position="center"
            fill="#ffffff"
            stroke="none"
            dataKey="value"
            formatter={(value: number) => `${value}`}
          />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}
