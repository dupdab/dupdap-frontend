export const AMOUNT_MIN = 0.01;
export const AMOUNT_MAX = 1_000_000;

export interface AmountValidationResult {
  value: number | null;
  error: string | null;
}

/**
 * Validate a raw payment amount input value.
 * Returns the parsed numeric value (or null) and an inline error message (or null).
 */
export function validateAmount(raw: string): AmountValidationResult {
  const trimmed = raw.trim();

  if (trimmed === '') {
    return { value: null, error: null };
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    return { value: null, error: 'Enter a valid number.' };
  }

  if (parsed < AMOUNT_MIN) {
    return { value: parsed, error: `Amount must be at least ${AMOUNT_MIN}.` };
  }

  if (parsed > AMOUNT_MAX) {
    return {
      value: parsed,
      error: `Amount must not exceed ${AMOUNT_MAX.toLocaleString()}.`,
    };
  }

  return { value: parsed, error: null };
}
