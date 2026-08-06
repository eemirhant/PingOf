# Definition of Done — PingOf v1 (PRD §10)

Tarih: 2026-07-28

## Otomatik kalite kapısı

| Komut | Sonuç |
|---|---|
| `npm test` | PASS — 75 test |
| `npm run lint` | PASS |
| `npm run typecheck` (`tsc --noEmit`) | PASS |
| `npm run build` | PASS — Next.js 15.5 production build |

## HTTP / PWA smoke (production `npm run start`)

| Kontrol | Sonuç |
|---|---|
| `/login`, `/register`, `/forgot-password` | 200 |
| Korumalı route’lar (`/`, `/matches`, `/tournaments`, …) | 302 → `/login` |
| `/manifest.webmanifest` | 200 `application/manifest+json` (HTML değil) |
| `/sw.js`, `/offline.html`, `/icons/icon-192.png` | 200 |

## Manuel UI smoke (375px + masaüstü)

Aşağıdakiler staging veya yerel oturumla doğrulanmalı (tarayıcı DevTools 375×812 + ≥1280):

- [ ] Kayıt / giriş / çıkış
- [ ] Davet + join; OWNER üye ekleme
- [ ] Anlık 1v1/2v2 maç + skor hataları
- [ ] Planlı maç (DarkSelect, saat kilidi)
- [ ] Meydan okuma kabul/red
- [ ] Maç düzenle/sil onay
- [ ] İddia + ödendi/ödenmedi + profil ödenmemiş listesi
- [ ] Profil / sıralama / dashboard / bildirimler
- [ ] Turnuva oluştur → başlat → sonuç → tamamlandı
- [ ] BAY (3 kişilik tek eleme)
- [ ] PWA: Ana ekrana ekle (prod); offline sayfa
- [ ] Web Push: Ayarlar → Bildirimleri aç → sekme kapalıyken meydan okuma/maç sonucu OS bildirimi

## Staging

Hazırlık kodda tamam (`vercel.json`, `npm run vercel-build`, `postinstall`).

Adım adım: [STAGING.md](STAGING.md)

| Madde | Durum |
|---|---|
| Git repo (`main`) | PASS — `08757d5` |
| GitHub remote / push | BEKLIYOR — `gh auth login` gerekli |
| Neon DB | BEKLIYOR — hesap |
| Vercel deploy | BEKLIYOR — CLI/hesap |
| Staging URL | _(deploy sonrası)_ |
| Staging doğrulama tarihi | _(deploy sonrası)_ |

## Bilinen sınırlamalar

- Avatar/logo: production’da `BLOB_READ_WRITE_TOKEN` ile Vercel Blob kullanın; token yoksa yerel `public/uploads` (yalnızca lokal geliştirme)
- Elo, grafik bracket, 2v2 meydan okuma — PRD §11 kapsam dışı
- Web Push (FCM) için Firebase env zorunlu; yoksa Ayarlar’da yapılandırma uyarısı gösterilir
- Geliştirmede SW varsayılan kapalı (`?sw=1` veya production `npm run start`)
- E2E Playwright yok; manuel checklist kullanılıyor
