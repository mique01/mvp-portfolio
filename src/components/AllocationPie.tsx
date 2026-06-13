import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { fmtMoney } from "@/lib/portfolio";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-4)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-2)",
];

type Datum = { name: string; value: number; pct: number };

export function AllocationPie({
  data,
  valueFormatter = (value) => fmtMoney(value),
  legendValueFormatter = (value) => fmtMoney(value, { compact: true }),
}: {
  data: Datum[];
  valueFormatter?: (value: number) => string;
  legendValueFormatter?: (value: number) => string;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!data.length) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-border/70 bg-background/30 px-4 text-center text-sm text-muted-foreground">
        No hay datos suficientes para construir esta distribucion.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
      <div className="flex h-56 items-center justify-center">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                stroke="var(--background)"
                strokeWidth={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v) => valueFormatter(Number(v))}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-40 w-40 items-center justify-center rounded-full border border-dashed border-border/70 bg-background/40 text-xs text-muted-foreground">
            Cargando grafico
          </div>
        )}
      </div>
      <ul className="space-y-3">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              <span className="text-foreground">{d.name}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="num text-muted-foreground">{legendValueFormatter(d.value)}</span>
              <span className="num w-12 text-right font-medium">{d.pct.toFixed(1)}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
