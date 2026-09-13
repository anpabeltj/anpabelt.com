import { useMemo, useState } from "react";

export interface ExplorerProject {
  title: string;
  description: string;
  image: string;
  tech: string[];
  githubUrl?: string | null;
  liveUrl?: string | null;
}

const ArrowIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M7 17L17 7M17 7H8M17 7V16" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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

  return (
    <div>
      {allTech.length > 0 && (
        <div className="reveal mt-10 flex flex-wrap items-center gap-2" data-testid="project-filters" style={{ animationDelay: "140ms" }}>
          <span className="mr-1 font-mono text-xs uppercase tracking-widest text-retro-50/40">Filter</span>
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

      <p className="mt-6 font-mono text-xs text-retro-400" data-testid="project-match-count" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "project" : "projects"}
        {selected.size > 0 ? ` matching ${[...selected].length} filter${selected.size === 1 ? "" : "s"}` : ""}
      </p>

      <div key={filterKey} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {filtered.map((p, i) => (
          <article
            key={p.title + i}
            className="project-card-anim group relative flex flex-col rounded-2xl border border-white/5 bg-card p-6 sm:p-7 shadow-xl transition-all duration-300 hover:border-mint/30 hover:-translate-y-1"
            style={{ animationDelay: `${i * 70}ms` }}
            data-testid="project-card"
            data-tech={p.tech.map((t) => t.toLowerCase()).join("|")}
          >
            <div className="overflow-hidden rounded-xl mb-5 aspect-[16/10] bg-elevated">
              <img
                src={p.image}
                alt={p.title}
                loading="lazy"
                data-zoomable="true"
                data-gallery="projects"
                data-caption={p.title}
                className="h-full w-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <h3 className="font-display text-lg font-semibold text-white leading-snug">{p.title}</h3>
            <p className="mt-2 text-sm text-retro-50/70 leading-relaxed flex-1">{p.description}</p>

            {p.tech.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {p.tech.map((t) => (
                  <li key={t} className="inline-flex items-center rounded-full bg-elevated border border-white/5 px-2.5 py-1 text-xs font-mono text-retro-50/80">
                    {t}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 flex flex-wrap gap-5">
              {p.liveUrl && (
                <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" data-testid="project-link" className="inline-flex items-center gap-1.5 text-sm text-white hover:text-mint transition-colors">
                  View Live <ArrowIcon />
                </a>
              )}
              {p.githubUrl && (
                <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" data-testid="project-link" className="inline-flex items-center gap-1.5 text-sm text-white hover:text-mint transition-colors">
                  GitHub <ArrowIcon />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-12 text-center text-retro-400" data-testid="projects-empty">
          No projects match that combination.
        </p>
      )}
    </div>
  );
}
