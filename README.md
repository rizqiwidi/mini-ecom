# ?? Mini E-com Laptop Indonesia

> Mini E-com Laptop Indonesia is a curated pricing intelligence project that aggregates historical laptop listings from Indonesia’s major marketplaces, normalizes the data through an ETL pipeline, and serves an interactive search experience complete with trend tracking, 7-day forecasts, and community-driven price updates for smarter purchasing decisions.

**Live demo:** https://mini-ecom-blush.vercel.app/ · **Dataset:** https://www.kaggle.com/datasets/artakusuma/laptopecomercee/

## ? Highlights
- **Smart search** with token heuristics so SKU, product name, and brand remain easy to discover.
- **Trend & prediction visuals**: up/down/stable badges plus latest price change percentage and 7-day forecast.
- **Manual submission & feedback**: extend the dataset or update prices directly from the UI.
- **Integrated ETL pipeline**: CSV ? normalized JSON ? automatic upload to Vercel Blob Storage.

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
   NEXT_PUBLIC_BASE_URL=http://localhost:3000 # optional, the app falls back automatically when omitted
   ```

3. **Secret configuration**
   | Scope | Key | Description |
   |-------|-----|-------------|
   | GitHub Actions ? Settings ? Secrets ? Actions | `VERCEL_TOKEN` | Personal token from Vercel for deployments. |
   | GitHub Actions | `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | IDs from the Vercel dashboard. |
   | GitHub Actions | `BLOB_READ_WRITE_TOKEN` | Same token as in `.env`, used by the ETL workflow. |
   | GitHub Actions | `BLOB_PREFIX` | Namespace for blob storage, for example `mini-ecom`. |
   | Vercel Project Settings ? Environment Variables | `BLOB_READ_WRITE_TOKEN`, `BLOB_PREFIX`, `NEXT_PUBLIC_BASE_URL` (optional) | Mirror the same values so serverless functions can access them. |

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
Price information is based on a snapshot of laptop listings scraped in January 2021. Marketplace links may have expired, and actual prices can differ from what appears in the application.

---
Keep exploring and build smarter laptop price insights.
