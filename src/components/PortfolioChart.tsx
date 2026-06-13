import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { fmtMoney } from "@/lib/portfolio";
import type { PortfolioSlice } from "@/lib/client-profile";

const PALETTE = [
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-4)",
  "var(--muted-foreground)",
];

type Props = {
  data: PortfolioSlice[];
  total: number;
};

export function PortfolioChart({ data, total }: Props) {
  if (data.length === 0 || total <= 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-border/70 bg-background/30 px-4 text-center text-sm text-muted-foreground sm:min-h-[260px]">
        No hay posicionamiento suficiente para construir la distribucion del portfolio.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[220px_minmax(0,1fr)] xl:items-center">
      <div className="mx-auto w-full max-w-[180px] sm:max-w-[220px]">
        <div className="relative h-[180px] w-[180px] sm:h-[220px] sm:w-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={86}
                paddingAngle={2}
                stroke="var(--background)"
                strokeWidth={2}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => fmtMoney(Number(value))}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <p className="num text-xl font-semibold leading-none text-foreground">
              {fmtMoney(total, { compact: true })}
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Total
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        {data.map((slice, index) => (
          <div
            key={slice.name}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: PALETTE[index % PALETTE.length] }}
              />
              <span className="truncate font-medium">{slice.name}</span>
            </div>
            <span className="num whitespace-nowrap text-right text-muted-foreground">{slice.pct.toFixed(1)}%</span>
            <span className="num whitespace-nowrap text-right font-medium">
              {fmtMoney(slice.value, { compact: true })}
            </span>
          </div>
        ))}

        <div className="mt-3 border-t border-border pt-3">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
            <span>Total</span>
            <span className="num whitespace-nowrap text-right text-muted-foreground">100%</span>
            <span className="num whitespace-nowrap text-right font-semibold">
              {fmtMoney(total, { compact: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
