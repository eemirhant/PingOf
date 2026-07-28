"use client";

import { useActionState } from "react";

import {
  AuthLink,
  AuthShell,
  BackLink,
} from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { registerAction, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState);

  return (
    <AuthShell maxWidth="lg">
      <div className="mb-7">
        <BackLink href="/login">Giriş sayfasına dön</BackLink>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-text-primary">
          Yeni organizasyon oluştur
        </h2>
        <p className="text-text-secondary mt-1.5 text-[0.9rem]">
          Ofisini PingOf&apos;a ekle, hemen oynamaya başla.
        </p>
      </div>

      <div className="border-accent/20 bg-accent/8 mb-5 rounded-md border px-4 py-3.5">
        <p className="text-accent-light text-sm font-medium">
          👑 Sen organizasyonun <strong>kurucusu</strong> olacaksın.
        </p>
      </div>

      <form action={formAction}>
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
          label="Organizasyon adı"
          name="organizationName"
          type="text"
          placeholder="Teknoloji A.Ş."
          helper="Çalıştığın şirket veya takım adı"
          autoComplete="organization"
          error={state.fieldErrors?.organizationName?.[0]}
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

        <FormField
          label="Şifre tekrar"
          name="confirmPassword"
          type="password"
          placeholder="Şifreni tekrar gir"
          autoComplete="new-password"
          error={state.fieldErrors?.confirmPassword?.[0]}
        />

        {state.error ? (
          <p className="form-error mb-4 rounded-md border border-red/20 bg-red/10 px-3 py-2" role="alert">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" fullWidth size="lg" disabled={isPending} className="mt-2">
          {isPending ? "Oluşturuluyor…" : "Organizasyonu Oluştur"}
        </Button>
      </form>

      <p className="text-text-muted mt-4 text-center text-sm">
        Zaten hesabın var mı? <AuthLink href="/login">Giriş yap</AuthLink>
      </p>
    </AuthShell>
  );
}
