import React, { useId } from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/**
 * Accessible form field: auto-generates a stable id so the <label> htmlFor
 * is always linked to its <input> (fixes #156, #157).
 */
export function FormField({ label, id: idProp, ...props }: FormFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} className="input" {...props} />
    </div>
  );
}