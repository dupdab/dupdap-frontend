'use client';

import dynamic from 'next/dynamic';

import type { RevenueBreakdownRow } from '@/lib/revenue-breakdown';
import { formatUsd } from '@/lib/utils';

// Lazy-load recharts so the chart library is only pulled into the bundle
// when the analytics page actually renders this chart (issue #823).
const RevenueByMethodChartInner = dynamic(
  () => import('./RevenueByMethodChartInner'),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[250px] w-full items-center justify-center text-sm text-gray-500"
        aria-busy="true"
      >
        Loading chart…
      </div>
    ),
  },
);

function RevenueByMethodChart({
  data,
}: {
  data: RevenueBreakdownRow[];
}) {
  return <RevenueByMethodChartInner data={data} />;
}

export default React.memo(RevenueByMethodChart);
