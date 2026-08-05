import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { hasError, className = "", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`form-input ${hasError ? "error" : ""} ${className}`.trim()}
      {...props}
    />
  );
});
