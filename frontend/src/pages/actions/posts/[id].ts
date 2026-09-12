import type { APIRoute } from "astro";
import { updatePost, deletePost, getPostById } from "../../../lib/posts";
import type { PostInput, PostStatus } from "../../../lib/types";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  const id = params.id!;
  if (!getPostById(id)) return json({ error: "Post not found." }, 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const input: PostInput = {
    title: body.title !== undefined ? String(body.title) : undefined as unknown as string,
    slug: body.slug !== undefined ? String(body.slug) : undefined,
    excerpt: body.excerpt !== undefined ? String(body.excerpt) : undefined,
    content: body.content !== undefined ? String(body.content) : undefined,
    coverImage: body.coverImage !== undefined ? (body.coverImage ? String(body.coverImage) : null) : undefined,
    status: body.status !== undefined ? ((body.status === "published" ? "published" : "draft") as PostStatus) : undefined,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
  };

  const post = updatePost(id, input);
  return json({ post });
};

export const DELETE: APIRoute = ({ params }) => {
  const ok = deletePost(params.id!);
  if (!ok) return json({ error: "Post not found." }, 404);
  return json({ ok: true });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
