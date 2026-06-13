import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "default" | "destructive" | "success";
  className?: string;
  children?: ReactNode;
};

export function StatCard({ label, value, hint, accent = "default", className, children }: Props) {
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-md border border-border bg-surface p-4 transition-colors hover:border-primary/40",
        className,
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "num mt-2 text-2xl font-semibold tracking-tight md:text-3xl",
          accent === "destructive" && "text-destructive",
          accent === "success" && "text-success",
        )}
      >
        {value}
      </div>
      {hint && <div className="num mt-1 text-[11px] text-muted-foreground">{hint}</div>}
      {children && <div className="mt-3 border-t border-border/60 pt-3">{children}</div>}
    </div>
  );
}
