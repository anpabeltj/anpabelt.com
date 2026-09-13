import { useCallback, useEffect, useRef, useState } from "react";

interface Slide { src: string; caption: string; tech: string[]; live: string; }

export default function Lightbox() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const reset = () => { setZoom(1); setPos({ x: 0, y: 0 }); };
  const close = useCallback(() => { setOpen(false); reset(); }, []);
  const next = useCallback(() => { setIndex((i) => (i + 1) % Math.max(slides.length, 1)); reset(); }, [slides.length]);
  const prev = useCallback(() => { setIndex((i) => (i - 1 + slides.length) % Math.max(slides.length, 1)); reset(); }, [slides.length]);

  // Delegate clicks on any zoomable image across the site.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.("img[data-zoomable]") as HTMLImageElement | null;
      if (!target) return;
      e.preventDefault();
      const group = target.getAttribute("data-gallery") || "default";
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(`img[data-zoomable][data-gallery="${group}"]`));
      const list = (imgs.length ? imgs : [target]).map((im) => ({
        src: im.currentSrc || im.src,
        caption: im.getAttribute("data-caption") || im.getAttribute("alt") || "",
        tech: (im.getAttribute("data-tech") || "").split(",").map((s) => s.trim()).filter(Boolean),
        live: im.getAttribute("data-live") || "",
      }));
      const startSrc = target.currentSrc || target.src;
      const start = Math.max(0, list.findIndex((s) => s.src === startSrc));
      setSlides(list);
      setIndex(start);
      reset();
      setOpen(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!open) { document.documentElement.style.overflow = ""; return; }
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.documentElement.style.overflow = ""; };
  }, [open, close, next, prev]);

  if (!open || slides.length === 0) return null;
  const cur = slides[index];
  const many = slides.length > 1;

  const onWheel = (e: React.WheelEvent) => {
    const nz = Math.min(4, Math.max(1, zoom - e.deltaY * 0.002));
    setZoom(nz);
    if (nz === 1) setPos({ x: 0, y: 0 });
  };
  const toggleZoom = () => {
    if (zoom > 1) { setZoom(1); setPos({ x: 0, y: 0 }); }
    else setZoom(2);
  };
  const onDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
  };
  const onMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    setPos({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) });
  };
  const onUp = () => { drag.current = null; };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/92 backdrop-blur-sm p-4"
      data-testid="lightbox"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
    >
      <button onClick={close} aria-label="Close" data-testid="lightbox-close" className="absolute top-4 right-5 text-white/80 hover:text-white text-3xl leading-none">✕</button>

      {many && (
        <button onClick={prev} aria-label="Previous" data-testid="lightbox-prev" className="absolute left-3 sm:left-8 text-white/70 hover:text-white text-4xl leading-none select-none">‹</button>
      )}

      <figure className="flex max-h-[88vh] max-w-6xl flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <img
          src={cur.src}
          alt={cur.caption}
          data-testid="lightbox-image"
          onClick={toggleZoom}
          onWheel={onWheel}
          onMouseDown={onDown}
          draggable={false}
          className="max-h-[80vh] w-auto rounded-xl object-contain shadow-2xl select-none"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
            cursor: zoom > 1 ? "grab" : "zoom-in",
            transition: drag.current ? "none" : "transform 0.2s ease",
          }}
        />
        {cur.caption && <figcaption className="text-center text-sm text-white/80 font-serif italic">{cur.caption}</figcaption>}

        {(cur.tech.length > 0 || cur.live) && (
          <div className="flex flex-col items-center gap-3" data-testid="lightbox-meta">
            {cur.tech.length > 0 && (
              <ul className="flex flex-wrap justify-center gap-1.5">
                {cur.tech.map((t) => (
                  <li key={t} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-mono text-white/75">{t}</li>
                ))}
              </ul>
            )}
            {cur.live && (
              <a
                href={cur.live}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="lightbox-live-link"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-full bg-mint px-4 py-1.5 text-sm font-semibold text-canvas hover:bg-mint-bright transition-colors"
              >
                View Live
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M7 17L17 7M17 7H8M17 7V16" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
            )}
          </div>
        )}

        {many && <p className="font-mono text-xs text-white/40" data-testid="lightbox-counter">{index + 1} / {slides.length}</p>}
      </figure>

      {many && (
        <button onClick={next} aria-label="Next" data-testid="lightbox-next" className="absolute right-3 sm:right-8 text-white/70 hover:text-white text-4xl leading-none select-none">›</button>
      )}
    </div>
  );
}
