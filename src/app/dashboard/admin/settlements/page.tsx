'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Filter,
  ExternalLink 
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';
import { formatUsd, formatDate, STATUS_COLORS } from '@/lib/utils';
import { SkeletonList, SkeletonTableRows } from '@/components/Skeleton';

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

export default function AdminSettlementsPage() {
  const { token } = useAuthStore();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterInputs, setFilterInputs] = useState({
    merchantId: '',
    startDate: '',
    endDate: '',
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      });

      const response = await adminApi.listSettlements(params.toString());

      setSettlements(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch settlements:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    if (token) fetchSettlements();
  }, [token, fetchSettlements]);

  const handleRetry = async (settlementId: string) => {
    try {
      setActionLoading(settlementId);
      await adminApi.retrySettlement(settlementId);
      await fetchSettlements();
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
      await fetchSettlements();
    } catch (error) {
      toast.error(getErrorMessage(error) ?? 'Failed to approve settlement');
    } finally {
      setActionLoading(null);
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

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={filters.status}
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
            value={filterInputs.merchantId}
            onChange={(e) => setFilterInputs({ ...filterInputs, merchantId: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          />

          <input
            type="date"
            value={filterInputs.startDate}
            onChange={(e) => setFilterInputs({ ...filterInputs, startDate: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          />

          <input
            type="date"
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
            <div className="px-4 py-8 text-center text-gray-500">No settlements found</div>
          ) : (
            settlements.map((settlement) => {
              const StatusIcon = statusIcons[settlement.status];
              return (
                <div key={settlement.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{settlement.id.slice(0, 8)}...</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[settlement.status]}`}>
                      <StatusIcon className="w-3 h-3" />
                      {settlement.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-900">{settlement.merchant?.businessName || 'Unknown'}</div>
                  <div className="text-sm font-medium text-gray-900">{formatUsd(settlement.netAmountUsd)}</div>
                  <div className="text-xs text-gray-500">Fee: {formatUsd(settlement.feeAmountUsd)}</div>
                  <div className="text-xs text-gray-500">{formatDate(settlement.createdAt)}</div>
                  {settlement.failureReason && (
                    <div className="text-xs text-red-600">{settlement.failureReason}</div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    {settlement.status === 'failed' && (
                      <button
                        onClick={() => window.confirm("Are you sure you want to retry this settlement?") && handleRetry(settlement.id)}
                        disabled={actionLoading === settlement.id}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                      >
                        {actionLoading === settlement.id ? 'Retrying...' : 'Retry'}
                      </button>
                    )}
                    {settlement.status === 'pending_approval' && (
                      <button
                        onClick={() => window.confirm("Are you sure you want to approve this settlement?") && handleApprove(settlement.id)}
                        disabled={actionLoading === settlement.id}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                      >
                        {actionLoading === settlement.id ? 'Approving...' : 'Approve'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Settlement</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner Ref</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <SkeletonTableRows rows={6} cols={7} cellClassName="px-4 py-3" />
              ) : settlements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No settlements found
                  </td>
                </tr>
              ) : (
                settlements.map((settlement) => {
                  const StatusIcon = statusIcons[settlement.status];
                  return (
                    <tr key={settlement.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {settlement.id.slice(0, 8)}...
                        </div>
                        {settlement.failureReason && (
                          <div className="text-xs text-red-600 mt-1">
                            {settlement.failureReason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {settlement.merchant?.businessName || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {settlement.merchantId.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {formatUsd(settlement.netAmountUsd)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Fee: {formatUsd(settlement.feeAmountUsd)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[settlement.status]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {settlement.status.replace('_', ' ')}
                        </span>
                        {settlement.requiresApproval && (
                          <div className="text-xs text-orange-600 mt-1">
                            Requires approval
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {settlement.partnerReference ? (
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-900">
                              {settlement.partnerReference}
                            </span>
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(settlement.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {settlement.status === 'failed' && (
                            <button
                              onClick={() => window.confirm("Are you sure you want to retry this settlement?") && handleRetry(settlement.id)}
                              disabled={actionLoading === settlement.id}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                            >
                              {actionLoading === settlement.id ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                          {settlement.status === 'pending_approval' && (
                            <button
                              onClick={() => window.confirm("Are you sure you want to approve this settlement?") && handleApprove(settlement.id)}
                              disabled={actionLoading === settlement.id}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                            >
                              {actionLoading === settlement.id ? 'Approving...' : 'Approve'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} settlements
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
