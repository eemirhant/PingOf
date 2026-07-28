import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

export function Input({ hasError, className = "", ...props }: InputProps) {
  return (
    <input
      className={`form-input ${hasError ? "error" : ""} ${className}`.trim()}
      {...props}
    />
  );
}
