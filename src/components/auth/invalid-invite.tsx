import Link from "next/link";

import { AuthLink, AuthShell } from "@/components/auth/auth-shell";

export function InvalidInviteCard({ code }: { code?: string }) {
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
        <h1 className="auth-title text-text-primary">Bu davet geçersiz</h1>
        <p className="text-text-secondary mt-2 text-sm">
          Davet linki sıfırlanmış veya hatalı olabilir.
          {code ? (
            <>
              {" "}
              Kod: <span className="font-mono text-text-muted">{code}</span>
            </>
          ) : null}
        </p>
        <p className="text-text-muted mt-6 text-sm">
          <AuthLink href="/login">Giriş yap</AuthLink>
          {" · "}
          <Link href="/register" className="auth-link font-semibold text-text-accent">
            Yeni organizasyon oluştur
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
