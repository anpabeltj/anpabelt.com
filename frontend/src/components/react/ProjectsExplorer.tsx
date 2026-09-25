import { useMemo, useState } from "react";

export interface ExplorerProject {
  title: string;
  description: string;
  image: string;
  tech: string[];
  githubUrl?: string | null;
  liveUrl?: string | null;
}

export default function ProjectsExplorer({ projects }: { projects: ExplorerProject[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allTech = useMemo(
    () => Array.from(new Set(projects.flatMap((p) => p.tech))).sort((a, b) => a.localeCompare(b)),
    [projects]
  );

  const filtered = useMemo(() => {
    if (selected.size === 0) return projects;
    const want = [...selected];
    return projects.filter((p) => {
      const set = new Set(p.tech.map((t) => t.toLowerCase()));
      return want.every((t) => set.has(t));
    });
  }, [projects, selected]);

  const toggle = (tech: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tech)) next.delete(tech);
      else next.add(tech);
      return next;
    });
  };

  const clear = () => setSelected(new Set());
  const filterKey = [...selected].sort().join("|");
  const num = (i: number) => String(i + 1).padStart(2, "0");

  return (
    <div>
      {allTech.length > 0 && (
        <div className="reveal mt-10 flex flex-wrap items-center gap-2" data-testid="project-filters" style={{ animationDelay: "140ms" }}>
          <span className="mr-2 font-mono text-[8.5px] uppercase tracking-[0.18em] text-white/40">Filter</span>
          <button type="button" onClick={clear} className={`project-chip${selected.size === 0 ? " chip-active" : ""}`} data-testid="project-filter-all">
            All
          </button>
          {allTech.map((t) => {
            const key = t.toLowerCase();
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={`project-chip${selected.has(key) ? " chip-active" : ""}`}
                data-testid={`project-filter-${key.replace(/[^a-z0-9]+/g, "-")}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-6 font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/40" data-testid="project-match-count" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "record" : "records"}
        {selected.size > 0 ? ` matching ${[...selected].length} filter${selected.size === 1 ? "" : "s"}` : ""}
      </p>

      <div key={filterKey} className="mt-4 border-t border-white/10 pt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
        {filtered.map((p, i) => (
          <article
            key={p.title + i}
            className="project-card-anim group flex flex-col justify-between py-1 border-l border-white/15 pl-5 hover:border-white transition-all duration-300"
            style={{ animationDelay: `${i * 50}ms` }}
            data-testid="project-card"
            data-tech={p.tech.map((t) => t.toLowerCase()).join("|")}
          >
            <div>
              <div className="flex items-center space-x-2 italic text-xs tracking-[0.2em] text-white/40 mb-2 font-light font-serif">
                <span>{num(i)}</span>
                <span className="text-white/20">/</span>
                <span className="tracking-[0.16em] uppercase not-italic font-sans text-[8.5px]">{p.tech[0]?.toUpperCase() ?? "PROJECT"}</span>
              </div>
              <h3 className="text-xl lg:text-2xl text-white/95 group-hover:text-white transition-colors tracking-wide font-normal leading-tight font-display">
                {p.title}
              </h3>
              <p className="font-sans text-xs text-white/55 mt-2.5 font-light leading-relaxed">{p.description}</p>
            </div>

            {p.tech.length > 0 && (
              <p className="mt-6 pt-3 border-t border-white/5 font-mono text-[8.5px] tracking-[0.16em] text-white/40 group-hover:text-white/80 transition-colors uppercase">
                {p.tech.join(" · ")}
              </p>
            )}

            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-5">
                {p.liveUrl && (
                  <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" data-testid="project-link"
                    className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/40 hover:text-white transition-colors">
                    Live →
                  </a>
                )}
                {p.githubUrl && (
                  <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" data-testid="project-link"
                    className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/40 hover:text-white transition-colors">
                    GitHub ↗
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-12 text-center font-mono text-sm text-white/40" data-testid="projects-empty">
          No projects match that combination.
        </p>
      )}
    </div>
  );
}