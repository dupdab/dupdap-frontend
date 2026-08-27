'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, XCircle } from 'lucide-react';
import { settlementsApi } from '@/lib/api';
import { formatUsd, formatDate } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right break-all">{value}</span>
    </div>
  );
}

export default function SettlementDetailPage({ params }: { params: { settlementId: string } }) {
  const [settlement, setSettlement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settlementsApi.get(params.settlementId).then(({ data }) => setSettlement(data)).finally(() => setLoading(false));
  }, [params.settlementId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="p-8">
        <Link href="/dashboard/settlements" className="text-brand-600 text-sm hover:underline flex items-center gap-1 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to settlements
        </Link>
        <div className="card p-8 text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">Settlement not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/dashboard/settlements" className="text-brand-600 text-sm hover:underline flex items-center gap-1 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to settlements
      </Link>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settlement</h1>
            <p className="text-xs font-mono text-gray-500 mt-1 break-all">{settlement.id}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[settlement.status] ?? 'bg-gray-100 text-gray-800'}`}>
            {settlement.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Gross</p>
            <p className="font-semibold text-gray-900">{formatUsd(settlement.totalAmountUsd)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Fee</p>
            <p className="font-semibold text-red-600">-{formatUsd(settlement.feeAmountUsd)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Net</p>
            <p className="font-semibold text-green-700">{formatUsd(settlement.netAmountUsd)}</p>
          </div>
        </div>

        {settlement.failureReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-6">
            {settlement.failureReason}
          </div>
        )}

        <div>
          <Row label="Fiat currency" value={settlement.fiatCurrency} />
          <Row label="Fiat amount" value={settlement.fiatAmount != null ? `${settlement.fiatAmount} ${settlement.fiatCurrency ?? ''}`.trim() : undefined} />
          <Row label="Partner reference" value={settlement.partnerReference} />
          <Row label="Bank reference" value={settlement.bankReference} />
          <Row label="Requires approval" value={settlement.requiresApproval != null ? (settlement.requiresApproval ? 'Yes' : 'No') : undefined} />
          <Row label="Approved by" value={settlement.approvedBy} />
          <Row label="Approved at" value={settlement.approvedAt ? formatDate(settlement.approvedAt) : undefined} />
          <Row label="Completed at" value={settlement.completedAt ? formatDate(settlement.completedAt) : undefined} />
          <Row label="Created" value={settlement.createdAt ? formatDate(settlement.createdAt) : undefined} />
          <Row label="Updated" value={settlement.updatedAt ? formatDate(settlement.updatedAt) : undefined} />
        </div>
      </div>
    </div>
  );
}
