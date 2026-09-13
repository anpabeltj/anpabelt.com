import { writeFile, readFile, unlink } from "node:fs/promises";
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

// Resolve the Vercel Blob read-write token. When a Blob store is connected with a
// custom "Environment Variable Prefix", Vercel names it "<PREFIX>_READ_WRITE_TOKEN"
// instead of the default BLOB_READ_WRITE_TOKEN — accept either so uploads work
// regardless of the prefix chosen at connect time.
function blobToken(): string {
  const direct = getEnv("BLOB_READ_WRITE_TOKEN", "");
  if (direct) return direct;
  if (typeof process !== "undefined" && process.env) {
    for (const [k, v] of Object.entries(process.env)) {
      if (v && /_READ_WRITE_TOKEN$/.test(k)) return v;
    }
  }
  return "";
}

function useBlob(): boolean {
  // Usable when we have a static read-write token, OR the project is connected to a
  // Blob store via OIDC (Vercel injects BLOB_STORE_ID + VERCEL_OIDC_TOKEN and the
  // @vercel/blob SDK authenticates automatically — no static token required).
  return Boolean(blobToken() || getEnv("BLOB_STORE_ID", "") || getEnv("VERCEL_OIDC_TOKEN", ""));
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
    // Pass the read-write token only if we actually have one; otherwise omit it so
    // the SDK resolves OIDC auth (VERCEL_OIDC_TOKEN + BLOB_STORE_ID) on its own.
    const { put } = await import("@vercel/blob");
    const token = blobToken();
    const opts: { access: "public"; contentType: string; token?: string } = { access: "public", contentType: file.type };
    if (token) opts.token = token;
    const blob = await put(`uploads/${filename}`, buf, opts);
    url = blob.url;
  } else {
    // Local/dev: write to disk, served via /media/[filename].
    try {
      await writeFile(join(UPLOADS_DIR, filename), buf);
    } catch (err) {
      if (getEnv("VERCEL", "")) {
        throw new Error("Image storage isn't configured for production. Connect a Vercel Blob store to this project (Storage \u2192 your Blob store \u2192 Connect Project) and redeploy.");
      }
      throw err;
    }
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

// Delete a media asset: remove the stored file (Vercel Blob in prod, disk in dev) then its DB row.
export async function deleteMedia(id: string): Promise<boolean> {
  const c = await db();
  const rs = await c.execute({ sql: "SELECT filename, url FROM media WHERE id = ?", args: [id] });
  if (rs.rows.length === 0) return false;
  const row = rs.rows[0] as Rec;
  const filename = String(row.filename);
  const url = String(row.url);
  try {
    if (useBlob() && /^https?:\/\//.test(url)) {
      const { del } = await import("@vercel/blob");
      const token = blobToken();
      if (token) await del(url, { token });
      else await del(url);
    } else {
      await unlink(join(UPLOADS_DIR, filename));
    }
  } catch {
    // file already removed or storage unavailable — proceed to drop the DB row anyway
  }
  const res = await c.execute({ sql: "DELETE FROM media WHERE id = ?", args: [id] });
  return res.rowsAffected > 0;
}

// Replace a media asset's file in place (keeps the SAME url so every post using it updates
// at once). Overwrites Blob at the same pathname in prod, or the same file on disk in dev.
export async function replaceMedia(id: string, file: File): Promise<MediaAsset | null> {
  if (!ALLOWED_MIME[file.type]) throw new Error("Unsupported file type. Use JPG, PNG, WEBP, GIF, SVG or AVIF.");
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new Error("File too large (max 8MB).");

  const c = await db();
  const rs = await c.execute({ sql: "SELECT filename, url FROM media WHERE id = ?", args: [id] });
  if (rs.rows.length === 0) return null;
  const row = rs.rows[0] as Rec;
  const filename = String(row.filename);
  const url = String(row.url);

  if (useBlob() && /^https?:\/\//.test(url)) {
    const { put } = await import("@vercel/blob");
    const pathname = new URL(url).pathname.replace(/^\/+/, "");
    const token = blobToken();
    const opts: { access: "public"; contentType: string; addRandomSuffix: boolean; allowOverwrite: boolean; token?: string } =
      { access: "public", contentType: file.type, addRandomSuffix: false, allowOverwrite: true };
    if (token) opts.token = token;
    await put(pathname, buf, opts);
  } else {
    await writeFile(join(UPLOADS_DIR, filename), buf);
  }

  // url stays the same (original extension retained); refresh size/mime/original name.
  await c.execute({
    sql: "UPDATE media SET original_name = ?, mime = ?, size = ? WHERE id = ?",
    args: [file.name, file.type, buf.byteLength, id],
  });
  const updated = await c.execute({ sql: "SELECT * FROM media WHERE id = ?", args: [id] });
  return rowToMedia(updated.rows[0] as Rec);
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
