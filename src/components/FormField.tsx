import React, { useId } from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormField({ label, id, ...props }: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div>
      <label className="label" htmlFor={inputId}>{label}</label>
      <input id={inputId} className="input" {...props} />
    </div>
  );
}