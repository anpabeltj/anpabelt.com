import { db } from "./db";
import { nanoid } from "nanoid";
import type { ProjectInput, ProjectRecord, ProjectStatus } from "./types";

type Rec = Record<string, unknown>;

function rowToProject(r: Rec): ProjectRecord {
  return {
    id: String(r.id),
    title: String(r.title),
    description: String(r.description ?? ""),
    image: r.image != null ? String(r.image) : null,
    techStacks: safeParseStacks(r.tech_stacks),
    githubUrl: r.github_url != null ? String(r.github_url) : null,
    liveUrl: r.live_url != null ? String(r.live_url) : null,
    status: String(r.status) as ProjectStatus,
    sortOrder: Number(r.sort_order ?? 0),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function safeParseStacks(raw: unknown): string[] {
  try {
    const v = JSON.parse(String(raw));
    return Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function listProjects(opts: { status?: ProjectStatus | "all" } = {}): Promise<ProjectRecord[]> {
  const c = await db();
  const status = opts.status ?? "all";
  const rs =
    status === "all"
      ? await c.execute("SELECT * FROM projects ORDER BY sort_order ASC, created_at ASC")
      : await c.execute({ sql: "SELECT * FROM projects WHERE status = ? ORDER BY sort_order ASC, created_at ASC", args: [status] });
  return rs.rows.map((r) => rowToProject(r as Rec));
}

export async function getProjectById(id: string): Promise<ProjectRecord | null> {
  const c = await db();
  const rs = await c.execute({ sql: "SELECT * FROM projects WHERE id = ?", args: [id] });
  return rs.rows.length ? rowToProject(rs.rows[0] as Rec) : null;
}

async function nextSortOrder(): Promise<number> {
  const c = await db();
  const rs = await c.execute("SELECT COALESCE(MAX(sort_order), -1) AS m FROM projects");
  return Number((rs.rows[0] as Rec).m) + 1;
}

export async function createProject(input: ProjectInput): Promise<ProjectRecord> {
  const c = await db();
  const now = new Date().toISOString();
  const id = nanoid();
  const status: ProjectStatus = input.status ?? "draft";
  const sortOrder = await nextSortOrder();
  await c.execute({
    sql: `INSERT INTO projects (id, title, description, image, tech_stacks, github_url, live_url, status, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.title.trim(),
      (input.description ?? "").trim(),
      input.image ?? null,
      JSON.stringify(input.techStacks ?? []),
      input.githubUrl ?? null,
      input.liveUrl ?? null,
      status,
      sortOrder,
      now,
      now,
    ],
  });
  return (await getProjectById(id))!;
}

export async function updateProject(id: string, input: ProjectInput): Promise<ProjectRecord | null> {
  const c = await db();
  const current = await getProjectById(id);
  if (!current) return null;
  const now = new Date().toISOString();
  await c.execute({
    sql: `UPDATE projects SET title=?, description=?, image=?, tech_stacks=?, github_url=?, live_url=?, status=?, updated_at=? WHERE id=?`,
    args: [
      (input.title ?? current.title).trim(),
      (input.description ?? current.description).trim(),
      input.image !== undefined ? input.image : current.image,
      JSON.stringify(input.techStacks ?? current.techStacks),
      input.githubUrl !== undefined ? input.githubUrl : current.githubUrl,
      input.liveUrl !== undefined ? input.liveUrl : current.liveUrl,
      input.status ?? current.status,
      now,
      id,
    ],
  });
  return getProjectById(id);
}

export async function deleteProject(id: string): Promise<boolean> {
  const c = await db();
  const rs = await c.execute({ sql: "DELETE FROM projects WHERE id = ?", args: [id] });
  return rs.rowsAffected > 0;
}

export async function reorderProjects(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const c = await db();
  await c.batch(
    ids.map((id, i) => ({ sql: "UPDATE projects SET sort_order = ? WHERE id = ?", args: [i, id] })),
    "write"
  );
}
