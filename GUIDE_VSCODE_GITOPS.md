# Panduan Lengkap (VS Code + GitHub SSH + Vercel Blob + GitOps)

## 0) Install alat
- Node.js LTS (v18/v20), Git, VS Code.

## 1) Buka proyek -> jalankan lokal
```bash
npm install
npm run dev
```
Buka http://localhost:3000

## 2) Siapkan **Vercel Blob**
- vercel.com -> Storage -> **Blob** -> buat token **Read-Write**.
- Simpan token itu ke `.env.local` -> `BLOB_READ_WRITE_TOKEN=...`

## 3) Upload CSV laptop ke Blob atau commit ke repo
Cara termudah untuk mulai:
- Copy CSV Kaggle ke `data/` (opsional) atau langsung upload ke Blob key `<BLOB_PREFIX>/raw/...`
- Untuk memprosesnya, jalankan aplikasi (`npm run dev`) lalu panggil endpoint ETL:
```bash
curl -X POST http://localhost:3000/api/etl \
  -H 'x-cron-token: YOUR_BLOB_READ_WRITE_TOKEN'
```
Endpoint ini menghasilkan `public/processed/products.json` dan otomatis mengunggahnya ke **Vercel Blob** jika token valid.

## 4) Cek lokal
`npm run dev` -> cari "asus i5". Data akan diambil dari Blob (jika ada) atau fallback ke `public/processed/products.json`.

## 5) GitOps (GitHub + Vercel)
- Inisialisasi git & push ke GitHub (SSH).
- Repo -> Settings -> Secrets -> Actions:
  - `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
  - `BLOB_READ_WRITE_TOKEN`
  - `NEXT_PUBLIC_BASE_URL` (opsional)
- Hubungkan Vercel ke repo -> isi ENV yang sama di Project Settings.
- Push ke `main` -> workflow build + deploy.
- (Opsional) Post-deploy, panggil `/api/etl` untuk regenerasi `products.json` dari CSV di Blob.

## 6) Update dataset
- Upload CSV baru ke Blob (key: `<BLOB_PREFIX>/raw/laptops/...`) atau commit CSV di `data/`, kemudian panggil `/api/etl` (lokal atau di Vercel) untuk regenerasi dataset.
