import { useEffect, useState } from "react";

const RadarIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
    {/* three concentric rings: inner solid, middle dashed, outer solid */}
    <circle cx="12" cy="12" r="3.2" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="6.2" strokeDasharray="2.6 2.2" />
    <circle cx="12" cy="12" r="9.4" />
    {/* crosshair axes */}
    <line x1="12" y1="1.2" x2="12" y2="4.2" />
    <line x1="12" y1="19.8" x2="12" y2="22.8" />
    <line x1="1.2" y1="12" x2="4.2" y2="12" />
    <line x1="19.8" y1="12" x2="22.8" y2="12" />
    {/* four diamond tick marks */}
    <rect x="9.6" y="9.6" width="4.8" height="4.8" transform="rotate(45 12 12)" fill="currentColor" stroke="none" opacity="0.85" />
  </svg>
);

/* Astrolabe-style graphic that matches the ARCHIVE_2025 site backdrop —
   concentric rings, rotating dashed ring, crosshair, medallion, sonar ping. */
const AstrolabeGraphic = ({ className = "" }: { className?: string }) => (
  <div
    className={className}
    data-testid="ai-assistant-image"
    aria-label="AI assistant orb — system warming up"
    role="img"
  >
    <div className="relative flex h-full w-full items-center justify-center">
      {/* outer dashed ring (slow counter-rotate) */}
      <div className="ai-ring ai-ring-outer" />
      {/* partial clip-path ring */}
      <div className="ai-ring ai-ring-partial" />
      {/* cardinal ticks */}
      <span className="ai-tick ai-tick-n" />
      <span className="ai-tick ai-tick-s" />
      <span className="ai-tick ai-tick-e" />
      <span className="ai-tick ai-tick-w" />
      {/* inner counter-rotating dashed ring */}
      <div className="ai-ring ai-ring-inner" />
      {/* crosshair axes over the rings */}
      <span className="ai-axis ai-axis-h" />
      <span className="ai-axis ai-axis-v" />
      {/* white medallion core */}
      <div className="ai-medallion">
        <RadarIcon className="h-5 w-5 text-black sm:h-6 sm:w-6" />
      </div>
      {/* orbit node + sonar ping */}
      <span className="ai-node" />
      <span className="ai-ping" />
    </div>
  </div>
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
        className="group fixed bottom-6 left-6 z-[70] inline-flex items-center gap-2.5 rounded-none border border-white/30 bg-canvas/80 backdrop-blur-md px-4 py-3.5 sm:py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-white shadow-2xl hover:bg-white hover:text-black hover:border-white transition-all min-h-[48px]"
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/40" />
          <RadarIcon className="relative h-[22px] w-[22px]" />
        </span>
        <span className="hidden sm:inline">Ask AI</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[92] flex items-center justify-center p-4"
          data-testid="ai-assistant-modal"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="absolute inset-0 bg-[#070709]/80 backdrop-blur-sm" aria-hidden="true" />

          <div
            className="relative w-full max-w-lg overflow-hidden rounded-none border border-[#121217] bg-card shadow-2xl"
            style={{ animation: "cardIn 0.3s ease both" }}
          >
            {/* crop-mark corners (ARCHIVE registration marks) */}
            <span className="ai-crop ai-crop-tl" />
            <span className="ai-crop ai-crop-tr" />
            <span className="ai-crop ai-crop-bl" />
            <span className="ai-crop ai-crop-br" />

            <button
              type="button"
              onClick={() => setOpen(false)}
              data-testid="ai-assistant-close"
              aria-label="Close"
              className="absolute right-4 top-4 z-10 font-mono text-sm tracking-widest text-white/60 hover:text-white"
            >
              [ESC-X]
            </button>

            {/* Header strip: telemetry meta */}
            <div className="flex items-baseline justify-between border-b border-[#121217] px-6 py-3 sm:px-8">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8e8e93]">
                //&nbsp;AI.ASSISTANT
              </span>
              <span className="font-serif italic text-xs tracking-widest text-[#3a3a42]">
                [ 01 — MODULE ]
              </span>
            </div>

            {/* Graphic: astrolabe in development state */}
            <div className="relative flex items-center justify-center border-b border-[#121217] bg-elevated/60 px-6 py-10 sm:py-12">
              <AstrolabeGraphic className="h-40 w-40 sm:h-52 sm:w-52" />
              <span className="absolute left-5 top-5 inline-flex items-center gap-2 border border-white/25 bg-black/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                In development
              </span>
              <span className="absolute right-5 top-5 font-mono text-[9px] uppercase tracking-[0.2em] text-[#8e8e93]">
                SYS.AI&nbsp;//&nbsp;WARMING_UP
              </span>
              <span className="absolute bottom-4 left-6 font-mono text-[9px] uppercase tracking-[0.2em] text-[#3a3a42]">
                ASTROLABE // 01
              </span>
              <span className="absolute bottom-4 right-6 font-mono text-[9px] uppercase tracking-[0.2em] text-[#3a3a42]">
                CAL.35°
              </span>
            </div>

            <div className="px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
              <h2
                className="font-display text-2xl font-light lowercase tracking-[0.08em] text-white sm:text-[1.7rem]"
                data-testid="ai-assistant-title"
              >
                My AI Assistant is <span className="italic">coming soon</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#8e8e93]">
                A custom AI that will let you chat about my projects, explore my work and get
                quick answers — right here on the site. It's still in the lab, being trained and
                fine-tuned. Check back soon.
              </p>

              {/* Decorative disabled chat bar */}
              <div className="mt-6 flex items-center gap-3 rounded-none border border-[#121217] bg-elevated px-4 py-3 opacity-80">
                <RadarIcon className="h-4 w-4 shrink-0 text-white/70" />
                <input
                  disabled
                  placeholder="Ask me anything… (warming up)"
                  data-testid="ai-assistant-disabled-input"
                  className="w-full cursor-not-allowed bg-transparent font-mono text-xs text-[#f5f5f7]/50 placeholder:text-[#3a3a42] focus:outline-none"
                />
                <span className="shrink-0 border border-white/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#8e8e93]">
                  soon
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/contact"
                  data-testid="ai-assistant-notify"
                  className="inline-flex items-center gap-2 rounded-none bg-white px-5 py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#c9c9ce]"
                >
                  Notify me when it's live
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center rounded-none border border-white/15 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-[#f5f5f7]/80 transition-colors hover:border-white/40 hover:text-white"
                >
                  Back to site
                </button>
              </div>

              {/* Footer telemetry strip */}
              <div className="mt-6 flex items-center justify-between border-t border-[#121217] pt-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#3a3a42]">
                  MOD // ANPABELT — CUSTOM.AI
                </span>
                <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[#3a3a42]">
                  <span className="inline-block h-1 w-1 rounded-full bg-white/70" />
                  STATUS: WARMING_UP
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* astrolabe graphic — matches the ARCHIVE_2025 backdrop language */
        .ai-ring {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
        }
        .ai-ring-outer {
          inset: 2%;
          border: 1px solid rgba(255,255,255,0.28);
          box-shadow: 0 0 30px rgba(255,255,255,0.06);
          animation: aiSpin 45s linear infinite;
        }
        .ai-ring-partial {
          inset: -8%;
          border: 1px solid rgba(255,255,255,0.10);
          clip-path: polygon(0 0, 58% 0, 58% 58%, 0 58%);
          opacity: 0.5;
        }
        .ai-ring-inner {
          inset: 22%;
          border: 1px dashed rgba(255,255,255,0.35);
          animation: aiSpinRev 30s linear infinite;
        }
        .ai-tick {
          position: absolute;
          background: rgba(255,255,255,0.45);
        }
        .ai-tick-n { top: 4%; left: 50%; width: 1px; height: 6px; transform: translateX(-50%); }
        .ai-tick-s { bottom: 4%; left: 50%; width: 1px; height: 6px; transform: translateX(-50%); }
        .ai-tick-e { top: 50%; right: 4%; width: 6px; height: 1px; transform: translateY(-50%); }
        .ai-tick-w { top: 50%; left: 4%; width: 6px; height: 1px; transform: translateY(-50%); }
        .ai-axis { position: absolute; background: rgba(255,255,255,0.25); }
        .ai-axis-h { left: 8%; right: 8%; top: 50%; height: 1px; }
        .ai-axis-v { top: 8%; bottom: 8%; left: 50%; width: 1px; }
        .ai-medallion {
          position: relative;
          z-index: 2;
          width: 34%;
          height: 34%;
          background: #fff;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.92;
        }
        .ai-node {
          position: absolute;
          top: 4%;
          left: 50%;
          transform: translate(-50%, 0);
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: #fff;
          animation: aiNode 3.2s ease-in-out infinite;
        }
        .ai-ping {
          position: absolute;
          top: 4%;
          left: 50%;
          transform: translate(-50%, 0);
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.8);
          animation: aiPing 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes aiSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes aiSpinRev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes aiNode {
          0%, 100% { transform: translate(-50%, 0) scale(1); box-shadow: 0 0 4px rgba(255,255,255,0.6); }
          50% { transform: translate(-50%, 0) scale(1.6); box-shadow: 0 0 12px rgba(255,255,255,0.95); }
        }
        @keyframes aiPing {
          0% { transform: translate(-50%, 0) scale(1); opacity: 0.9; }
          100% { transform: translate(-50%, 0) scale(3.5); opacity: 0; }
        }
        /* crop marks */
        .ai-crop { position: absolute; width: 14px; height: 14px; z-index: 5; pointer-events: none; }
        .ai-crop::before, .ai-crop::after { content: ''; position: absolute; background: rgba(255,255,255,0.35); }
        .ai-crop::before { width: 2px; height: 14px; }
        .ai-crop::after { width: 14px; height: 2px; }
        .ai-crop-tl { top: 42px; left: 16px; }
        .ai-crop-tl::before { left: 0; top: 0; }
        .ai-crop-tl::after { left: 0; top: 0; }
        .ai-crop-tr { top: 42px; right: 16px; }
        .ai-crop-tr::before { right: 0; top: 0; }
        .ai-crop-tr::after { right: 0; top: 0; }
        .ai-crop-bl { bottom: 16px; left: 16px; }
        .ai-crop-bl::before { left: 0; bottom: 0; }
        .ai-crop-bl::after { left: 0; bottom: 0; }
        .ai-crop-br { bottom: 16px; right: 16px; }
        .ai-crop-br::before { right: 0; bottom: 0; }
        .ai-crop-br::after { right: 0; bottom: 0; }
        @media (prefers-reduced-motion: reduce) {
          .ai-ring, .ai-ring-inner, .ai-node, .ai-ping { animation: none !important; }
        }
      `}</style>
    </>
  );
}