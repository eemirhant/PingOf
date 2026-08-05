# Cloudflare Tunnel Removal Report

**Tarih:** 2026-08-05  
**Amaç:** Geçici Cloudflare Tunnel desteğini kaldırıp standart `npm run dev` + ileride Vercel Preview’a dönmek.

---

## Silinen dosyalar

| Dosya |
|---|
| `scripts/dev-https.mjs` |
| `scripts/tunnel.mjs` |
| `scripts/stop-tunnel.mjs` |
| `scripts/lib/tunnel-env.mjs` |
| `scripts/lib/onesignal-sync-origin.mjs` |
| `src/app/api/dev/tunnel/route.ts` |
| `src/app/api/dev/onesignal-sync-origin/route.ts` |
| `src/lib/onesignal/sync-web-origin.ts` |
| `src/components/dev/dev-mobile-push-probe.tsx` |
| `LOCALHOST_REDIRECT_REPORT.md` |
| `ONESIGNAL_ORIGIN_REPORT.md` |
| `ONESIGNAL_PUSH_FIX_REPORT.md` |
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
| `src/lib/onesignal/allowed-origin.ts` | trycloudflare / ngrok whitelist kaldırıldı |
| `src/lib/onesignal/allowed-origin.test.ts` | Tunnel testleri kaldırıldı |
| `src/components/onesignal/onesignal-provider.tsx` | Dashboard Site URL sync API çağrıları kaldırıldı |
| `src/app/layout.tsx` | `DevMobilePushProbe` kaldırıldı |
| `src/middleware.ts` | `api/dev` matcher istisnası kaldırıldı |
| `src/lib/url/safe-path.test.ts` | Örnek URL sadeleştirildi |

---

## Kaldırılan environment değişkenleri / kavramlar

- `NEXT_PUBLIC_ENVIRONMENT=https-tunnel`
- Tunnel’ın yazdığı `.env.development.local` (`AUTH_URL` = trycloudflare)
- `ONESIGNAL_ORGANIZATION_API_KEY` / `ONESIGNAL_ORGANIZATION_ID` (yalnızca tunnel Site URL sync için dokümante edilmişti)
- `NEXT_PUBLIC_PRODUCTION_ORIGIN` örnek notu (gerekirse APP_URL yeterli)

**Kalan (standart):** `AUTH_TRUST_HOST`, opsiyonel `AUTH_URL` / `NEXT_PUBLIC_APP_URL`, OneSignal App ID + REST key.

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
- Dev tunnel + onesignal-sync API route’ları
- Mobil push probe (tunnel diagnostic)
- Origin allowlist’te `*.trycloudflare.com` / ngrok

---

## Korunan (bilinçli)

- OneSignal init + root SW (`/OneSignalSDKWorker.js`)
- PWA manifest / offline SW
- Auth.js `trustHost` + `getRequestOrigin()` (Vercel Preview / prod için yararlı)
- `toSafeInternalPath` (open-redirect güvenliği)

---

## Uygulamaya etki

| Alan | Etki |
|---|---|
| Yerel geliştirme | `npm run dev` / `start.bat` → `http://localhost:3000` |
| Mobil HTTPS push | Cloudflare Tunnel yok; **Vercel Preview** kullanın |
| OneSignal | Mevcut origin + Dashboard Site URL; tunnel sync yok |
| Auth.js | Standart Host/`AUTH_URL`; tunnel redirect hileleri yok |

---

## Doğrulama

- [x] Cloudflare / trycloudflare / `dev:https` grep temiz
- [x] `npm run typecheck`
- [x] `npm run test` (allowed-origin + safe-path)
