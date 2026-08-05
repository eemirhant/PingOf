"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import {
  AuthDivider,
  AuthLink,
  AuthLogo,
  AuthShell,
} from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { EmailField } from "@/components/ui/email-field";
import { PasswordField } from "@/components/ui/password-field";
import { loginAction, type AuthActionState } from "@/lib/actions/auth";
import { toSafeInternalPath } from "@/lib/url/safe-path";

const initialState: AuthActionState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = toSafeInternalPath(searchParams.get("callbackUrl"), "/");
  const resetSuccess = searchParams.get("reset") === "success";
  const sessionCleared = searchParams.get("cleared") === "1";
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <AuthShell>
      <AuthLogo />

      {sessionCleared ? (
        <div
          className="mb-5 rounded-md border px-3.5 py-3 text-center text-sm text-accent-light"
          style={{
            background: "rgba(99,102,241,0.1)",
            borderColor: "rgba(99,102,241,0.25)",
          }}
          role="status"
        >
          Oturum çerezi temizlendi. Tekrar giriş yapabilirsin.
        </div>
      ) : (
        <div className="mb-5 rounded-md border border-border bg-white/[0.03] px-3.5 py-3 text-center text-sm">
          <p className="text-text-secondary mb-2">
            Site açılmıyor veya sürekli hata mı veriyor?
          </p>
          <a href="/clear-session" className="btn btn-secondary btn-sm inline-flex">
            Oturumu temizle ve düzelt
          </a>
        </div>
      )}

      {resetSuccess ? (
        <div
          className="mb-5 rounded-md border px-3.5 py-3 text-center text-sm text-green"
          style={{
            background: "rgba(16,185,129,0.08)",
            borderColor: "rgba(16,185,129,0.2)",
          }}
          role="status"
        >
          Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.
        </div>
      ) : null}

      <form action={formAction} className="space-y-1">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <EmailField
          label="E-posta adresi"
          name="email"
          placeholder="ahmet@sirket.com"
          error={state.fieldErrors?.email?.[0]}
        />

        <PasswordField
          label="Şifre"
          name="password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={state.fieldErrors?.password?.[0]}
          labelAction={<AuthLink href="/forgot-password">Şifremi unuttum</AuthLink>}
        />

        {state.error ? (
          <p className="form-error mb-4 rounded-md border border-red/20 bg-red/10 px-3 py-2" role="alert">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" fullWidth size="lg" disabled={isPending} className="mt-2">
          {isPending ? "Giriş yapılıyor…" : "Giriş Yap"}
        </Button>
      </form>

      <AuthDivider />

      <p className="text-text-secondary text-center text-[0.9rem]">
        Hesabın yok mu? <AuthLink href="/register">Organizasyon oluştur</AuthLink>
      </p>
      <p className="text-text-muted mt-3 text-center text-sm">
        Davet linki mi aldın? <AuthLink href="/join">Buradan katıl</AuthLink>
      </p>
    </AuthShell>
  );
}
