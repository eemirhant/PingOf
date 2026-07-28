import Link from "next/link";

import { AuthLink, AuthLogo, AuthShell } from "@/components/auth/auth-shell";

export default function JoinPlaceholderPage() {
  return (
    <AuthShell>
      <AuthLogo />
      <p className="text-text-secondary mb-6 text-center text-sm">
        Organizasyona katılmak için size gönderilen davet linkini kullanın. Link şu formatta olur:
      </p>
      <p className="mb-6 text-center font-mono text-sm text-text-accent">/join/AbC123xY</p>
      <p className="text-text-muted text-center text-sm">
        Yeni bir organizasyon mu kurmak istiyorsun?{" "}
        <AuthLink href="/register">Organizasyon oluştur</AuthLink>
      </p>
      <p className="text-text-muted mt-4 text-center text-sm">
        <Link href="/login" className="auth-link font-semibold text-text-accent">
          Giriş sayfasına dön
        </Link>
      </p>
    </AuthShell>
  );
}
