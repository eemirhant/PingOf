"use client";

import { useActionState } from "react";

import { AuthLink, AuthShell, BackLink } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
import { resetPasswordAction, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

type ResetPasswordFormProps = {
  token: string;
  isValid: boolean;
};

export function ResetPasswordForm({ token, isValid }: ResetPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);

  if (!isValid) {
    return (
      <AuthShell>
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border text-2xl"
            style={{
              background: "rgba(244,63,94,0.12)",
              borderColor: "rgba(244,63,94,0.25)",
            }}
          >
            ⛔
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Geçersiz bağlantı
          </h2>
          <p className="text-text-secondary mt-2 text-sm">
            Bu sıfırlama linki geçersiz, kullanılmış veya süresi dolmuş.
          </p>
          <p className="text-text-muted mt-6 text-sm">
            <AuthLink href="/forgot-password">Yeni link iste</AuthLink>
            {" · "}
            <AuthLink href="/login">Giriş yap</AuthLink>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-7">
        <BackLink href="/login">Giriş sayfasına dön</BackLink>
        <div className="mt-6 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border text-2xl"
            style={{
              background: "rgba(99,102,241,0.15)",
              borderColor: "rgba(99,102,241,0.3)",
            }}
          >
            🔑
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Yeni şifre belirle</h2>
          <p className="text-text-secondary mt-2 text-[0.9rem]">
            Büyük/küçük harf, rakam ve özel karakter içeren güçlü bir şifre gir.
          </p>
        </div>
      </div>

      <form action={formAction}>
        <input type="hidden" name="token" value={token} />

        <PasswordField
          label="Yeni şifre"
          name="password"
          placeholder="Güçlü bir şifre oluştur"
          autoComplete="new-password"
          showStrength
          error={state.fieldErrors?.password?.[0]}
        />

        <PasswordField
          label="Şifre tekrar"
          name="confirmPassword"
          placeholder="Şifreni tekrar gir"
          autoComplete="new-password"
          error={state.fieldErrors?.confirmPassword?.[0]}
        />

        {state.error ? (
          <p
            className="form-error mb-4 rounded-md border border-red/20 bg-red/10 px-3 py-2"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}

        <Button type="submit" fullWidth size="lg" disabled={isPending}>
          {isPending ? "Kaydediliyor…" : "Şifreyi Güncelle"}
        </Button>
      </form>
    </AuthShell>
  );
}
