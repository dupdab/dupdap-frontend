import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible (or visually-hidden) label text. */
  label: string;
  /** Error message; also drives `aria-invalid` and `aria-describedby`. */
  error?: string;
  /** Extra classes merged onto the label element. */
  labelClassName?: string;
  /** Render the label for screen readers only. */
  hideLabel?: boolean;
  /** Rendered at the end of the label row (e.g. a character counter). */
  hint?: ReactNode;
  /** Optional status node rendered next to the label (e.g. username availability). */
  status?: ReactNode;
}

/**
 * Labelled text input with accessible error wiring. The label is always
 * programmatically associated with the input: it uses the caller-provided
 * `id` when given, otherwise a `useId()` generated one (#156).
 */
export function FormField({
  label,
  error,
  id,
  className,
  labelClassName,
  hideLabel,
  hint,
  status,
  ...props
}: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  const labelClasses = hideLabel
    ? `sr-only ${labelClassName ?? ''}`.trim()
    : `label ${labelClassName ?? ''}`.trim();

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className={labelClasses}>
          {label}
        </label>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
        {status}
      </div>
      <input
        id={inputId}
        className={`input ${error ? 'border-red-400 focus:border-red-400' : ''} ${className ?? ''}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-red-500 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

export default FormField;
