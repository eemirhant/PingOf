"use client";

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Input } from "@/components/ui/input";
import {
  analyzePasswordStrength,
  type PasswordStrengthLevel,
} from "@/lib/validations/password-strength";

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "name" | "id"
> & {
  name: string;
  label: ReactNode;
  helper?: string;
  error?: string;
  id?: string;
  /** Show strength meter + checklist (new-password flows). */
  showStrength?: boolean;
  /** Optional action rendered on the right side of the label (e.g. forgot link). */
  labelAction?: ReactNode;
};

const STRENGTH_BAR_COLORS: Record<PasswordStrengthLevel, string> = {
  very_weak: "var(--color-red)",
  weak: "var(--color-orange)",
  medium: "var(--color-yellow)",
  strong: "var(--color-green)",
};

const STRENGTH_WIDTH: Record<PasswordStrengthLevel, string> = {
  very_weak: "25%",
  weak: "50%",
  medium: "75%",
  strong: "100%",
};

const CHECKLIST_ITEMS: Array<{
  key: keyof ReturnType<typeof analyzePasswordStrength>["checklist"];
  label: string;
}> = [
  { key: "minLength", label: "En az 8 karakter" },
  { key: "uppercase", label: "Büyük harf" },
  { key: "lowercase", label: "Küçük harf" },
  { key: "digit", label: "Rakam" },
  { key: "special", label: "Özel karakter" },
];

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.4 17.4 0 0 1-3.2 4.4" />
      <path d="M6.1 6.1C4 7.7 2.5 10 2 12c0 0 3.5 7 10 7a10.4 10.4 0 0 0 4.4-1" />
    </svg>
  );
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(
    {
      name,
      label,
      helper,
      error,
      id,
      showStrength = false,
      labelAction,
      defaultValue = "",
      onChange,
      onKeyDown,
      onKeyUp,
      onBlur,
      className,
      autoComplete = "current-password",
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? name ?? generatedId;
    const [visible, setVisible] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);
    const [value, setValue] = useState(String(defaultValue ?? ""));

    const strength = showStrength ? analyzePasswordStrength(value) : null;

    function updateCapsLock(event: KeyboardEvent<HTMLInputElement>) {
      if (typeof event.getModifierState === "function") {
        setCapsLockOn(event.getModifierState("CapsLock"));
      }
    }

    const describedBy = [
      error ? `${inputId}-error` : null,
      !error && helper ? `${inputId}-helper` : null,
      capsLockOn ? `${inputId}-caps` : null,
      showStrength ? `${inputId}-strength` : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="form-group mb-4">
        <label
          htmlFor={inputId}
          className={`form-label ${labelAction ? "flex items-center justify-between gap-2" : ""}`}
        >
          <span>{label}</span>
          {labelAction}
        </label>

        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            name={name}
            type={visible ? "text" : "password"}
            autoComplete={autoComplete}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            defaultValue={defaultValue}
            hasError={Boolean(error)}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy || undefined}
            className={`pr-12 ${className ?? ""}`.trim()}
            {...props}
            onChange={(event) => {
              setValue(event.target.value);
              onChange?.(event);
            }}
            onKeyDown={(event) => {
              updateCapsLock(event);
              onKeyDown?.(event);
            }}
            onKeyUp={(event) => {
              updateCapsLock(event);
              onKeyUp?.(event);
            }}
            onBlur={(event) => {
              setCapsLockOn(false);
              onBlur?.(event);
            }}
          />

          <button
            type="button"
            className="text-text-muted hover:text-text-secondary absolute top-1/2 right-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
            onClick={() => setVisible((prev) => !prev)}
            aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
            aria-pressed={visible}
            tabIndex={0}
          >
            <EyeIcon open={visible} />
          </button>
        </div>

        {capsLockOn ? (
          <p
            id={`${inputId}-caps`}
            className="mt-2 text-[0.8125rem] text-yellow"
            role="status"
          >
            Caps Lock açık görünüyor.
          </p>
        ) : null}

        {showStrength && value ? (
          <div id={`${inputId}-strength`} className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-muted text-xs">Şifre gücü</span>
              <span
                className="text-xs font-medium"
                style={{ color: STRENGTH_BAR_COLORS[strength!.level] }}
              >
                {strength!.label}
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full"
              style={{ background: "rgb(255 255 255 / 0.08)" }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={4}
              aria-valuenow={
                strength!.level === "very_weak"
                  ? 1
                  : strength!.level === "weak"
                    ? 2
                    : strength!.level === "medium"
                      ? 3
                      : 4
              }
              aria-label={`Şifre gücü: ${strength!.label}`}
            >
              <div
                className="h-full rounded-full transition-all duration-200 ease-out"
                style={{
                  width: STRENGTH_WIDTH[strength!.level],
                  background: STRENGTH_BAR_COLORS[strength!.level],
                }}
              />
            </div>

            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {CHECKLIST_ITEMS.map((item) => {
                const met = strength!.checklist[item.key];
                return (
                  <li
                    key={item.key}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${
                      met ? "text-green-light" : "text-text-muted"
                    }`}
                  >
                    <span aria-hidden="true">{met ? "✓" : "○"}</span>
                    <span>{item.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {error ? (
          <p id={`${inputId}-error`} className="form-error" role="alert">
            {error}
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
