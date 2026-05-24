import { cn } from "@/lib/utils";

/**
 * AutiVision wordmark — text-only, single sans font.
 *  - "Auti"   in foreground colour (semibold)
 *  - "Vision" in primary blue (semibold)
 */
export function Wordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes: Record<typeof size, string> = {
    sm: "text-lg",
    md: "text-xl md:text-[1.35rem]",
    lg: "text-3xl md:text-4xl",
  };
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-sans font-semibold tracking-tight",
        sizes[size],
        className
      )}
    >
      <span className="text-foreground">Auti</span>
      <span className="text-primary">Vision</span>
    </span>
  );
}
