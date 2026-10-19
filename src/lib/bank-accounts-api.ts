import { api } from './api';

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  currency: string;
  isDefault: boolean;
}

export type NewBankAccount = Omit<BankAccount, 'id' | 'isDefault'>;

export const bankAccountsApi = {
  list: () => api.get<BankAccount[]>('/merchants/me/bank-accounts'),
  create: (data: NewBankAccount) => api.post<BankAccount>('/merchants/me/bank-accounts', data),
  setDefault: (id: string) => api.patch<BankAccount>(`/merchants/me/bank-accounts/${id}/default`, {}),
  remove: (id: string) => api.delete(`/merchants/me/bank-accounts/${id}`),
};

export function maskAccountNumber(value: string): string {
  return value.length <= 4 ? value : `****${value.slice(-4)}`;
}
