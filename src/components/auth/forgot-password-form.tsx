"use client";

import { useActionState } from "react";

import { AuthShell, BackLink } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { forgotPasswordAction, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState);

  return (
    <AuthShell>
      <div className="mb-7">
        <BackLink href="/login">Geri dön</BackLink>
        <div className="mt-6 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border text-2xl"
            style={{
              background: "rgba(234,179,8,0.15)",
              borderColor: "rgba(234,179,8,0.3)",
            }}
          >
            🔐
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Şifremi Unuttum</h2>
          <p className="text-text-secondary mt-2 text-[0.9rem]">
            E-posta adresini gir, sıfırlama linki gönderelim.
          </p>
        </div>
      </div>

      {state.success ? (
        <div
          className="rounded-md border px-3.5 py-3.5 text-center"
          style={{
            background: "rgba(16,185,129,0.08)",
            borderColor: "rgba(16,185,129,0.2)",
          }}
          role="status"
        >
          <p className="text-sm text-green">{state.success}</p>
          <p className="text-text-muted mt-2 text-xs">
            Geliştirme ortamında link sunucu konsoluna yazılır.
          </p>
        </div>
      ) : (
        <form action={formAction}>
          <FormField
            label="E-posta adresi"
            name="email"
            type="email"
            placeholder="ahmet@sirket.com"
            autoComplete="email"
            error={state.fieldErrors?.email?.[0]}
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
            {isPending ? "Gönderiliyor…" : "Sıfırlama Linki Gönder"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
