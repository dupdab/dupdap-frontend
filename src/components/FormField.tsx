import React, { useId } from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormField({ label, id: idProp, ...props }: FormFieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;

  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="input" {...props} />
    </div>
  );
}
