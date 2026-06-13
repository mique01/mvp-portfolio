import { Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { PnL } from "@/components/PnL";
import { fmtMoney } from "@/lib/portfolio";
import type { ClientProfileHeaderMeta, PortfolioCurrencyMode } from "@/lib/client-profile";

type Props = {
  name: string;
  headerMeta: ClientProfileHeaderMeta;
  positionsCount: number;
  totalValue: number;
  pnl: number;
  pnlPct: number;
  currencyMode: PortfolioCurrencyMode;
};

export function ClientHeader({
  name,
  headerMeta,
  positionsCount,
  totalValue,
  pnl,
  pnlPct,
  currencyMode,
}: Props) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.45fr_repeat(3,minmax(0,1fr))]">
      <div className="rounded-md border border-border bg-surface px-4 py-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-secondary text-2xl font-semibold text-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-3xl tracking-tight text-foreground md:text-4xl">
                  {name}
                </h1>
                <p className="num mt-1 text-xs text-muted-foreground">
                  ID Cliente: {headerMeta.comitente} · {positionsCount} posiciones activas
                </p>
              </div>
              <Badge className="rounded-sm border border-success/40 bg-success/15 text-success">
                {headerMeta.status}
              </Badge>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">Desde: {headerMeta.createdAtLabel}</p>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {headerMeta.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {headerMeta.phone}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:col-span-3 xl:grid-cols-3">
        <StatCard
          label="Valor total"
          value={
            currencyMode === "USD_MEP_TODAY"
              ? `US$${totalValue.toLocaleString("es-AR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}`
              : fmtMoney(totalValue, { compact: true })
          }
          hint={currencyMode === "USD_MEP_TODAY" ? "Valuación ARS-USD hoy" : "Valuación actual"}
        />
        <StatCard
          label="Rendimiento acumulado"
          value={`${
            pnl >= 0 ? "+" : "-"
          }${currencyMode === "USD_MEP_TODAY" ? "US$" : "$"}${Math.abs(pnl).toLocaleString(
            "es-AR",
            {
              maximumFractionDigits: 2,
            },
          )}`}
          hint={
            <PnL
              value={pnl}
              pct={pnlPct}
              currency={currencyMode === "USD_MEP_TODAY" ? "USD" : "ARS"}
            />
          }
          accent={pnl >= 0 ? "success" : "destructive"}
        />
      </div>
    </section>
  );
}
