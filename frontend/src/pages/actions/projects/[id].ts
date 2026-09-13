import type { APIRoute } from "astro";
import { updateProject, deleteProject, getProjectById } from "../../../lib/projects";
import { parseStacks } from "./index";
import type { ProjectInput, ProjectStatus } from "../../../lib/types";

export const prerender = false;

function cleanUrl(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

export const PUT: APIRoute = async ({ params, request }) => {
  const id = params.id!;
  if (!(await getProjectById(id))) return json({ error: "Project not found." }, 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const input: ProjectInput = {
    title: body.title !== undefined ? String(body.title) : (undefined as unknown as string),
    description: body.description !== undefined ? String(body.description) : undefined,
    image: body.image !== undefined ? (body.image ? String(body.image) : null) : undefined,
    techStacks: body.techStacks !== undefined ? parseStacks(body.techStacks) : undefined,
    githubUrl: body.githubUrl !== undefined ? cleanUrl(body.githubUrl) : undefined,
    liveUrl: body.liveUrl !== undefined ? cleanUrl(body.liveUrl) : undefined,
    status: body.status !== undefined ? ((body.status === "published" ? "published" : "draft") as ProjectStatus) : undefined,
  };

  const project = await updateProject(id, input);
  return json({ project });
};

export const DELETE: APIRoute = async ({ params }) => {
  const ok = await deleteProject(params.id!);
  if (!ok) return json({ error: "Project not found." }, 404);
  return json({ ok: true });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
