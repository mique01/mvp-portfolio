import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtMoney } from "@/lib/portfolio";

type Point = { date: string; invested: number; value: number };

type Props = {
  data: Point[];
  height?: number;
  positive?: boolean;
  formatAsPercentage?: boolean;
};

function labelFormatter(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function ChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ dataKey?: string; value?: number }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const dateLabel = label ? labelFormatter(String(label)) : "";
  const invested = payload.find((item) => item.dataKey === "invested")?.value ?? 0;
  const value = payload.find((item) => item.dataKey === "value")?.value ?? 0;
  const pnl = value - invested;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-[11px] shadow-lg">
      <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {dateLabel}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Inversión</span>
          <span className="num font-medium">{fmtMoney(Number(invested), { compact: false })}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Tenencia</span>
          <span className="num font-medium">{fmtMoney(Number(value), { compact: false })}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border pt-1.5">
          <span className="text-muted-foreground">Neto</span>
          <span className={`num font-medium ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
            {fmtMoney(pnl, { compact: false })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PerformanceChart({
  data,
  height = 260,
  positive = true,
  formatAsPercentage = false,
}: Props) {
  const valueStroke = positive ? "var(--chart-1)" : "var(--destructive)";
  const investedStroke = "var(--muted-foreground)";

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="perfFillValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={valueStroke} stopOpacity={0.32} />
              <stop offset="100%" stopColor={valueStroke} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="perfFillInvested" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={investedStroke} stopOpacity={0.18} />
              <stop offset="100%" stopColor={investedStroke} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="var(--muted-foreground)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: string) => {
              const date = new Date(value);
              if (Number.isNaN(date.getTime())) return value;
              return date.toLocaleDateString("es-AR", { month: "short", day: "2-digit" });
            }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value: number) =>
              formatAsPercentage
                ? `${Number(value).toFixed(1)}%`
                : fmtMoney(Number(value), { compact: true })
            }
          />
          <Tooltip
            content={<ChartTooltip />}
          />
          <Area
            type="monotone"
            dataKey="invested"
            stroke={investedStroke}
            strokeWidth={1.5}
            fill="url(#perfFillInvested)"
            fillOpacity={1}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={valueStroke}
            strokeWidth={2}
            fill="url(#perfFillValue)"
            fillOpacity={1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

