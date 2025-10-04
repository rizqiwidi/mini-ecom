# ?? Mini E-com Laptop Indonesia

> Insight harga laptop Indonesia – cari, bandingkan, dan pantau tren harga dari marketplace populer.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge)](https://mini-ecom-blush.vercel.app/) [![Dataset](https://img.shields.io/badge/Dataset-Kaggle-orange?style=for-the-badge)](https://www.kaggle.com/datasets/artakusuma/laptopecomercee/)

## ? Highlight
- **Search cerdas** dengan token heuristik sehingga SKU, nama produk, dan brand mudah ditemukan.
- **Visual tren & prediksi**: badge tren naik/turun, perubahan harga terbaru, dan forecast 7 hari.
- **Manual submission & feedback**: pengguna bisa menambahkan produk baru atau koreksi harga langsung dari UI.
- **Pipeline ETL terintegrasi**: CSV diproses ke JSON siap pakai + upload otomatis ke Vercel Blob Storage.

## ?? Tech Stack
| Layer | Tools |
|-------|-------|
| Frontend UI | Next.js (App Router), React 18, Tailwind CSS |
| API / Serverless | Next.js API Route (Node.js) |
| Data Processing | TypeScript + `csv-parse/sync`, custom ETL helper |
| Storage | Vercel Blob (raw CSV + processed JSON) |
| Styling | Tailwind CSS, custom design system |

## ?? Features
- ?? **Search & filter**: kata kunci multi-token, filter tren, rentang harga, sorting.
- ?? **Forecast & trend**: badge tren (naik/turun/stabil), prediksi harga besok, persen perubahan terbaru.
- ?? **Manual dataset**: fitur form untuk tambah produk baru dan feedback update harga.
- ?? **ETL endpoint** (`POST /api/etl`): memproses CSV dari Blob dan menghasilkan `processed/products.json` baru.
- ?? **Admin utilities**: `/api/health` untuk heartbeat, `/api/products` & `/api/feedback` untuk submission/feedback publik.

## ??? Setup Instructions
1. **Clone & install**
   ```bash
   git clone https://github.com/<username>/mini-ecom.git
   cd mini-ecom
   npm install
   ```

2. **Siapkan environment** (`.env`)
   ```bash
   BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
   BLOB_PREFIX=mini-ecom
   NEXT_PUBLIC_BASE_URL=http://localhost:3000 # opsional saat lokal
   ```

3. **Jalankan lokal**
   ```bash
   npm run dev
   # buka http://localhost:3000
   ```

4. **Proses dataset (opsional)**
   - Upload CSV Kaggle ke Vercel Blob dengan key `mini-ecom/raw/laptop/...` **atau** simpan CSV di folder `data/`.
   - Regenerasi data:
     ```bash
     curl -X POST http://localhost:3000/api/etl \
       -H "x-cron-token: $BLOB_READ_WRITE_TOKEN"
     ```

5. **Build & deploy**
   ```bash
   npm run build
   npm run start
   ```
   Deployment production tinggal push ke GitHub — workflow CI/CD akan otomatis deploy ke Vercel.

## ?? Struktur Penting
```
app/
  page.tsx           # Halaman utama + hero + komponen search
  api/
    search/route.ts  # Endpoint pencarian, gabung data ETL + manual
    etl/route.ts     # Memproses CSV di Blob -> JSON
lib/
  etl.ts             # Helper normalisasi CSV
  forecast.ts        # EWMA + linear trend, utilitas forecast
  manual-dataset.ts  # Helper baca/tulis dataset manual
public/processed/
  products.json      # Snapshot agregasi produk siap pakai
```

## ?? Kontribusi
1. Fork repo, buat branch baru (`feature/namafitur`).
2. Pastikan lint & build lolos:
   ```bash
   npm run build
   ```
3. Kirim Pull Request + jelaskan perubahan & testing yang dilakukan.

## ??? Roadmap Singkat
- ?? Model forecast yang lebih canggih (Prophet/ARIMA via worker terpisah).
- ?? Relevansi search berbasis ML (MiniSearch / vector search).
- ?? Dashboard admin untuk melihat dataset manual & pipeline ETL.

## ?? Kontak
Butuh bantuan atau punya ide fitur? Buka issue di repo ini atau kontak maintainer melalui halaman demo.

Selamat eksplorasi! ??
