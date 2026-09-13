import type { APIRoute } from "astro";
import { createProject } from "../../../lib/projects";
import type { ProjectInput, ProjectStatus } from "../../../lib/types";

export const prerender = false;

export function parseStacks(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function cleanUrl(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
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

  const input: ProjectInput = {
    title,
    description: body.description !== undefined ? String(body.description) : undefined,
    image: body.image ? String(body.image) : null,
    techStacks: parseStacks(body.techStacks),
    githubUrl: cleanUrl(body.githubUrl),
    liveUrl: cleanUrl(body.liveUrl),
    status: (body.status === "published" ? "published" : "draft") as ProjectStatus,
  };

  const project = await createProject(input);
  return json({ project }, 201);
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
