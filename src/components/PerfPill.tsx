import { cn } from "@/lib/utils";
import { fmtPct } from "@/lib/portfolio";

type Props = {
  label: string;
  value: number;
  className?: string;
  size?: "sm" | "md";
};

/** Compact +/- pill used for performance metrics (1D / 30D / 1Y). */
export function PerfPill({ label, value, className, size = "md" }: Props) {
  const positive = value >= 0;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-l border-border/80 px-3",
        size === "sm" ? "py-1" : "py-1.5",
        className,
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "num font-medium",
          size === "sm" ? "text-xs" : "text-sm",
          positive ? "text-success" : "text-destructive",
        )}
      >
        {positive ? "▲" : "▼"} {fmtPct(value, 2)}
      </span>
    </div>
  );
}

export function PerfRow({
  perf,
  size = "md",
  className,
}: {
  perf: { d1: number; d30: number; y1: number };
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("flex items-stretch", className)}>
      <PerfPill label="1D" value={perf.d1} size={size} className="border-l-0 pl-0" />
      <PerfPill label="30D" value={perf.d30} size={size} />
      <PerfPill label="1A" value={perf.y1} size={size} />
    </div>
  );
}
