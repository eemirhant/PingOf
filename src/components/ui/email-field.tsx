"use client";

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { Input } from "@/components/ui/input";
import { emailSchema } from "@/lib/validations/auth";

type EmailFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "name" | "id"
> & {
  name: string;
  label: ReactNode;
  helper?: string;
  error?: string;
  id?: string;
};

function getLiveEmailError(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const result = emailSchema.safeParse(value);
  if (result.success) return undefined;
  return result.error.issues[0]?.message ?? "Geçerli bir e-posta adresi giriniz.";
}

export const EmailField = forwardRef<HTMLInputElement, EmailFieldProps>(
  function EmailField(
    {
      name,
      label,
      helper,
      error: serverError,
      id,
      defaultValue,
      onBlur,
      onChange,
      className,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? name ?? generatedId;
    const [liveError, setLiveError] = useState<string | undefined>();
    const [touched, setTouched] = useState(false);

    const displayError = touched ? liveError : (liveError ?? serverError);

    return (
      <div className="form-group mb-4">
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
        <Input
          ref={ref}
          id={inputId}
          name={name}
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          defaultValue={defaultValue}
          hasError={Boolean(displayError)}
          aria-invalid={Boolean(displayError)}
          aria-describedby={
            displayError
              ? `${inputId}-error`
              : helper
                ? `${inputId}-helper`
                : undefined
          }
          className={className}
          {...props}
          onChange={(event) => {
            const next = event.target.value;
            setTouched(true);
            setLiveError(getLiveEmailError(next));
            onChange?.(event);
          }}
          onBlur={(event) => {
            const normalized = event.target.value.trim().toLowerCase();
            if (event.target.value !== normalized) {
              event.target.value = normalized;
            }
            setTouched(true);
            setLiveError(getLiveEmailError(normalized));
            onBlur?.(event);
          }}
        />
        {displayError ? (
          <p id={`${inputId}-error`} className="form-error" role="alert">
            {displayError}
          </p>
        ) : helper ? (
          <p id={`${inputId}-helper`} className="form-helper">
            {helper}
          </p>
        ) : null}
      </div>
    );
  },
);
