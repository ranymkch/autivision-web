import { cn } from "@/lib/utils";

export function SectionLabel({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary",
        className
      )}
    >
      <span className="h-px w-6 bg-primary" />
      {label}
    </span>
  );
}
