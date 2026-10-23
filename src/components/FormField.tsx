import React, { useId } from 'react';

// ---------------------------------------------------------------------------
// FormField — a labelled form control that generates its own accessible id
// using React's built-in useId hook when none is provided by the caller.
//
// Supports: text inputs, textareas, selects, and arbitrary <input> types via
// the `type` prop. Extra HTML attributes (step, min, max, maxLength, etc.) are
// forwarded to the underlying element through the rest-props spread so callers
// never need to reach around the abstraction.
// ---------------------------------------------------------------------------

interface FormFieldBaseProps {
  label: string;
  id?: string;
  name?: string;
  type?: string;
  value?: string;
  onChange?: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  hint?: React.ReactNode;
  /** Render as a textarea instead of an input. */
  as?: 'input' | 'textarea' | 'select';
  rows?: number;
  options?: { value: string; label: string }[];
  /** Class name appended to the wrapper div. */
  className?: string;
}

// Allow any standard HTML input attribute to pass through (step, min, max,
// maxLength, aria-describedby, pattern, etc.) without having to enumerate them
// all in the interface.
type FormFieldProps = FormFieldBaseProps &
  Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    keyof FormFieldBaseProps | 'size'
  >;

const baseInputClasses =
  'input w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 ' +
  'placeholder-gray-400 shadow-sm transition-colors focus:outline-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ' +
  'focus-visible:ring-offset-2 focus-visible:border-blue-500 ' +
  'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500';

const errorInputClasses =
  'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500';

export function FormField({
  label,
  id: idProp,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  hint,
  as = 'input',
  rows = 3,
  options,
  className,
  ...rest
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = idProp ?? generatedId;
  const errorId = `${fieldId}-error`;
  const inputClasses = `${baseInputClasses}${error ? ` ${errorInputClasses}` : ''}`;

  return (
    <div className={`flex flex-col gap-1${className ? ` ${className}` : ''}`}>
      <label
        htmlFor={fieldId}
        className="label text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {as === 'textarea' ? (
        <textarea
          id={fieldId}
          name={name}
          value={value}
          onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={inputClasses}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : as === 'select' ? (
        <select
          id={fieldId}
          name={name}
          value={value}
          onChange={onChange as React.ChangeEventHandler<HTMLSelectElement>}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={inputClasses}
          {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={fieldId}
          name={name}
          type={type}
          value={value}
          onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={inputClasses}
          {...rest}
        />
        {error && (
          <p id={errorId} className="text-xs text-red-500 mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

      {hint && <span className="text-xs text-gray-500">{hint}</span>}

      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Keep the default export for any file that still imports it that way.
export default FormField;
