export type PaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'settling'
  | 'settled'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'partially_refunded'
  | 'refunded'
  | 'cancelled';

export type SettlementStatus =
  | 'pending'
  | 'processing'
  | 'settling'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type MerchantRole = 'merchant' | 'admin' | 'staff';
export interface Merchant {
  id: string;
  email: string;
  businessName: string;
  status: string;
  role?: MerchantRole;
  avatarUrl?: string;
  country?: string;
  bankAccountNumber?: string;
  bankCode?: string;
  bankName?: string;
  apiKeyScopes?: string[];
  /** 'sandbox' when the merchant is using test mode. */
  mode?: string;
  environment?: string;
  testMode?: boolean;
}

export interface TopMerchant {
  merchantId: string;
  merchantName: string;
  totalVolume: number;
  paymentCount: number;
  avgOrderValue: number;
}

export interface AuthResponse {
  accessToken?: string;
  merchant: Merchant;
}

export function isAuthResponse(data: unknown): data is AuthResponse {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;
  if (typeof record.accessToken !== 'string' || !record.accessToken)
    return false;
  const merchant = record.merchant;
  if (!merchant || typeof merchant !== 'object') return false;
  const merchantRecord = merchant as Record<string, unknown>;
  return typeof merchantRecord.id === 'string' && merchantRecord.id.length > 0;
}

export interface Payment {
  id: string;
  reference: string;
  amountUsd: number;
  amountXlm?: number;
  status: PaymentStatus;
  description?: string;
  customerEmail?: string;
  /** Arbitrary merchant-defined key/value data (e.g. order ID, product name). */
  metadata?: Record<string, unknown>;
  stellarMemo: string;
  stellarDepositAddress?: string;
  qrCode?: string;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;
  expiryMinutes?: number;
  merchantName?: string;
  merchantEmail?: string;
  /** Stellar transaction hash of the payment that settled this request. */
  transactionHash?: string;
  /** Alias some API responses use for `transactionHash`. */
  txHash?: string;
}

export interface PaymentStats {
  status: string;
  count: string;
  totalUsd?: string;
}

export interface PaymentListResponse {
  payments: Payment[];
  total: number;
}

export interface SettlementPayment {
  id: string;
  reference?: string;
  amountUsd?: number;
  status?: string;
  createdAt?: string;
}

export interface Settlement {
  id: string;
  merchantId: string;
  merchant?: { businessName: string };
  totalAmountUsd: number;
  feeAmountUsd: number;
  netAmountUsd: number;
  status: SettlementStatus;
  partnerReference?: string;
  createdAt: string;
  // Detail-only fields returned by GET /settlements/:id (#341).
  fiatCurrency?: string;
  fiatAmount?: number;
  bankReference?: string;
  requiresApproval?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  completedAt?: string;
  failureReason?: string;
  updatedAt?: string;
  paymentCount?: number;
  payments?: SettlementPayment[];
}

export interface SettlementListResponse {
  settlements: Settlement[];
  total: number;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  createdAt: string;
}

/** A single delivery attempt of a webhook event (#788). */
export interface WebhookDelivery {
  id: string;
  event: string;
  /** HTTP status returned by the endpoint; null when no response was received. */
  statusCode: number | null;
  /** Round-trip time in milliseconds. */
  responseTimeMs: number | null;
  responseBody?: string | null;
  createdAt: string;
}

export interface WebhookDeliveryListResponse {
  deliveries: WebhookDelivery[];
  total: number;
}

/** Merchant email notification preferences (#790). */
export interface NotificationPreferences {
  paymentReceived: boolean;
  paymentFailed: boolean;
  settlementCompleted: boolean;
}

export interface ApiKey {
  apiKey: string;
}

/** Merchant email notification preferences (#798). */
export interface NotificationPreferences {
  paymentReceived: boolean;
  paymentFailed: boolean;
  settlementCompleted: boolean;
}

/** Analytics query range, e.g. '7d' | '30d' | '90d' (#799). */
export type AnalyticsRange = string;

/** Payment funnel stage counts (#799). */
export interface FunnelStage {
  name: string;
  value: number;
}

/** Current vs previous period totals (#799). */
export interface PeriodComparison {
  current: { volumeUsd: number; count: number };
  previous: { volumeUsd: number; count: number };
}
