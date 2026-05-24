"use client";

import { motion } from "framer-motion";
import type { RisqueEnum } from "@/types/database";
import { cn } from "@/lib/utils";

const colorVar: Record<RisqueEnum, string> = {
  FAIBLE: "hsl(var(--risk-low))",
  MODERE: "hsl(var(--risk-mid))",
  ELEVE:  "hsl(var(--risk-high))",
};

export function ScoreGauge({
  score,
  tier,
  size = 200,
}: {
  score: number;
  tier: RisqueEnum;
  size?: number;
}) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.max(0, Math.min(1, score)) * circumference;
  const color = colorVar[tier];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--border))"
          strokeWidth="8"
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-display text-4xl font-bold")} style={{ color }}>
          {(score * 100).toFixed(0)}
          <span className="text-xl">%</span>
        </span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{tier}</span>
      </div>
    </div>
  );
}
