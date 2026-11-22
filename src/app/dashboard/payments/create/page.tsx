'use client';

import { useState } from 'react';

const MIN_AMOUNT = 0.01;
const MAX_AMOUNT = 1000000;

export default function CreatePaymentPage() {
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);

  function validateAmount(value: string): string | null {
    if (value.trim() === '') {
      return 'Amount is required.';
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 'Amount must be a number.';
    }
    if (parsed < MIN_AMOUNT) {
      return `Amount must be at least ${MIN_AMOUNT}.`;
    }
    if (parsed > MAX_AMOUNT) {
      return `Amount must be at most ${MAX_AMOUNT.toLocaleString()}.`;
    }
    return null;
  }

  function handleAmountChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setAmount(value);
    setAmountError(validateAmount(value));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateAmount(amount);
    setAmountError(error);
    if (error) {
      return;
    }
    // Submit logic for a valid amount would go here.
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="amount">Amount</label>
      <input
        id="amount"
        name="amount"
        type="number"
        inputMode="decimal"
        step="0.01"
        min={MIN_AMOUNT}
        max={MAX_AMOUNT}
        value={amount}
        onChange={handleAmountChange}
        aria-invalid={amountError ? true : undefined}
        aria-describedby={amountError ? 'amount-error' : undefined}
      />
      {amountError && (
        <p id="amount-error" role="alert" style={{ color: '#b91c1c' }}>
          {amountError}
        </p>
      )}
      <button type="submit">Continue</button>
    </form>
  );
}
