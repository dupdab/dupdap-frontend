'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { paymentsApi } from '@/lib/api';
import { formatUsd } from '@/lib/utils';
import { breakdownByPaymentMethod, type RevenueBreakdownRow } from '@/lib/revenue-breakdown';

const RevenueByMethodChart = dynamic(() => import('./RevenueByMethodChart'), {
  ssr: false,
  loading: () => <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">Loading chart…</div>,
});

export default function RevenueByMethodCard() {
  const [rows, setRows] = useState<RevenueBreakdownRow[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');

  useEffect(() => {
    let cancelled = false;
    paymentsApi
      .list(1, 100)
      .then(({ data }) => {
        if (cancelled) return;
        setRows(breakdownByPaymentMethod(data?.payments ?? []));
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="card p-6">
      <h2 className="font-semibold mb-4">Revenue by Payment Method (USD)</h2>
      {state === 'loading' && <p className="text-sm text-gray-400">Loading...</p>}
      {state === 'error' && <p className="text-sm text-red-500">Couldn&apos;t load revenue breakdown.</p>}
      {state === 'ready' && rows.length === 0 && <p className="text-sm text-gray-400">No payment data yet.</p>}
      {state === 'ready' && rows.length > 0 && (
        <>
          <RevenueByMethodChart data={rows} />
          <table className="sr-only">
            <caption>Revenue by Payment Method (USD)</caption>
            <thead>
              <tr>
                <th scope="col">Method</th>
                <th scope="col">Volume (USD)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td>{formatUsd(r.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
