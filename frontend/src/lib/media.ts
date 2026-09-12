import { writeFile, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { nanoid } from "nanoid";
import { db, UPLOADS_DIR } from "./db";
import { getEnv } from "./env";
import type { MediaAsset } from "./types";

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
};
const MAX_BYTES = 8 * 1024 * 1024;

type Rec = Record<string, unknown>;
function rowToMedia(r: Rec): MediaAsset {
  return {
    id: String(r.id), filename: String(r.filename), originalName: String(r.original_name),
    mime: String(r.mime), size: Number(r.size), url: String(r.url), createdAt: String(r.created_at),
  };
}

function useBlob(): boolean {
  return Boolean(getEnv("BLOB_READ_WRITE_TOKEN", ""));
}

export async function saveUpload(file: File): Promise<MediaAsset> {
  if (!ALLOWED_MIME[file.type]) throw new Error("Unsupported file type. Use JPG, PNG, WEBP, GIF, SVG or AVIF.");
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new Error("File too large (max 8MB).");

  const ext = ALLOWED_MIME[file.type] || extname(file.name) || ".bin";
  const filename = `${Date.now()}-${nanoid(8)}${ext}`;

  let url: string;
  if (useBlob()) {
    // Production (Vercel): store in Vercel Blob and reference its public URL.
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${filename}`, buf, { access: "public", contentType: file.type });
    url = blob.url;
  } else {
    // Local/dev: write to disk, served via /media/[filename].
    await writeFile(join(UPLOADS_DIR, filename), buf);
    url = `/media/${filename}`;
  }

  const c = await db();
  const now = new Date().toISOString();
  const id = nanoid();
  await c.execute({
    sql: "INSERT INTO media (id, filename, original_name, mime, size, url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [id, filename, file.name, file.type, buf.byteLength, url, now],
  });
  return { id, filename, originalName: file.name, mime: file.type, size: buf.byteLength, url, createdAt: now };
}

export async function listMedia(): Promise<MediaAsset[]> {
  const c = await db();
  const rs = await c.execute("SELECT * FROM media ORDER BY created_at DESC");
  return rs.rows.map((r) => rowToMedia(r as Rec));
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".avif": "image/avif",
};

export async function readUpload(filename: string): Promise<{ body: Buffer; contentType: string } | null> {
  if (!/^[A-Za-z0-9._-]+$/.test(filename)) return null;
  try {
    const body = await readFile(join(UPLOADS_DIR, filename));
    return { body, contentType: CONTENT_TYPES[extname(filename).toLowerCase()] || "application/octet-stream" };
  } catch {
    return null;
  }
}
