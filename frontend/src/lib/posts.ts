import { db } from "./db";
import { nanoid } from "nanoid";
import type { GalleryImage, Post, PostInput, PostStatus } from "./types";

type Rec = Record<string, unknown>;

function rowToPost(r: Rec): Post {
  return {
    id: String(r.id),
    title: String(r.title),
    slug: String(r.slug),
    excerpt: String(r.excerpt ?? ""),
    content: String(r.content ?? ""),
    coverImage: r.cover_image != null ? String(r.cover_image) : null,
    images: safeParseImages(r.images),
    status: String(r.status) as PostStatus,
    type: String(r.type) as Post["type"],
    tags: safeParseTags(r.tags),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    publishedAt: r.published_at != null ? String(r.published_at) : null,
  };
}

function safeParseTags(raw: unknown): string[] {
  try { const v = JSON.parse(String(raw)); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}
function safeParseImages(raw: unknown): GalleryImage[] {
  try {
    const v = JSON.parse(String(raw));
    if (!Array.isArray(v)) return [];
    return v.filter((x) => x && typeof x.url === "string").map((x) => ({ url: String(x.url), caption: String(x.caption ?? "") }));
  } catch { return []; }
}

export function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function ensureUniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const c = await db();
  let slug = base || nanoid(8);
  let n = 1;
  while (true) {
    const rs = await c.execute({ sql: "SELECT id FROM posts WHERE slug = ?", args: [slug] });
    if (rs.rows.length === 0 || String((rs.rows[0] as Rec).id) === ignoreId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export async function listPosts(opts: { status?: PostStatus | "all" } = {}): Promise<Post[]> {
  const c = await db();
  const status = opts.status ?? "all";
  const rs = status === "all"
    ? await c.execute("SELECT * FROM posts ORDER BY COALESCE(published_at, created_at) DESC")
    : await c.execute({ sql: "SELECT * FROM posts WHERE status = ? ORDER BY COALESCE(published_at, created_at) DESC", args: [status] });
  return rs.rows.map((r) => rowToPost(r as Rec));
}

export async function getPostById(id: string): Promise<Post | null> {
  const c = await db();
  const rs = await c.execute({ sql: "SELECT * FROM posts WHERE id = ?", args: [id] });
  return rs.rows.length ? rowToPost(rs.rows[0] as Rec) : null;
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const c = await db();
  const rs = await c.execute({ sql: "SELECT * FROM posts WHERE slug = ?", args: [slug] });
  return rs.rows.length ? rowToPost(rs.rows[0] as Rec) : null;
}

export async function createPost(input: PostInput): Promise<Post> {
  const c = await db();
  const now = new Date().toISOString();
  const id = nanoid();
  const status: PostStatus = input.status ?? "draft";
  const slug = await ensureUniqueSlug(input.slug ? slugify(input.slug) : slugify(input.title));
  const publishedAt = status === "published" ? now : null;
  await c.execute({
    sql: `INSERT INTO posts (id, title, slug, excerpt, content, cover_image, status, type, tags, images, created_at, updated_at, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, input.title.trim(), slug, (input.excerpt ?? "").trim(), input.content ?? "", input.coverImage ?? null,
      status, input.type ?? "article", JSON.stringify(input.tags ?? []), JSON.stringify(input.images ?? []), now, now, publishedAt],
  });
  return (await getPostById(id))!;
}

export async function updatePost(id: string, input: PostInput): Promise<Post | null> {
  const c = await db();
  const current = await getPostById(id);
  if (!current) return null;
  const now = new Date().toISOString();
  const status: PostStatus = input.status ?? current.status;
  const slug = input.slug !== undefined ? await ensureUniqueSlug(slugify(input.slug), id) : current.slug;
  let publishedAt = current.publishedAt;
  if (status === "published" && !current.publishedAt) publishedAt = now;
  if (status === "draft") publishedAt = null;
  await c.execute({
    sql: `UPDATE posts SET title=?, slug=?, excerpt=?, content=?, cover_image=?, status=?, type=?, tags=?, images=?, updated_at=?, published_at=? WHERE id=?`,
    args: [(input.title ?? current.title).trim(), slug, (input.excerpt ?? current.excerpt).trim(), input.content ?? current.content,
      input.coverImage !== undefined ? input.coverImage : current.coverImage, status, input.type ?? current.type,
      JSON.stringify(input.tags ?? current.tags), JSON.stringify(input.images ?? current.images), now, publishedAt, id],
  });
  return getPostById(id);
}

export async function deletePost(id: string): Promise<boolean> {
  const c = await db();
  const rs = await c.execute({ sql: "DELETE FROM posts WHERE id = ?", args: [id] });
  return rs.rowsAffected > 0;
}
