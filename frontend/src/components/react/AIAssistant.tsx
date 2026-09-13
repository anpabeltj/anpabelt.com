import { useEffect, useState } from "react";

const SparkleIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l1.6 4.9L18.5 8.5l-4.9 1.6L12 15l-1.6-4.9L5.5 8.5l4.9-1.6L12 2z" />
    <path d="M19 14l.8 2.4 2.4.8-2.4.8L19 20l-.8-2.4-2.4-.8 2.4-.8L19 14z" opacity="0.8" />
  </svg>
);

export default function AIAssistant() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-ai-assistant", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-ai-assistant", onOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="ai-assistant-launcher"
        aria-label="Ask my AI assistant"
        className="group fixed bottom-6 left-6 z-[70] inline-flex items-center gap-2 rounded-full border border-mint/40 bg-card/80 backdrop-blur-md px-4 py-3 text-sm font-medium text-mint shadow-2xl hover:bg-mint/15 hover:border-mint/70 transition-all hover:-translate-y-0.5"
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint/40" />
          <SparkleIcon className="relative h-5 w-5" />
        </span>
        <span className="hidden sm:inline">Ask AI</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[92] flex items-center justify-center p-4"
          data-testid="ai-assistant-modal"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden="true" />

          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-card shadow-2xl"
            style={{ animation: "cardIn 0.3s ease both" }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              data-testid="ai-assistant-close"
              aria-label="Close"
              className="absolute right-4 top-4 z-10 text-white/70 hover:text-white text-2xl leading-none"
            >
              ✕
            </button>

            <div className="relative">
              <img
                src="/assets/images/ai-coming-soon.webp"
                alt="AI assistant orb, currently in development"
                width={1000}
                height={670}
                className="h-52 w-full object-cover sm:h-60"
                data-testid="ai-assistant-image"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
              <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-mint/40 bg-mint/15 px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-mint">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" />
                In development
              </span>
            </div>

            <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
              <h2 className="font-display text-2xl font-bold text-white" data-testid="ai-assistant-title">
                My AI Assistant is <span className="text-mint">coming soon</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-retro-50/75">
                I'm building a custom AI that will let you chat about my projects, explore my
                work and get quick answers — right here on the site. It's still in the lab 🧪,
                being trained and fine-tuned. Check back soon!
              </p>

              {/* Decorative disabled chat bar to hint at the future experience */}
              <div className="mt-6 flex items-center gap-2 rounded-full border border-white/10 bg-elevated px-4 py-3 opacity-70">
                <SparkleIcon className="h-4 w-4 text-mint/70" />
                <input
                  disabled
                  placeholder="Ask me anything… (warming up)"
                  data-testid="ai-assistant-disabled-input"
                  className="w-full cursor-not-allowed bg-transparent text-sm text-retro-50/60 placeholder:text-retro-400 focus:outline-none"
                />
                <span className="shrink-0 rounded-full bg-white/5 px-3 py-1 text-xs font-mono text-retro-400">soon</span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/contact"
                  data-testid="ai-assistant-notify"
                  className="inline-flex items-center gap-2 rounded-full bg-mint px-5 py-2.5 text-sm font-semibold text-canvas hover:bg-mint-bright transition-colors"
                >
                  Notify me when it's live
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center rounded-full border border-white/15 px-5 py-2.5 text-sm text-retro-50/80 hover:text-white hover:border-white/30 transition-colors"
                >
                  Back to site
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
