export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  customerName?: string;
  customerEmail?: string;
}

export interface PaymentsResponse {
  payments: Payment[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaymentsQuery {
  page?: number;
  pageSize?: number;
}
