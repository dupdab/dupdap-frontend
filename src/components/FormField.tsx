import React, { useId } from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: React.ReactNode;
}

export function FormField({ label, id, hint, ...props }: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label" htmlFor={inputId}>{label}</label>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      <input id={inputId} className="input" {...props} />
    </div>
  );
}
