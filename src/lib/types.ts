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
  createdAt: string;
}

export interface ApiKey {
  apiKey: string;
}