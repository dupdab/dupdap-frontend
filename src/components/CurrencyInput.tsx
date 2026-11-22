'use client';

import { useId } from 'react';
import type {
  ChangeEvent,
  FocusEvent,
  InputHTMLAttributes,
  ReactNode,
} from 'react';

export function formatCurrencyAmount(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const amount = Number(trimmed);
  if (!Number.isFinite(amount)) return trimmed;
  // Negative amounts are rejected by the form; keep the sign if typed.
  return amount.toFixed(2);
}

interface CurrencyInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange' | 'children'
  > {
  label: string;
  value: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: string) => void;
  currencySymbol?: string;
  hint?: ReactNode;
}

/**
 * Currency amount field: shows the currency symbol on the left of the input
 * and normalises the value to two decimal places on blur (25 → 25.00).
 */
export function CurrencyInput({
  label,
  value,
  onChange,
  onValueChange,
  currencySymbol = '$',
  hint,
  id: idProp,
  name,
  ...rest
}: CurrencyInputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hintId = `${id}-hint`;

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyAmount(value);
    if (formatted !== value) {
      onValueChange?.(formatted);
      onChange?.({
        target: { value: formatted, name: name ?? '' },
      } as ChangeEvent<HTMLInputElement>);
    }
    rest.onBlur?.(event);
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative flex items-center">
        <span
          aria-hidden="true"
          className="absolute left-3 text-sm text-gray-500"
        >
          {currencySymbol}
        </span>
        <input
          {...rest}
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => {
            onValueChange?.(event.target.value);
            onChange?.(event);
          }}
          onBlur={handleBlur}
          aria-describedby={hint ? hintId : rest['aria-describedby']}
          className="input w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:bg-gray-100"
        />
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export default CurrencyInput;
