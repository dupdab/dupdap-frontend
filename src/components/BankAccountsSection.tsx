'use client';

import { useEffect, useState } from 'react';
import toast from '@/lib/toast';
import { getErrorMessage } from '@/lib/errors';
import {
  bankAccountsApi,
  maskAccountNumber,
  type BankAccount,
} from '@/lib/bank-accounts-api';
import { FormField } from '@/components/FormField';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FormField } from '@/components/FormField';
import {
  bankAccountsApi,
  maskAccountNumber,
  type BankAccount,
} from '@/lib/bank-accounts-api';
import { getErrorMessage } from '@/lib/errors';
import toast from '@/lib/toast';

const EMPTY = {
  bankName: '',
  accountNumber: '',
  routingNumber: '',
  currency: 'USD',
};

export default function BankAccountsSection() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<BankAccount | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    bankAccountsApi
      .list()
      .then(({ data }) => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  }, []);

  const set =
    (key: keyof typeof EMPTY) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const { data } = await bankAccountsApi.create({
        ...form,
        currency: form.currency.toUpperCase(),
      });
      setAccounts((a) => [...a, data]);
      setForm(EMPTY);
      toast.success('Bank account added');
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Failed to add bank account');
    } finally {
      setAdding(false);
    }
  };

  const makeDefault = async (id: string) => {
    try {
      await bankAccountsApi.setDefault(id);
      setAccounts((a) =>
        a.map((acc) => ({ ...acc, isDefault: acc.id === id }))
      );
      toast.success('Default account updated');
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Failed to update default account');
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await bankAccountsApi.remove(removeTarget.id);
      setAccounts((a) => a.filter((acc) => acc.id !== removeTarget.id));
      toast.success('Bank account removed');
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Failed to remove bank account');
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
    }
  };

  return (
    <div className="card p-6 mb-6" data-testid="bank-accounts-section">
      <h2 className="font-semibold mb-4">Bank Accounts</h2>

      {loading ? (
        <p className="text-sm text-gray-500 mb-4">Loading...</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">No bank accounts yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 mb-4">
          {accounts.map((acc) => (
            <li
              key={acc.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {acc.bankName} · {maskAccountNumber(acc.accountNumber)} ·{' '}
                  {acc.currency}
                  {acc.isDefault && (
                    <span className="ml-2 text-xs text-green-700 bg-green-50 rounded px-2 py-0.5">
                      Default
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-3 shrink-0 text-sm">
                {!acc.isDefault && (
                  <button
                    type="button"
                    onClick={() => makeDefault(acc.id)}
                    className="text-brand-600 hover:underline"
                  >
                    Set default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRemoveTarget(acc)}
                  className="text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="space-y-4" aria-busy={adding}>
        <FormField
          label="Bank name"
          id="ba-bank-name"
          value={form.bankName}
          onChange={set('bankName')}
          required
        />
        <FormField
          label="Account number"
          id="ba-account-number"
          value={form.accountNumber}
          onChange={set('accountNumber')}
          required
        />
        <FormField
          label="Routing number"
          id="ba-routing-number"
          value={form.routingNumber}
          onChange={set('routingNumber')}
          required
        />
        <FormField
          label="Currency"
          id="ba-currency"
          value={form.currency}
          onChange={set('currency')}
          maxLength={3}
          required
        />
        <button type="submit" disabled={adding} className="btn-primary">
          {adding ? 'Adding...' : 'Add bank account'}
        </button>
      </form>

      <ConfirmDialog
        open={removeTarget !== null}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
        title="Remove bank account"
        message="Are you sure you want to remove this bank account? This cannot be undone."
        confirmLabel="Remove"
        loading={removing}
        destructive
      />
    </div>
  );
}
