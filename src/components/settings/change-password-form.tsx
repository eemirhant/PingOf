"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { InlineSuccess } from "@/components/ui/inline-success";
import { PasswordField } from "@/components/ui/password-field";
import { changePasswordAction, type ProfileActionState } from "@/lib/actions/profile";

const initialState: ProfileActionState = {};

export function ChangePasswordForm() {
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setFormKey((value) => value + 1);
    }
  }, [state.success]);

  return (
    <form key={formKey} ref={formRef} action={formAction}>
      <div className="card-title">Şifre Değiştir</div>

      <PasswordField
        label="Mevcut şifre"
        name="currentPassword"
        placeholder="••••••••"
        autoComplete="current-password"
        error={state.fieldErrors?.currentPassword?.[0]}
      />

      <PasswordField
        label="Yeni şifre"
        name="newPassword"
        placeholder="Güçlü bir şifre oluştur"
        autoComplete="new-password"
        showStrength
        error={state.fieldErrors?.newPassword?.[0]}
      />

      <PasswordField
        label="Yeni şifre tekrar"
        name="confirmPassword"
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
        <InlineSuccess trigger={state.success} message={state.success} />
      ) : null}

      <Button type="submit" variant="secondary" size="sm" loading={isPending}>
        {isPending ? "Güncelleniyor…" : "Şifreyi Güncelle"}
      </Button>
    </form>
  );
}
