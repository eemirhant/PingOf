"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PingOf] app error:", error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="bg-[#0a0b0f] text-white">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-bold">Bir hata oluştu</h1>
          <p className="text-sm text-white/70">
            {error.message || "Beklenmeyen bir istemci hatası."}
          </p>
          {error.digest ? (
            <p className="text-xs text-white/40">Kod: {error.digest}</p>
          ) : null}
          <button
            type="button"
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold"
            onClick={reset}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
