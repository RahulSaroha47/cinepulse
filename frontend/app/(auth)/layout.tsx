import PosterGrid from "./PosterGrid";

const stats = [
  { label: "24k films tracked today", color: "#e63946" },
  { label: "Daily quiz live",          color: "#f4c430" },
  { label: "3.2k members online",      color: "#22c55e" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── LEFT: Form ── */}
      <div className="relative z-10 flex w-full flex-col justify-center px-6 py-10 md:w-[42%] md:min-w-[420px] md:px-14 md:py-12"
        style={{
          background: "linear-gradient(135deg, #08080f 0%, #0d0b18 100%)",
        }}
      >
        {/* Red glow top-left */}
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-[400px] w-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(230,57,70,0.12) 0%, transparent 70%)",
          }}
        />
        {children}
      </div>

      {/* ── RIGHT: Poster collage (hidden on mobile) ── */}
      <div className="relative hidden flex-1 overflow-hidden md:block">
        {/* Left-edge fade into form */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-56"
          style={{ background: "linear-gradient(to right, #08080f, transparent)" }}
        />
        {/* Top + bottom vignette */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(to bottom, #08080f 0%, transparent 15%, transparent 85%, #08080f 100%)",
          }}
        />
        {/* Dark tint over posters */}
        <div className="absolute inset-0 z-[5] bg-[rgba(8,8,15,0.4)]" />

        <PosterGrid />

        {/* Stat chips */}
        <div className="absolute right-10 top-10 z-20 flex flex-col items-end gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 rounded-full border border-white/[0.08] px-4 py-[6px] font-code text-[11px] tracking-wide text-white/60"
              style={{ background: "rgba(8,8,15,0.75)", backdropFilter: "blur(8px)" }}
            >
              <span
                className="h-[6px] w-[6px] rounded-full animate-pulse"
                style={{ background: s.color }}
              />
              {s.label}
            </div>
          ))}
        </div>

        {/* Quote */}
        <div className="absolute bottom-10 right-10 z-20 max-w-xs text-right">
          <p className="font-body text-xl font-light italic text-white/60 leading-relaxed">
            "Cinema is a mirror by which we often see ourselves."
          </p>
          <p className="mt-2 font-code text-[10px] uppercase tracking-[0.15em] text-white/25">
            — Martin Scorsese
          </p>
        </div>
      </div>
    </div>
  );
}
