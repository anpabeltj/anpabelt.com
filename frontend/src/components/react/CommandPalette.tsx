import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface CommandItem {
  label: string;
  href: string;
  group: string;
  hint?: string;
}

export default function CommandPalette({ items }: { items: CommandItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q));
  }, [items, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const go = useCallback((href: string) => {
    close();
    window.location.href = href;
  }, [close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
      document.documentElement.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
    }
    return () => { document.documentElement.style.overflow = ""; };
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const r = results[active]; if (r) go(r.href); }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let idx = -1;
  const groups = Array.from(new Set(results.map((r) => r.group)));

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]" data-testid="command-palette" onKeyDown={onListKey}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} aria-hidden="true" />
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-card shadow-2xl overflow-hidden" style={{ animation: "cardIn 0.25s ease both" }}>
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <svg className="w-4 h-4 text-retro-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and posts…"
            data-testid="command-palette-input"
            className="w-full bg-transparent py-4 text-sm text-white placeholder:text-retro-400 focus:outline-none"
          />
          <kbd className="hidden sm:block text-[10px] font-mono text-retro-400 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-retro-400" data-testid="command-palette-empty">No results for “{query}”.</p>
          )}
          {groups.map((group) => (
            <div key={group}>
              <p className="px-4 pt-3 pb-1 text-[10px] font-mono uppercase tracking-widest text-retro-400/70">{group}</p>
              {results.filter((r) => r.group === group).map((r) => {
                idx += 1;
                const i = idx;
                return (
                  <button
                    key={r.href}
                    type="button"
                    data-index={i}
                    data-testid="command-palette-item"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r.href)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${i === active ? "bg-mint/15 text-mint" : "text-retro-50/85 hover:bg-white/5"}`}
                  >
                    <span className="truncate">{r.label}</span>
                    {r.hint && <span className="shrink-0 text-xs text-retro-400">{r.hint}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
