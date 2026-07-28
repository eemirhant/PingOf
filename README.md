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
| `AUTH_URL` | Uygulama URL’i (geliştirmede `http://localhost:3000`) |

3. Prisma client + migration:

```bash
npm run db:generate
npm run db:migrate
```

4. Geliştirme sunucusu:

```bash
npm run dev
```

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

## Staging deploy (Vercel + Neon)

1. [Neon](https://neon.tech) üzerinde staging DB oluştur; `DATABASE_URL` kopyala.
2. GitHub’a push et; [Vercel](https://vercel.com) ile projeyi bağla.
3. Vercel Environment Variables:
   - `DATABASE_URL` — Neon connection string
   - `AUTH_SECRET` — güçlü rastgele secret
   - `AUTH_URL` — `https://<proje>.vercel.app` (veya custom staging URL)
4. Build Command: `npm run vercel-build` (veya `vercel.json` içindeki ayar).
5. Deploy sonrası [DOD.md](DOD.md) staging satırlarını doldur; kısa smoke (kayıt → maç → turnuva → `/manifest.webmanifest`) çalıştır.

**Not:** `public/uploads` dosya sistemi Vercel’de kalıcı değildir.

## v1 durum (PRD §13)

- [x] Auth, org davet/join, profil, oyuncu ekleme
- [x] Anlık / planlı maç, meydan okuma, bildirimler
- [x] İstatistikler, leaderboard, dashboard
- [x] Turnuvalar (tek eleme + lig)
- [x] PWA (manifest, SW, offline)
- [x] İddia notu (US-16)
- DoD kalite kapısı: [DOD.md](DOD.md)

## Referans

- `PRD.md` — gereksinimler
- `.cursorrules` — kodlama kuralları
- `DOD.md` — Definition of Done sonuçları

## Lisans

Private — dahili ofis kullanımı.
