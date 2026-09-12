import { createClient, type Client, type Row } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getEnv } from "./env";

// Uploaded-image dir is only used for local (non-Vercel) disk storage.
const DATA_DIR = join(process.cwd(), "data");
export const UPLOADS_DIR = join(DATA_DIR, "uploads");

let _client: Client | null = null;

function raw(): Client {
  if (_client) return _client;
  const url = getEnv("TURSO_DATABASE_URL", "");
  const authToken = getEnv("TURSO_AUTH_TOKEN", "") || undefined;
  if (url) {
    // Remote Turso (production / Vercel)
    _client = createClient({ url, authToken });
  } else {
    // Local embedded SQLite file (dev / Emergent preview)
    mkdirSync(UPLOADS_DIR, { recursive: true });
    _client = createClient({ url: `file:${join(DATA_DIR, "blog.db")}` });
  }
  return _client;
}

let _init: Promise<void> | null = null;

// Returns the ready-to-use client, running migrations + seed exactly once.
export async function db(): Promise<Client> {
  if (!_init) _init = init(raw());
  await _init;
  return raw();
}

async function init(c: Client): Promise<void> {
  await c.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
        name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'admin', created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
        excerpt TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', cover_image TEXT,
        status TEXT NOT NULL DEFAULT 'draft', type TEXT NOT NULL DEFAULT 'article',
        tags TEXT NOT NULL DEFAULT '[]', images TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, published_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY, filename TEXT NOT NULL, original_name TEXT NOT NULL,
        mime TEXT NOT NULL, size INTEGER NOT NULL, url TEXT NOT NULL, created_at TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS contact_messages (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL,
        created_at TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0)`,
      `CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, published_at)`,
      `CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug)`,
    ],
    "write"
  );
  await seedAdmin(c);
  await seedSamplePosts(c);
}

async function seedAdmin(c: Client): Promise<void> {
  const email = getEnv("ADMIN_EMAIL", "admin@example.com").toLowerCase();
  const password = getEnv("ADMIN_PASSWORD", "admin123");
  const name = getEnv("ADMIN_NAME", "Admin");

  const rs = await c.execute({ sql: "SELECT id, password_hash FROM users WHERE email = ?", args: [email] });
  const now = new Date().toISOString();
  if (rs.rows.length === 0) {
    await c.execute({
      sql: "INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, 'admin', ?)",
      args: [nanoid(), email, bcrypt.hashSync(password, 10), name, now],
    });
  } else {
    const row = rs.rows[0] as unknown as { id: string; password_hash: string };
    if (!bcrypt.compareSync(password, row.password_hash)) {
      await c.execute({ sql: "UPDATE users SET password_hash = ? WHERE id = ?", args: [bcrypt.hashSync(password, 10), row.id] });
    }
  }
}

async function seedSamplePosts(c: Client): Promise<void> {
  const rs = await c.execute("SELECT COUNT(*) AS n FROM posts");
  if (Number((rs.rows[0] as unknown as { n: number }).n) > 0) return;

  const samples = [
    {
      title: "Why I Rebuilt My Website (Again)",
      slug: "why-i-rebuilt-my-website-again",
      excerpt: "A short, honest note on turning a static HTML site into a proper digital home — and why the third rewrite finally felt right.",
      cover: "/assets/images/bg-editorial.jpg",
      tags: ["personal", "web", "astro"],
      content: `Every developer has that one project they can never leave alone. For me, it's this website.\n\n## The itch to rebuild\n\nIt started as a few static HTML files and a *lot* of Tailwind classes copied between pages.\n\n> A personal site should feel like a home, not a chore.\n\nSo I gave myself a rule: **I should be able to write here without touching HTML.**\n\n\`\`\`ts\ntype Post = { title: string; slug: string; status: "draft" | "published" };\n\`\`\`\n\nSmall pieces, quietly assembled. More soon.`,
    },
    {
      title: "Notes From an Analytics Engineering Internship",
      slug: "notes-from-an-analytics-engineering-internship",
      excerpt: "Bronze to silver, funnels that actually mean something, and the unreasonable joy of a pipeline that just runs.",
      cover: "/assets/images/dwbi-image.webp",
      tags: ["data", "career", "dbt"],
      content: `I spent a good chunk of this year turning messy data into things people could trust.\n\n## Models are conversations\n\nEvery dbt model is really a small agreement about what a number *means*.\n\n## Dashboards are products\n\nPeople don't want charts. They want answers.\n\n1. Start with the question\n2. Cut everything that doesn't answer it\n3. Ship, then watch how it's used`,
    },
  ];

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const created = new Date(Date.now() - (i + 1) * 86400000 * 3).toISOString();
    await c.execute({
      sql: `INSERT INTO posts (id, title, slug, excerpt, content, cover_image, status, type, tags, images, created_at, updated_at, published_at)
            VALUES (?, ?, ?, ?, ?, ?, 'published', 'article', ?, '[]', ?, ?, ?)`,
      args: [nanoid(), s.title, s.slug, s.excerpt, s.content, s.cover, JSON.stringify(s.tags), created, created, created],
    });
  }
}

export type { Row };
