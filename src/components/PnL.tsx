import { cn } from "@/lib/utils";

export function PnL({
  value,
  pct,
  showValue = true,
  currency = "ARS",
  className,
}: {
  value?: number;
  pct: number;
  showValue?: boolean;
  currency?: "ARS" | "USD";
  className?: string;
}) {
  const positive = pct >= 0;
  const prefix = currency === "USD" ? "US$" : "$";
  const fmt = (n: number) => prefix + Math.round(n).toLocaleString("es-AR");
  return (
    <span
      className={cn(
        "num inline-flex items-baseline gap-1.5 font-medium",
        positive ? "text-success" : "text-destructive",
        className,
      )}
    >
      {showValue && value !== undefined && (
        <span className="text-xs">
          {positive ? "+" : "−"}
          {fmt(Math.abs(value))}
        </span>
      )}
      <span className="text-[11px]">
        {positive ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
      </span>
    </span>
  );
}
