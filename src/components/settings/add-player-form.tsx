"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmailField } from "@/components/ui/email-field";
import { FormField } from "@/components/ui/form-field";
import { InlineSuccess } from "@/components/ui/inline-success";
import { PasswordField } from "@/components/ui/password-field";
import { addPlayerAction, type AddPlayerActionState } from "@/lib/actions/players";

const initialState: AddPlayerActionState = {};

export function AddPlayerForm() {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, isPending] = useActionState(addPlayerAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setFormKey((value) => value + 1);
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
        <form key={formKey} ref={formRef} action={formAction} className="mt-4">
          <FormField
            label="Ad soyad"
            name="fullName"
            type="text"
            placeholder="Mehmet Kaya"
            autoComplete="name"
            error={state.fieldErrors?.fullName?.[0]}
          />

          <EmailField
            label="E-posta adresi"
            name="email"
            placeholder="mehmet@sirket.com"
            error={state.fieldErrors?.email?.[0]}
          />

          <PasswordField
            label="Geçici şifre"
            name="temporaryPassword"
            placeholder="Güçlü bir geçici şifre"
            autoComplete="new-password"
            showStrength
            helper="Oyuncu bu şifre ile giriş yapabilir. İlk girişte değiştirmesi önerilir (zorunlu değil)."
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
            <InlineSuccess trigger={state.success} message={state.success} />
          ) : null}

          <Button type="submit" variant="primary" size="sm" loading={isPending}>
            {isPending ? "Ekleniyor…" : "Oyuncuyu Ekle"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
