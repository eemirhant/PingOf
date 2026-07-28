"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { changePasswordAction, type ProfileActionState } from "@/lib/actions/profile";

const initialState: ProfileActionState = {};

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction}>
      <div className="card-title">Şifre Değiştir</div>

      <FormField
        label="Mevcut şifre"
        name="currentPassword"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        error={state.fieldErrors?.currentPassword?.[0]}
      />

      <FormField
        label="Yeni şifre"
        name="newPassword"
        type="password"
        placeholder="En az 8 karakter"
        helper="En az 8 karakter olmalı"
        autoComplete="new-password"
        error={state.fieldErrors?.newPassword?.[0]}
      />

      <FormField
        label="Yeni şifre tekrar"
        name="confirmPassword"
        type="password"
        placeholder="Şifreyi tekrar gir"
        autoComplete="new-password"
        error={state.fieldErrors?.confirmPassword?.[0]}
      />

      {state.error ? (
        <p className="form-error mb-4 rounded-md border border-red/20 bg-red/10 px-3 py-2" role="alert">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          className="mb-4 rounded-md border px-3 py-2 text-sm text-green"
          style={{
            background: "rgba(16,185,129,0.08)",
            borderColor: "rgba(16,185,129,0.2)",
          }}
          role="status"
        >
          ✅ {state.success}
        </p>
      ) : null}

      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? "Güncelleniyor…" : "Şifreyi Güncelle"}
      </Button>
    </form>
  );
}
