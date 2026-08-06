# Cloudflare Tunnel Removal Report

**Tarih:** 2026-08-05  
**Amaç:** Geçici Cloudflare Tunnel desteğini kaldırıp standart `npm run dev` + ileride Vercel Preview’a dönmek.

> Not: Push sağlayıcı katmanı sonradan tamamen kaldırıldı; FCM entegrasyonu sonraki adımdır.

---

## Silinen dosyalar

| Dosya |
|---|
| `scripts/dev-https.mjs` |
| `scripts/tunnel.mjs` |
| `scripts/stop-tunnel.mjs` |
| `scripts/lib/tunnel-env.mjs` |
| `scripts/lib/*-sync-origin.mjs` |
| `src/app/api/dev/tunnel/route.ts` |
| `src/app/api/dev/*-sync-origin/route.ts` |
| `src/lib/*/sync-web-origin.ts` |
| `src/components/dev/dev-mobile-push-probe.tsx` |
| `LOCALHOST_REDIRECT_REPORT.md` |
| Eski push origin / push fix raporları |
| `.tunnel-url` / `.tunnel.pid` / `.dev-https-next.pid` |
| `.env.development.local` (tunnel-managed AUTH_URL) |
| `src/app/api/dev/` (boş klasör) |
| `src/components/dev/` (boş klasör) |

---

## Güncellenen dosyalar

| Dosya | Değişiklik |
|---|---|
| `package.json` | `dev:https`, `tunnel`, `stop:tunnel` kaldırıldı |
| `start.bat` / `stop.bat` | Tekrar `npm run dev` + port 3000 temizliği |
| `README.md` | Tunnel bölümü → Vercel Preview mobil HTTPS notu |
| `.env.example` | Tunnel / org-sync / trycloudflare notları temizlendi |
| `.gitignore` | `.tunnel-*` girdileri kaldırıldı |
| `src/lib/dev/public-url.ts` | `.tunnel-url` / https-tunnel önceliği kaldırıldı |
| Push origin allowlist / provider | Tunnel whitelist ve Site URL sync kaldırıldı |
| `src/app/layout.tsx` | `DevMobilePushProbe` kaldırıldı |
| `src/middleware.ts` | `api/dev` matcher istisnası kaldırıldı |
| `src/lib/url/safe-path.test.ts` | Örnek URL sadeleştirildi |

---

## Kaldırılan environment değişkenleri / kavramlar

- `NEXT_PUBLIC_ENVIRONMENT=https-tunnel`
- Tunnel’ın yazdığı `.env.development.local` (`AUTH_URL` = trycloudflare)
- Tunnel Site URL sync anahtarları
- `NEXT_PUBLIC_PRODUCTION_ORIGIN` örnek notu (gerekirse APP_URL yeterli)

**Kalan (standart):** `AUTH_TRUST_HOST`, opsiyonel `AUTH_URL` / `NEXT_PUBLIC_APP_URL`.

---

## Kaldırılan npm scriptleri

- `dev:https`
- `tunnel`
- `stop:tunnel`

---

## Kaldırılan Cloudflare Tunnel kodları (özet)

- cloudflared spawn / trycloudflare URL parse
- `.tunnel-url` okuma
- Tunnel env writer
- Dev tunnel + origin-sync API route’ları
- Mobil push probe (tunnel diagnostic)
- Origin allowlist’te `*.trycloudflare.com` / ngrok

---

## Korunan (bilinçli)

- PWA manifest / offline SW
- Auth.js `trustHost` + `getRequestOrigin()` (Vercel Preview / prod için yararlı)
- `toSafeInternalPath` (open-redirect güvenliği)
- Uygulama içi bildirim sistemi (DB + realtime + tercihler)

---

## Uygulamaya etki

| Alan | Etki |
|---|---|
| Yerel geliştirme | `npm run dev` / `start.bat` → `http://localhost:3000` |
| Mobil HTTPS | Cloudflare Tunnel yok; **Vercel Preview** kullanın |
| Push | Sağlayıcı katmanı kaldırıldı; FCM sonraki adım |
| Auth.js | Standart Host/`AUTH_URL`; tunnel redirect hileleri yok |

---

## Doğrulama

- `npm run lint` / `npm run typecheck` / `npm run build` — tunnel sonrası temiz geçmeli
