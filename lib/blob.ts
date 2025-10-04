import { put, list, head } from "@vercel/blob";

const PREFIX = process.env.BLOB_PREFIX || "mini-ecom";

export async function uploadBlob(
  name: string,
  body: Blob | ArrayBuffer | string
) {
  const key = `${PREFIX}/${name}`;
  const res = await put(key, body, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    allowOverwrite: true,
  });
  return res;
}

export async function getBlobUrl(name: string) {
  const key = `${PREFIX}/${name}`;
  try {
    const meta = await head(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return meta?.url || null;
  } catch {
    return null;
  }
}

export async function listBlobs(prefix = "") {
  const p = prefix ? `${PREFIX}/${prefix}` : PREFIX;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const items: Array<Awaited<ReturnType<typeof list>>["blobs"][number]> = [];
  let cursor: string | undefined;

  do {
    const res = await list({ prefix: p, token, cursor });
    items.push(...res.blobs);
    cursor = res.cursor;
  } while (cursor);

  return items;
}
