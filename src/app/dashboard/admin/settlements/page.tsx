'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from '@/lib/toast';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Filter,
  ExternalLink,
  HelpCircle,
  Download,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { formatUsd, formatDate, STATUS_COLORS } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import { SkeletonList, SkeletonTableRows } from '@/components/Skeleton';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Settlement {
  id: string;
  merchantId: string;
  merchant: {
    businessName: string;
  };
  totalAmountUsd: number;
  feeAmountUsd: number;
  netAmountUsd: number;
  fiatCurrency: string;
  fiatAmount: number;
  status: 'pending' | 'pending_approval' | 'processing' | 'completed' | 'failed';
  partnerReference: string;
  bankReference: string;
  failureReason: string;
  requiresApproval: boolean;
  approvedBy: string;
  approvedAt: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface TopMerchant {
  merchantId: string;
  merchantName: string;
  totalVolumeUsd: number;
  paymentCount: number;
  avgOrderValueUsd: number;
}

type TopMerchantsPeriod = '7d' | '30d' | '90d';

const statusIcons = {
  pending: Clock,
  pending_approval: AlertCircle,
  processing: RefreshCw,
  completed: CheckCircle,
  failed: AlertCircle,
};

const EMPTY_FILTERS = {
  status: '',
  merchantId: '',
  startDate: '',
  endDate: '',
};

const FILTER_DEBOUNCE_MS = 300;

const TOP_MERCHANTS_PERIODS: { value: TopMerchantsPeriod; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

function escapeCsvValue(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function AdminSettlementsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // Separate input state so the text field stays responsive while the fetch
  // is debounced — avoids a network round-trip on every keystroke.
  const [filterInputs, setFilterInputs] = useState({
    merchantId: '',
    startDate: '',
    endDate: '',
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Which settlement action is waiting for confirmation in the dialog below.
  const [pendingAction, setPendingAction] = useState<{
    type: 'retry' | 'approve';
    settlementId: string;
  } | null>(null);

  // Top-merchants panel state (#542).
  const [topMerchants, setTopMerchants] = useState<TopMerchant[]>([]);
  const [topMerchantsLoading, setTopMerchantsLoading] = useState(true);
  const [topMerchantsPeriod, setTopMerchantsPeriod] = useState<TopMerchantsPeriod>('30d');

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        const next = {
          ...prev,
          merchantId: filterInputs.merchantId,
          startDate: filterInputs.startDate,
          endDate: filterInputs.endDate,
        };
        if (
          prev.merchantId === next.merchantId &&
          prev.startDate === next.startDate &&
          prev.endDate === next.endDate
        ) {
          return prev;
        }
        return next;
      });
    }, FILTER_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [filterInputs.merchantId, filterInputs.startDate, filterInputs.endDate]);

  const fetchSettlements = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      });

      // Pass the query string only — adminApi.listSettlements appends it to the
      // path and the axios instance already carries the /api/v1 base URL.
      const response = await adminApi.listSettlements(params.toString());
      setSettlements(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch settlements:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters, token]);

  useEffect(() => {
    if (token) fetchSettlements();
  }, [token, fetchSettlements]);

  const fetchTopMerchants = useCallback(async () => {
    if (!token) return;

    try {
      setTopMerchantsLoading(true);
      const response = await adminApi.getTopMerchants(topMerchantsPeriod);
      setTopMerchants(response.data.data ?? []);
    } catch (error) {
      console.error('Failed to fetch top merchants:', error);
      toast.error(getErrorMessage(error) ?? 'Failed to load top merchants');
    } finally {
      setTopMerchantsLoading(false);
    }
  }, [token, topMerchantsPeriod]);

  useEffect(() => {
    if (token) fetchTopMerchants();
  }, [token, fetchTopMerchants]);

  const handleExportTopMerchantsCsv = () => {
    const header = ['Rank', 'Merchant', 'Total Volume (USD)', 'Payment Count', 'Avg Order Value (USD)'];
    const rows = topMerchants.map((merchant, index) => [
      index + 1,
      merchant.merchantName,
      merchant.totalVolumeUsd.toFixed(2),
      merchant.paymentCount,
      merchant.avgOrderValueUsd.toFixed(2),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `top-merchants-${topMerchantsPeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Keep fetchSettlements accessible for retry/approve actions that need to
  // manually refresh the list outside the main effect.
  const refetch = () => {
    setFilters((prev) => ({ ...prev }));
  };

  const handleRetry = async (settlementId: string) => {
    try {
      setActionLoading(settlementId);
      await adminApi.retrySettlement(settlementId);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error) ?? 'Failed to retry settlement');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (settlementId: string) => {
    try {
      setActionLoading(settlementId);
      await adminApi.approveSettlement(settlementId);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error) ?? 'Failed to approve settlement');
    } finally {
      setActionLoading(null);
    }
  };

  // Retrying or approving a settlement moves real money, so both go through the
  // shared ConfirmDialog rather than window.confirm (#354).
  const confirmPendingAction = () => {
    if (!pendingAction) return;

    const { type, settlementId } = pendingAction;
    setPendingAction(null);
    if (type === 'retry') {
      handleRetry(settlementId);
    } else {
      handleApprove(settlementId);
    }
  };

  const handleClearFilters = () => {
    setFilterInputs({ merchantId: '', startDate: '', endDate: '' });
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Settlements</h1>
        <p className="text-gray-600">Manage and monitor all merchant settlements</p>
      </div>

      {/* Top Merchants Panel (#542) */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Top Merchants</h2>
            <p className="text-sm text-gray-600">Ranked by payment volume</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={topMerchantsPeriod}
              aria-label="Select top merchants period"
              onChange={(e) => setTopMerchantsPeriod(e.target.value as TopMerchantsPeriod)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              {TOP_MERCHANTS_PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleExportTopMerchantsCsv}
              disabled={topMerchantsLoading || topMerchants.length === 0}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant</th>
                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Volume</th>
                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Payments</th>
                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Order Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topMerchantsLoading ? (
                <SkeletonTableRows rows={5} columns={5} />
              ) : topMerchants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                    No merchant activity for this period.
                  </td>
                </tr>
              ) : (
                topMerchants.map((merchant, index) => (
                  <tr
                    key={merchant.merchantId}
                    onClick={() => router.push(`/dashboard/admin/merchants/${merchant.merchantId}`)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-2 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{merchant.merchantName}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatUsd(merchant.totalVolumeUsd)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">{merchant.paymentCount}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatUsd(merchant.avgOrderValueUsd)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={filters.status}
            aria-label="Filter by status"
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPage(1);
            }}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          <input
            type="text"
            placeholder="Merchant ID"
            aria-label="Filter by merchant ID"
            value={filterInputs.merchantId}
            onChange={(e) => setFilterInputs({ ...filterInputs, merchantId: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          />

          <input
            type="date"
            aria-label="Filter from date"
            value={filterInputs.startDate}
            onChange={(e) => setFilterInputs({ ...filterInputs, startDate: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          />

          <input
            type="date"
            aria-label="Filter to date"
            value={filterInputs.endDate}
            onChange={(e) => setFilterInputs({ ...filterInputs, endDate: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          />

          <button
            onClick={handleClearFilters}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Mobile card layout */}
        <div className="md:hidden divide-y divide-gray-200">
          {loading ? (
            <SkeletonList rows={6} className="px-4 py-3" />
          ) : settlements.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">No settlements found.</div>
          ) : (
            settlements.map((settlement) => {
              const StatusIcon = statusIcons[settlement.status];
              return (
                <div key={settlement.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {settlement.merchant?.businessName ?? settlement.merchantId}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[settlement.status] ?? ''}`}>
                      <StatusIcon className="w-3 h-3" aria-hidden="true" />
                      {settlement.status}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {formatUsd(settlement.totalAmountUsd)} · {formatDate(settlement.createdAt)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop table layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <SkeletonTableRows rows={6} columns={5} />
              ) : settlements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">No settlements found.</td>
                </tr>
              ) : (
                settlements.map((settlement) => {
                  const StatusIcon = statusIcons[settlement.status];
                  return (
                    <tr key={settlement.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{settlement.merchant?.businessName ?? settlement.merchantId}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{formatUsd(settlement.totalAmountUsd)}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[settlement.status] ?? ''}`}>
                          <StatusIcon className="w-3 h-3" aria-hidden="true" />
                          {settlement.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{formatDate(settlement.createdAt)}</td>
                      <td className="px-4 py-2 text-sm text-right">
                        {settlement.status === 'failed' && (
                          <button
                            onClick={() => setPendingAction({ type: 'retry', settlementId: settlement.id })}
                            disabled={actionLoading === settlement.id}
                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          >
                            Retry
                          </button>
                        )}
                        {settlement.status === 'pending_approval' && (
                          <button
                            onClick={() => setPendingAction({ type: 'approve', settlementId: settlement.id })}
                            disabled={actionLoading === settlement.id}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>{total} settlements</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= total}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction?.type === 'retry' ? 'Retry settlement?' : 'Approve settlement?'}
        description={
          pendingAction?.type === 'retry'
            ? 'This will re-attempt the settlement payout to the merchant.'
            : 'This will approve and release the settlement payout to the merchant.'
        }
        confirmLabel={pendingAction?.type === 'retry' ? 'Retry' : 'Approve'}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
