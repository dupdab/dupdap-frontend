import type {
  Payment as ApiPayment,
  Settlement as ApiSettlement,
} from '@/lib/types';

/** Payment data rendered by merchant dashboard views. */
export interface Payment extends ApiPayment {}

/** Per-status payment totals returned by GET /payments/stats. */
export interface PaymentStat {
  status: string;
  count: string;
  totalUsd?: string;
}

/** Settlement data rendered by merchant dashboard views. */
export interface Settlement extends ApiSettlement {}
