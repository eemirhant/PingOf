import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";

type FormFieldProps = {
  label: ReactNode;
  name: string;
  type?: string;
  placeholder?: string;
  helper?: string;
  error?: string;
  autoComplete?: string;
  defaultValue?: string;
};

export function FormField({
  label,
  name,
  type = "text",
  placeholder,
  helper,
  error,
  autoComplete,
  defaultValue,
}: FormFieldProps) {
  return (
    <div className="form-group mb-4">
      <label htmlFor={name} className="form-label">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        hasError={Boolean(error)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : helper ? `${name}-helper` : undefined}
      />
      {error ? (
        <p id={`${name}-error`} className="form-error">
          {error}
        </p>
      ) : helper ? (
        <p id={`${name}-helper`} className="form-helper">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
