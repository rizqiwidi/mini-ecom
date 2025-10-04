import { NextRequest, NextResponse } from "next/server";

import { appendManualEntry } from "../../../lib/manual-dataset";

const SUBMISSION_KEY = "manual/user-submissions.json";
const DATASET_KEY = "manual/manual-dataset.json";

type SubmissionEntry = {
  id: string;
  timestamp: string;
  name: string;
  brand: string;
  category: string;
  marketplace: string;
  url?: string;
  price: number;
  sold?: number;
};

export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body harus berupa JSON" }, { status: 400 });
  }

  const name = normalizeString(payload?.name);
  const brand = normalizeString(payload?.brand);
  const category = normalizeString(payload?.category ?? "Laptop");
  const marketplace = normalizeString(payload?.marketplace);
  const url = normalizeString(payload?.url);
  const price = Number(payload?.price);
  const sold = payload?.sold !== undefined && payload?.sold !== null ? Number(payload?.sold) : undefined;

  if (!name || !brand || !marketplace || !Number.isFinite(price) || price <= 0) {
    return NextResponse.json(
      { ok: false, message: "Field name, brand, marketplace, dan price wajib diisi." },
      { status: 400 }
    );
  }

  if (sold !== undefined && (!Number.isFinite(sold) || sold < 0)) {
    return NextResponse.json({ ok: false, message: "Field sold harus berupa angka >= 0." }, { status: 400 });
  }

  const entry: SubmissionEntry = {
    id: `submission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    name,
    brand,
    category,
    marketplace,
    url: url || undefined,
    price,
    sold,
  };

  await appendManualEntry(SUBMISSION_KEY, entry);

  const datasetRecord = {
    type: "submission",
    timestamp: entry.timestamp,
    name: entry.name,
    brand: entry.brand,
    category: entry.category,
    marketplace: entry.marketplace,
    price: entry.price,
    sold: entry.sold ?? null,
    url: entry.url ?? null,
  };

  await appendManualEntry(DATASET_KEY, datasetRecord);

  const message = "Data produk baru berhasil ditambahkan ke database manual.";

  return NextResponse.json({ ok: true, entry, status: "created", message });
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

