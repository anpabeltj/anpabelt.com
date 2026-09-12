import { writeFile, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { nanoid } from "nanoid";
import { getDb, UPLOADS_DIR } from "./db";
import type { MediaAsset } from "./types";

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
};

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

interface MediaRow {
  id: string;
  filename: string;
  original_name: string;
  mime: string;
  size: number;
  url: string;
  created_at: string;
}

function rowToMedia(r: MediaRow): MediaAsset {
  return {
    id: r.id,
    filename: r.filename,
    originalName: r.original_name,
    mime: r.mime,
    size: r.size,
    url: r.url,
    createdAt: r.created_at,
  };
}

export async function saveUpload(file: File): Promise<MediaAsset> {
  if (!ALLOWED_MIME[file.type]) {
    throw new Error("Unsupported file type. Use JPG, PNG, WEBP, GIF, SVG or AVIF.");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new Error("File too large (max 8MB).");

  const ext = ALLOWED_MIME[file.type] || extname(file.name) || ".bin";
  const filename = `${Date.now()}-${nanoid(8)}${ext}`;
  await writeFile(join(UPLOADS_DIR, filename), buf);

  const db = getDb();
  const now = new Date().toISOString();
  const id = nanoid();
  const url = `/media/${filename}`;
  db.prepare(
    "INSERT INTO media (id, filename, original_name, mime, size, url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, filename, file.name, file.type, buf.byteLength, url, now);

  return { id, filename, originalName: file.name, mime: file.type, size: buf.byteLength, url, createdAt: now };
}

export function listMedia(): MediaAsset[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM media ORDER BY created_at DESC").all() as MediaRow[];
  return rows.map(rowToMedia);
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

export async function readUpload(filename: string): Promise<{ body: Buffer; contentType: string } | null> {
  // Guard against path traversal — only a bare filename is allowed.
  if (!/^[A-Za-z0-9._-]+$/.test(filename)) return null;
  try {
    const body = await readFile(join(UPLOADS_DIR, filename));
    const contentType = CONTENT_TYPES[extname(filename).toLowerCase()] || "application/octet-stream";
    return { body, contentType };
  } catch {
    return null;
  }
}
