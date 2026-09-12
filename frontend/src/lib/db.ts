import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getEnv } from "./env";

const DATA_DIR = join(process.cwd(), "data");
const UPLOADS_DIR = join(DATA_DIR, "uploads");
const DB_PATH = join(DATA_DIR, "blog.db");

mkdirSync(UPLOADS_DIR, { recursive: true });

// Single shared connection (better-sqlite3 is synchronous and safe to reuse).
let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  migrate(db);
  seedAdmin(db);
  _db = db;
  return db;
}

export { UPLOADS_DIR };

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      excerpt TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      cover_image TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      type TEXT NOT NULL DEFAULT 'article',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      published_at TEXT
    );

    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, published_at);
    CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
  `);
}

function seedAdmin(db: Database.Database) {
  const email = getEnv("ADMIN_EMAIL", "admin@example.com").toLowerCase();
  const password = getEnv("ADMIN_PASSWORD", "admin123");
  const name = getEnv("ADMIN_NAME", "Admin");

  const existing = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email) as
    | { id: string; password_hash: string }
    | undefined;

  const now = new Date().toISOString();
  if (!existing) {
    db.prepare(
      "INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, 'admin', ?)"
    ).run(nanoid(), email, bcrypt.hashSync(password, 10), name, now);
  } else if (!bcrypt.compareSync(password, existing.password_hash)) {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      bcrypt.hashSync(password, 10),
      existing.id
    );
  }

  // Seed a couple of sample posts on first run so the blog is not empty.
  const count = (db.prepare("SELECT COUNT(*) AS c FROM posts").get() as { c: number }).c;
  if (count === 0) seedSamplePosts(db);
}

function seedSamplePosts(db: Database.Database) {
  const samples = [
    {
      title: "Why I Rebuilt My Website (Again)",
      slug: "why-i-rebuilt-my-website-again",
      excerpt:
        "A short, honest note on turning a static HTML site into a proper digital home — and why the third rewrite finally felt right.",
      cover: "/assets/images/bg-stars.jpg",
      tags: ["personal", "web", "astro"],
      content: `Every developer has that one project they can never leave alone. For me, it's this website.

## The itch to rebuild

It started as a few static HTML files and a *lot* of Tailwind classes copied between pages. It worked — but every small change meant editing four files by hand, and I had no way to write without opening my code editor.

> A personal site should feel like a home, not a chore.

So I gave myself a rule: **I should be able to write here without touching HTML.**

## What changed

- A real content model with drafts and publishing
- An editor I actually enjoy using
- Fast, server-rendered pages that keep the cosmic vibe

\`\`\`ts
type Post = {
  title: string;
  slug: string;
  status: "draft" | "published";
};
\`\`\`

That's it. Small pieces, quietly assembled. More soon.`,
    },
    {
      title: "Notes From an Analytics Engineering Internship",
      slug: "notes-from-an-analytics-engineering-internship",
      excerpt:
        "Bronze to silver, funnels that actually mean something, and the unreasonable joy of a pipeline that just runs.",
      cover: "/assets/images/dwbi-image.webp",
      tags: ["data", "career", "dbt"],
      content: `I spent a good chunk of this year turning messy data into things people could trust. Here are a few things I learned.

## Models are conversations

Every dbt model is really a small agreement about what a number *means*. Getting the definition right mattered more than the SQL.

## Dashboards are products

People don't want charts. They want answers. The best dashboards I built were the ones I deleted half of.

1. Start with the question
2. Cut everything that doesn't answer it
3. Ship, then watch how it's used

Still learning. Always learning.`,
    },
  ];

  const stmt = db.prepare(
    `INSERT INTO posts (id, title, slug, excerpt, content, cover_image, status, type, tags, created_at, updated_at, published_at)
     VALUES (@id, @title, @slug, @excerpt, @content, @cover, 'published', 'article', @tags, @created, @created, @created)`
  );
  samples.forEach((s, i) => {
    const created = new Date(Date.now() - (i + 1) * 86400000 * 3).toISOString();
    stmt.run({
      id: nanoid(),
      title: s.title,
      slug: s.slug,
      excerpt: s.excerpt,
      content: s.content,
      cover: s.cover,
      tags: JSON.stringify(s.tags),
      created,
    });
  });
}
