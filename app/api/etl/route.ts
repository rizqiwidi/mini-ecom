import { NextRequest, NextResponse } from "next/server";
import { listBlobs, uploadBlob } from "../../../lib/blob";
import { forecastNext7, trendFlag } from "../../../lib/forecast";
import {
  createAccumulator,
  addRow,
  finalizeProducts,
  inferHintFromBlobKey,
  rowsFromCsv,
} from "../../../lib/etl";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-cron-token");
  if (token !== process.env.BLOB_READ_WRITE_TOKEN && token !== process.env.CRON_TOKEN) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const prefix = process.env.BLOB_PREFIX || "mini-ecom";
  const blobs = await listBlobs("raw/");
  const csvBlobs = blobs.filter((blob) => blob.pathname.toLowerCase().endsWith(".csv") && blob.pathname.includes("/laptop/"));

  if (!csvBlobs.length) {
    return new NextResponse("No CSV files under Blob raw/laptop/", { status: 404 });
  }

  const acc = createAccumulator();

  for (const blob of csvBlobs) {
    let text: string;
    try {
      const res = await fetch(blob.url, { cache: "no-store" });
      if (!res.ok) {
        console.warn(`Skip blob ${blob.pathname}: ${res.statusText}`);
        continue;
      }
      text = await res.text();
    } catch (err) {
      console.error(`Failed to download ${blob.pathname}`, err);
      continue;
    }

    const hint = inferHintFromBlobKey(blob.pathname, prefix);
    let rows;
    try {
      rows = rowsFromCsv(text, hint);
    } catch (err) {
      console.error(`Failed to parse CSV ${blob.pathname}`, err);
      continue;
    }
    for (const row of rows) addRow(acc, row);
  }

  const aggregates = finalizeProducts(acc);
  const items = aggregates.map(({ meta, priceSeries, latestPrice }) => ({
    ...meta,
    price: latestPrice,
    trend: trendFlag(priceSeries),
    forecast7: forecastNext7(priceSeries),
  }));

  await uploadBlob("processed/products.json", JSON.stringify({ items }));
  return NextResponse.json({ ok: true, count: items.length });
}
