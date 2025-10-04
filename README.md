# ?? Mini E-com Laptop Indonesia

> Insight harga laptop Indonesia – search, compare, and watch price movements from popular marketplaces.

**Live demo:** https://mini-ecom-blush.vercel.app/  ·  **Dataset:** https://www.kaggle.com/datasets/artakusuma/laptopecomercee/

## ? Highlights
- **Smart search** with token heuristics; SKU, product name, and brand are easy to discover.
- **Trend & prediction visuals**: badges for up/down/stable trend and last price change percentage.
- **Manual submission & feedback**: users can add new products or send price corrections directly from the UI.
- **Integrated ETL pipeline**: CSV ? normalized JSON ? automatically uploaded to Vercel Blob Storage.

## ?? Tech Stack
| Layer | Tools |
|-------|-------|
| Frontend UI | Next.js (App Router), React 18, Tailwind CSS |
| API / Serverless | Next.js API Route (Node.js) |
| Data Processing | TypeScript + `csv-parse/sync`, custom ETL helpers |
| Storage | Vercel Blob (raw CSV + processed JSON) |
| Styling | Tailwind CSS, custom design system |

## ?? Features
- ?? **Search & filter**: multi-token keyword search, trend filter, price range, and sorting.
- ?? **Forecast & trend**: direction badge (up/down/stable), latest price change, 7-day forecast values.
- ?? **Manual dataset**: form-driven submission to extend the dataset without waiting for new ETL runs.
- ?? **ETL endpoint** (`POST /api/etl`): regenerates `processed/products.json` from CSV stored in Vercel Blob.

## ??? Setup Instructions
1. **Clone & install**
   ```bash
   git clone https://github.com/<your-username>/mini-ecom.git
   cd mini-ecom
   npm install
   ```

2. **Create `.env`** (local development)
   ```bash
   BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
   BLOB_PREFIX=mini-ecom
   NEXT_PUBLIC_BASE_URL=http://localhost:3000 # optional, falls back automatically
   ```

3. **Secret configuration (GitHub Actions / Vercel)**
   | Scope | Key | Description |
   |-------|-----|-------------|
   | GitHub Actions ? Settings ? Secrets ? Actions | `VERCEL_TOKEN` | Personal token from Vercel (required by deploy workflow). |
   | GitHub Actions | `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | IDs from Vercel dashboard. |
   | GitHub Actions | `BLOB_READ_WRITE_TOKEN` | Same token as local `.env`, used by ETL workflow. |
   | GitHub Actions | `BLOB_PREFIX` | Namespace for blob storage, for example `mini-ecom`. |
   | Vercel Project Settings ? Environment Variables | `BLOB_READ_WRITE_TOKEN`, `BLOB_PREFIX`, `NEXT_PUBLIC_BASE_URL` (optional) | Mirror the same values so serverless functions have access. |

4. **Run locally**
   ```bash
   npm run dev
   # visit http://localhost:3000
   ```

5. **Process dataset (optional)**
   - Upload Kaggle CSV to Vercel Blob key `mini-ecom/raw/laptop/...` or place CSV inside `data/`.
   - Regenerate processed products locally:
     ```bash
     curl -X POST http://localhost:3000/api/etl \
       -H "x-cron-token: $BLOB_READ_WRITE_TOKEN"
     ```

6. **Production build**
   ```bash
   npm run build
   npm run start
   ```
   Push to the `main` branch to trigger CI/CD and deploy to Vercel automatically.

## ?? Key Structure
```
app/
  page.tsx           # Landing page + hero + search section
  api/
    search/route.ts  # Search endpoint (combines ETL + manual submissions)
    etl/route.ts     # ETL trigger (CSV ? aggregated JSON ? Blob)
lib/
  etl.ts             # CSV normalization helpers
  forecast.ts        # EWMA + linear trend utilities
  manual-dataset.ts  # Read/write helpers for manual dataset entries
public/processed/
  products.json      # Ready-to-serve aggregated products
```

## ?? Warning
Price information is based on a snapshot of laptop listings scraped in January 2021. Marketplace links contained in the dataset may have expired and actual prices might differ from what appears in the application.

---
Keep exploring and build smarter laptop price insights.
