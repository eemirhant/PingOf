# PingOf — Ofis Masa Tenisi Uygulaması

Ofis içinde oynanan masa tenisi maçlarını (1v1 ve 2v2), turnuvaları ve oyuncu istatistiklerini takip eden bir web uygulaması. Mobil tarayıcıdan PWA olarak ana ekrana eklenebilir.

## Teknoloji Yığını

- **Framework:** Next.js 15 (App Router) + React + TypeScript
- **Stil:** Tailwind CSS v4
- **Veritabanı:** PostgreSQL + Prisma ORM
- **Kimlik doğrulama:** Auth.js (NextAuth) credentials provider
- **Form yönetimi:** react-hook-form + zod
- **Test:** Vitest
- **Deploy:** Vercel + Neon/Supabase Postgres

## Gereksinimler

- Node.js 20+
- PostgreSQL (yerel, Neon veya Supabase)

## Kurulum

1. Bağımlılıkları yükleyin:

```bash
npm install
```

2. Ortam değişkenlerini ayarlayın:

```bash
cp .env.example .env
```

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | PostgreSQL bağlantı dizesi |
| `AUTH_SECRET` | Auth.js oturum şifreleme anahtarı |
| `AUTH_TRUST_HOST` | `true` — Auth.js request Host’u kullanır |
| `AUTH_URL` | Opsiyonel kanonik URL (production / Vercel Preview’da HTTPS origin) |
| `NEXT_PUBLIC_APP_URL` | Absolute linkler için genel uygulama URL’si |
| `NEXT_PUBLIC_ENVIRONMENT` | `development` \| `production` |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | OneSignal App ID (istemci) |
| `ONESIGNAL_REST_API_KEY` | OneSignal REST API Key (sunucu) |

OneSignal: Web platformunu **Custom Code** olarak yapılandırın; Dashboard **Site URL** açtığınız origin ile birebir eşleşmeli. `NEXT_PUBLIC_ONESIGNAL_APP_ID` + `ONESIGNAL_REST_API_KEY` ekleyin. İlk girişte doğrulama diyalogundaki **Got it** ile izin istenir; `external_id` = PingOf `user.id`.

3. Prisma client + migration:

```bash
npm run db:generate
npm run db:migrate
```

4. Geliştirme sunucusu:

```bash
npm run dev
```

Adres: `http://localhost:3000`

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu (Turbopack) |
| `npm run build` | Production build |
| `npm run vercel-build` | Staging/prod: `migrate deploy` + `next build` |
| `npm run start` | Production sunucusu |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run pwa:icons` | PWA ikonlarını yeniden üret |
| `npm run db:generate` | Prisma client |
| `npm run db:migrate` | Migration (dev) |

## Mobil Push / PWA testi

OneSignal Web SDK v16, mobil tarayıcılarda **yalnızca HTTPS** (veya `localhost`) üzerinde push izni verir. Yerel `http://192.168.x.x:3000` ile telefonda test çalışmaz.

Mobil HTTPS testleri için **Vercel Preview** (veya production deploy) kullanın:

1. PR / branch’i Vercel’e deploy edin  
2. Preview URL’yi OneSignal Dashboard → **Site URL** olarak ayarlayın  
3. Telefonda Chrome ile Preview URL’yi açın → giriş → Ana ekrana ekle  
4. Bildirim izni verin (Got it / Ayarlar)  

Manifest: `/manifest.webmanifest` · ikonlar: `/icons/*` · SW: `/OneSignalSDKWorker.js`.

Yerel geliştirmede push için `http://localhost:3000` + OneSignal localhost ayarı yeterlidir (Chromium).

## Staging deploy (Vercel + Neon)

Ayrıntılı adımlar: [STAGING.md](STAGING.md). Özet: Neon `DATABASE_URL` + Vercel env (`AUTH_SECRET`, `AUTH_URL`, OneSignal) + `npm run vercel-build`.

**Not:** `public/uploads` dosya sistemi Vercel’de kalıcı değildir.

## v1 / Faz 4 durum (PRD §13)

- [x] Auth, org davet/join, profil, oyuncu ekleme
- [x] Anlık / planlı maç, meydan okuma, bildirimler
- [x] İstatistikler, leaderboard, dashboard
- [x] Turnuvalar (tek eleme + lig)
- [x] PWA (manifest, SW, offline)
- [x] İddia notu (US-16)
- [x] Web Push (OneSignal + Ayarlar aboneliği)
- DoD kalite kapısı: [DOD.md](DOD.md)

## Referans

- `PRD.md` — gereksinimler
- `.cursorrules` — kodlama kuralları
- `DOD.md` — Definition of Done sonuçları

## Lisans

Private — dahili ofis kullanımı.
