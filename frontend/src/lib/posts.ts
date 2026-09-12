import { getDb } from "./db";
import { nanoid } from "nanoid";
import type { GalleryImage, Post, PostInput, PostStatus } from "./types";

interface PostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  status: string;
  type: string;
  tags: string;
  images: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

function rowToPost(r: PostRow): Post {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    content: r.content,
    coverImage: r.cover_image,
    images: safeParseImages(r.images),
    status: r.status as PostStatus,
    type: r.type as Post["type"],
    tags: safeParseTags(r.tags),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    publishedAt: r.published_at,
  };
}

function safeParseTags(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function safeParseImages(raw: string): GalleryImage[] {
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter((x) => x && typeof x.url === "string")
      .map((x) => ({ url: String(x.url), caption: String(x.caption ?? "") }));
  } catch {
    return [];
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function ensureUniqueSlug(base: string, ignoreId?: string): string {
  const db = getDb();
  let slug = base || nanoid(8);
  let n = 1;
  while (true) {
    const existing = db.prepare("SELECT id FROM posts WHERE slug = ?").get(slug) as
      | { id: string }
      | undefined;
    if (!existing || existing.id === ignoreId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export function listPosts(opts: { status?: PostStatus | "all" } = {}): Post[] {
  const db = getDb();
  const status = opts.status ?? "all";
  const rows =
    status === "all"
      ? (db.prepare("SELECT * FROM posts ORDER BY COALESCE(published_at, created_at) DESC").all() as PostRow[])
      : (db
          .prepare(
            "SELECT * FROM posts WHERE status = ? ORDER BY COALESCE(published_at, created_at) DESC"
          )
          .all(status) as PostRow[]);
  return rows.map(rowToPost);
}

export function getPostById(id: string): Post | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM posts WHERE id = ?").get(id) as PostRow | undefined;
  return row ? rowToPost(row) : null;
}

export function getPostBySlug(slug: string): Post | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM posts WHERE slug = ?").get(slug) as PostRow | undefined;
  return row ? rowToPost(row) : null;
}

export function createPost(input: PostInput): Post {
  const db = getDb();
  const now = new Date().toISOString();
  const id = nanoid();
  const status: PostStatus = input.status ?? "draft";
  const slug = ensureUniqueSlug(input.slug ? slugify(input.slug) : slugify(input.title));
  const publishedAt = status === "published" ? now : null;

  db.prepare(
    `INSERT INTO posts (id, title, slug, excerpt, content, cover_image, status, type, tags, images, created_at, updated_at, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.title.trim(),
    slug,
    (input.excerpt ?? "").trim(),
    input.content ?? "",
    input.coverImage ?? null,
    status,
    input.type ?? "article",
    JSON.stringify(input.tags ?? []),
    JSON.stringify(input.images ?? []),
    now,
    now,
    publishedAt
  );
  return getPostById(id)!;
}

export function updatePost(id: string, input: PostInput): Post | null {
  const db = getDb();
  const current = getPostById(id);
  if (!current) return null;
  const now = new Date().toISOString();

  const status: PostStatus = input.status ?? current.status;
  const slug =
    input.slug !== undefined ? ensureUniqueSlug(slugify(input.slug), id) : current.slug;

  // Set publishedAt the first time a post becomes published; clear when unpublished.
  let publishedAt = current.publishedAt;
  if (status === "published" && !current.publishedAt) publishedAt = now;
  if (status === "draft") publishedAt = null;

  db.prepare(
    `UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image = ?, status = ?, type = ?, tags = ?, images = ?, updated_at = ?, published_at = ?
     WHERE id = ?`
  ).run(
    (input.title ?? current.title).trim(),
    slug,
    (input.excerpt ?? current.excerpt).trim(),
    input.content ?? current.content,
    input.coverImage !== undefined ? input.coverImage : current.coverImage,
    status,
    input.type ?? current.type,
    JSON.stringify(input.tags ?? current.tags),
    JSON.stringify(input.images ?? current.images),
    now,
    publishedAt,
    id
  );
  return getPostById(id);
}

export function deletePost(id: string): boolean {
  const db = getDb();
  const res = db.prepare("DELETE FROM posts WHERE id = ?").run(id);
  return res.changes > 0;
}
