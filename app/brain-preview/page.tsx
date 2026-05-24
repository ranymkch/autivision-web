"use client";

import dynamic from "next/dynamic";

const HologramBrain = dynamic(
  () => import("@/components/marketing/hologram-brain").then((m) => m.HologramBrain),
  { ssr: false, loading: () => <div className="text-sm text-cyan-300/60">Loading 3D…</div> }
);

export default function BrainPreviewPage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#020617]">
      {/* radial cyan glow background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(34,211,238,0.18), transparent 60%)",
        }}
      />
      {/* faint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 h-full w-full">
        <HologramBrain />
      </div>

      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/60">
        Autivision · brain hologram preview
      </div>
    </main>
  );
}
