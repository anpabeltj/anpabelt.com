import type { APIRoute } from "astro";
import { createPost } from "../../../lib/posts";
import type { GalleryImage, PostInput, PostStatus, PostType } from "../../../lib/types";

export const prerender = false;

const VALID_TYPES: PostType[] = ["article", "gallery", "photo", "video", "journal"];

export function parseImages(raw: unknown): GalleryImage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && typeof (x as any).url === "string")
    .map((x) => ({ url: String(x.url), caption: String(x.caption ?? "") }));
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const title = String(body.title ?? "").trim();
  if (!title) return json({ error: "Title is required." }, 400);

  const type = (VALID_TYPES.includes(body.type as PostType) ? body.type : "article") as PostType;

  const input: PostInput = {
    title,
    slug: body.slug ? String(body.slug) : undefined,
    excerpt: body.excerpt ? String(body.excerpt) : undefined,
    content: body.content ? String(body.content) : undefined,
    coverImage: body.coverImage ? String(body.coverImage) : null,
    images: parseImages(body.images),
    type,
    status: (body.status === "published" ? "published" : "draft") as PostStatus,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
  };

  const post = await createPost(input);
  return json({ post }, 201);
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
