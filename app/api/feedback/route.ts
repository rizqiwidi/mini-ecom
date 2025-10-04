import { NextRequest, NextResponse } from "next/server";

import { appendManualEntry } from "../../../lib/manual-dataset";

const FEEDBACK_KEY = "manual/price-feedback.json";
const DATASET_KEY = "manual/manual-dataset.json";

type FeedbackEntry = {
  id: string;
  timestamp: string;
  sku: string;
  newPrice: number;
  note?: string;
  productName?: string;
  marketplace?: string;
  url?: string;
  previousPrice?: number;
};

export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body harus berupa JSON" }, { status: 400 });
  }

  const sku = normalizeString(payload?.sku);
  const newPrice = Number(payload?.newPrice);
  const note = normalizeString(payload?.note);

  if (!sku || !Number.isFinite(newPrice) || newPrice <= 0) {
    return NextResponse.json(
      { ok: false, message: "SKU dan harga baru wajib diisi dengan benar." },
      { status: 400 }
    );
  }

  const entry: FeedbackEntry = {
    id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    sku,
    newPrice,
    note: note || undefined,
    productName: normalizeString(payload?.productName) || undefined,
    marketplace: normalizeString(payload?.marketplace) || undefined,
    url: normalizeString(payload?.url) || undefined,
    previousPrice: Number.isFinite(Number(payload?.previousPrice)) ? Number(payload?.previousPrice) : undefined,
  };

  await appendManualEntry(FEEDBACK_KEY, entry);

  const datasetRecord = {
    type: "price-update",
    timestamp: entry.timestamp,
    sku: entry.sku,
    newPrice: entry.newPrice,
    previousPrice: entry.previousPrice ?? null,
    marketplace: entry.marketplace ?? null,
    url: entry.url ?? null,
    note: entry.note ?? null,
  };

  await appendManualEntry(DATASET_KEY, datasetRecord);

  const message = "Masukan harga tercatat. Data tambahan akan diproses pada ETL berikutnya.";

  return NextResponse.json({ ok: true, entry, status: "created", message });
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

