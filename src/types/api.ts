// Shared API response types.
//
// These mirror the shapes returned by the backend API and are consumed by
// dashboard components. Keeping them in one module lets the UI and the API
// client agree on a single source of truth instead of falling back to `any`.

export type SettlementStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded';

export type WebhookStatus = 'active' | 'paused' | 'disabled';

export interface Payment {
  id: string;
  merchantId: string;
  amountUsd: number;
  currency: string;
  status: PaymentStatus;
  customerEmail?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  id: string;
  merchantId: string;
  totalAmountUsd: number;
  feeAmountUsd: number;
  netAmountUsd: number;
  status: SettlementStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface Webhook {
  id: string;
  merchantId: string;
  url: string;
  events: string[];
  status: WebhookStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsResponse {
  totalVolumeUsd: number;
  totalPayments: number;
  totalSettlements: number;
  successRate: number;
  periodStart: string;
  periodEnd: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
