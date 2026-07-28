"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { addPlayerAction, type AddPlayerActionState } from "@/lib/actions/players";

const initialState: AddPlayerActionState = {};

export function AddPlayerForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(addPlayerAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <div>
      <div className="card-title mb-0 flex items-center justify-between">
        <span>Üye Ekle</span>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Kapat" : "+ Üye Ekle"}
        </button>
      </div>

      {open ? (
        <form ref={formRef} action={formAction} className="mt-4">
          <FormField
            label="Ad soyad"
            name="fullName"
            type="text"
            placeholder="Mehmet Kaya"
            autoComplete="name"
            error={state.fieldErrors?.fullName?.[0]}
          />

          <FormField
            label="E-posta adresi"
            name="email"
            type="email"
            placeholder="mehmet@sirket.com"
            autoComplete="email"
            error={state.fieldErrors?.email?.[0]}
          />

          <FormField
            label="Geçici şifre"
            name="temporaryPassword"
            type="password"
            placeholder="En az 8 karakter"
            helper="Oyuncu bu şifre ile giriş yapabilir. İlk girişte değiştirmesi önerilir (zorunlu değil)."
            autoComplete="new-password"
            error={state.fieldErrors?.temporaryPassword?.[0]}
          />

          {state.error ? (
            <p
              className="form-error mb-4 rounded-md border border-red/20 bg-red/10 px-3 py-2"
              role="alert"
            >
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

          <Button type="submit" variant="primary" size="sm" disabled={isPending}>
            {isPending ? "Ekleniyor…" : "Oyuncuyu Ekle"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
