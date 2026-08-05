"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PingOf] route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-bold text-text-primary">Bir hata oluştu</h1>
      <p className="text-text-secondary text-sm">
        {error.message || "Sayfa yüklenirken beklenmeyen bir hata oluştu."}
      </p>
      {error.digest ? (
        <p className="text-text-muted text-xs">Kod: {error.digest}</p>
      ) : null}
      <button type="button" className="btn btn-primary" onClick={reset}>
        Tekrar dene
      </button>
      <a href="/clear-session" className="text-accent-light text-sm">
        Oturumu temizle
      </a>
    </div>
  );
}
