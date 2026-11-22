import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import CurrencyInput, { formatCurrencyAmount } from './CurrencyInput';

function ControlledCurrencyInput() {
  const [value, setValue] = useState('');
  return (
    <CurrencyInput
      label="Amount (USD)"
      name="amountUsd"
      value={value}
      onValueChange={setValue}
      required
    />
  );
}

describe('CurrencyInput', () => {
  it('formats a whole number to two decimals on blur', async () => {
    const user = userEvent.setup();
    render(<ControlledCurrencyInput />);

    const input = screen.getByLabelText('Amount (USD)') as HTMLInputElement;
    await user.type(input, '25');
    expect(input.value).toBe('25');

    await user.tab();
    expect(input.value).toBe('25.00');
  });

  it('shows the currency symbol to the left of the input', () => {
    render(<ControlledCurrencyInput />);
    const input = screen.getByLabelText('Amount (USD)');
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.getByText('$').compareDocumentPosition(input)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('leaves empty and invalid values untouched', () => {
    expect(formatCurrencyAmount('')).toBe('');
    expect(formatCurrencyAmount('abc')).toBe('abc');
    expect(formatCurrencyAmount('12.5')).toBe('12.50');
  });
});
