import type { APIRoute } from "astro";
import { createPost } from "../../../lib/posts";
import type { PostInput, PostStatus } from "../../../lib/types";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const title = String(body.title ?? "").trim();
  if (!title) return json({ error: "Title is required." }, 400);

  const input: PostInput = {
    title,
    slug: body.slug ? String(body.slug) : undefined,
    excerpt: body.excerpt ? String(body.excerpt) : undefined,
    content: body.content ? String(body.content) : undefined,
    coverImage: body.coverImage ? String(body.coverImage) : null,
    status: (body.status === "published" ? "published" : "draft") as PostStatus,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
  };

  const post = createPost(input);
  return json({ post }, 201);
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
