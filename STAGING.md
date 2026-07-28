# Staging deploy rehberi (Neon + Vercel)

Bu dosya DoD §4 için hazırlık adımlarıdır. CLI’da `gh` oturumu ve `vercel` yüklü değilse aşağıdaki adımları kendi hesabınla tamamla.

## Önkoşullar

- GitHub hesabı
- [Neon](https://neon.tech) projesi
- [Vercel](https://vercel.com) hesabı (GitHub ile bağla)

## 1) GitHub remote

```bash
gh auth login
gh repo create pingof --private --source=. --remote=origin --push
```

Veya GitHub web’de boş private repo açıp:

```bash
git remote add origin https://github.com/<USER>/pingof.git
git push -u origin main
```

## 2) Neon

1. Yeni proje / branch: `staging`
2. Connection string’i kopyala (`DATABASE_URL`, pooled + `?sslmode=require` önerilir)

## 3) Vercel

```bash
npm i -g vercel
vercel login
vercel link
```

Project Settings → Environment Variables (Preview + Production):

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon URL |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://<project>.vercel.app` |

Build Command: `npm run vercel-build` (`vercel.json` zaten ayarlı).

Deploy:

```bash
vercel --prod
# veya git push sonrası otomatik deploy
```

İlk deploy migration’ları `prisma migrate deploy` ile uygular.

## 4) Staging smoke (kısa)

1. `/register` ile org oluştur
2. Anlık maç kaydet
3. Turnuva oluştur + başlat
4. `/manifest.webmanifest` → JSON
5. Sonucu [DOD.md](DOD.md) içine URL + tarih yaz

## Durum (2026-07-28)

- Kod hazır: `vercel.json`, `postinstall`, `vercel-build`
- Yerel git: `main` @ `8e40654`
- Remote / Neon / Vercel: **hesap bağlanınca tamamlanacak** (bu ortamda `gh` login yok, `vercel` CLI yok)
