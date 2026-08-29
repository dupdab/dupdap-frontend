export type PaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'settling'
  | 'settled'
  | 'failed'
  | 'expired';

export interface Merchant {
  id: string;
  email: string;
  businessName: string;
  status: string;
  country?: string;
  bankAccountNumber?: string;
  bankCode?: string;
  bankName?: string;
  apiKeyScopes?: string[];
}

export interface AuthResponse {
  accessToken: string;
  merchant: Merchant;
}

export function isAuthResponse(data: unknown): data is AuthResponse {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;
  if (typeof record.accessToken !== 'string' || !record.accessToken) return false;
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
  stellarMemo: string;
  stellarDepositAddress?: string;
  qrCode?: string;
  createdAt: string;
  updatedAt?: string;
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

export interface Settlement {
  id: string;
  merchantId: string;
  merchant?: { businessName: string };
  totalAmountUsd: number;
  feeAmountUsd: number;
  netAmountUsd: number;
  status: string;
  partnerReference?: string;
  createdAt: string;
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

export interface ApiKey {
  apiKey: string;
}