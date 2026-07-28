"use client";

import { useActionState } from "react";

import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import type { AuthActionState } from "@/lib/actions/auth";
import { joinAction } from "@/lib/actions/join";

const initialState: AuthActionState = {};

type JoinFormProps = {
  inviteCode: string;
  organizationName: string;
};

export function JoinForm({ inviteCode, organizationName }: JoinFormProps) {
  const [state, formAction, isPending] = useActionState(joinAction, initialState);

  return (
    <AuthShell>
      <div className="auth-logo mb-8 text-center">
        <div
          className="auth-logo-icon"
          style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
          }}
        >
          🎉
        </div>
        <h1 className="auth-title text-text-primary">Davet edildin!</h1>
        <p className="auth-subtitle text-text-secondary">
          <strong className="text-text-primary">{organizationName}</strong> organizasyonuna katılmak
          için kaydol.
        </p>
      </div>

      <div
        className="mb-5 rounded-md border px-4 py-3.5 text-center"
        style={{
          background: "rgba(16,185,129,0.08)",
          borderColor: "rgba(16,185,129,0.2)",
        }}
      >
        <span className="text-sm text-green">
          ✅ Davet kodu geçerli: <strong className="font-mono">{inviteCode}</strong>
        </span>
      </div>

      <form action={formAction}>
        <input type="hidden" name="inviteCode" value={inviteCode} />

        <FormField
          label="Ad soyad"
          name="fullName"
          type="text"
          placeholder="Ahmet Yılmaz"
          autoComplete="name"
          error={state.fieldErrors?.fullName?.[0]}
        />

        <FormField
          label="E-posta adresi"
          name="email"
          type="email"
          placeholder="ahmet@sirket.com"
          autoComplete="email"
          error={state.fieldErrors?.email?.[0]}
        />

        <FormField
          label="Şifre"
          name="password"
          type="password"
          placeholder="En az 8 karakter"
          helper="En az 8 karakter olmalı"
          autoComplete="new-password"
          error={state.fieldErrors?.password?.[0]}
        />

        {state.error ? (
          <p
            className="form-error mb-4 rounded-md border border-red/20 bg-red/10 px-3 py-2"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}

        <Button type="submit" variant="success" fullWidth size="lg" disabled={isPending}>
          {isPending ? "Katılınıyor…" : "🏓 Organizasyona Katıl"}
        </Button>
      </form>

      <p className="text-text-muted mt-4 text-center text-[0.8125rem]">
        Zaten hesabın var mı? <AuthLink href="/login">Giriş yap</AuthLink>
      </p>
    </AuthShell>
  );
}
