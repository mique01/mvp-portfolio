import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useDeferredValue, useState } from "react";
import { RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { AdvisorShell } from "@/components/AdvisorShell";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loadPricesData,
  refreshPricesAction,
} from "@/lib/server/crm-server-functions";
import type { MarketDataStatus } from "@/lib/wealth-types";

export const Route = createFileRoute("/precios")({
  loader: () => loadPricesData(),
  head: () => ({
    meta: [{ title: "Precios | Apex Wealth Hub" }],
  }),
  component: PricesPage,
});

function PricesPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredPrices = normalizedQuery
    ? data.prices.filter((row) => {
        const haystack = `${row.symbol} ${row.description} ${row.assetClass} ${row.currency}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : data.prices;

  return (
    <AdvisorShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Precios</p>
            <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">
              Mercado en vivo
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Panel principal de cotizaciones para restaurar la fuente live de la app. La
              valuacion de carteras usa este feed cuando existe, y cae al precio del archivo
              solo como referencia.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusBadgeVariant(data.marketDataStatus)}>
              {statusLabel(data.marketDataStatus)}
            </Badge>
            <Button
              variant="outline"
              disabled={isRefreshing}
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  const refreshed = await refreshPricesAction({
                    data: { forceRefresh: true },
                  });
                  await router.invalidate();
                  if (refreshed.errors.length > 0) {
                    toast.warning("Precios actualizados con incidencias", {
                      description: refreshed.errors.map((item) => item.endpoint).join(", "),
                    });
                  } else {
                    toast.success("Cotizaciones refrescadas");
                  }
                } catch (error) {
                  toast.error("No se pudieron refrescar los precios", {
                    description:
                      error instanceof Error ? error.message : "Error inesperado de market data.",
                  });
                } finally {
                  setIsRefreshing(false);
                }
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {isRefreshing ? "Actualizando..." : "Refrescar"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Cobertura"
            value={data.prices.length}
            hint="Tickers y fondos con precio live"
          />
          <StatCard
            label="Dolar MEP"
            value={formatMoney(data.dollars.mep)}
            hint="Fuente: dolarapi"
          />
          <StatCard
            label="Dolar CCL"
            value={formatMoney(data.dollars.ccl)}
            hint="Fuente: dolarapi"
          />
          <StatCard
            label="Ultima actualizacion"
            value={formatDateTime(data.fetchedAt)}
            hint={
              data.errors.length
                ? `${data.errors.length} endpoint(s) con error`
                : "Sin errores reportados"
            }
          />
        </div>

        {data.errors.length ? (
          <section className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <div className="font-medium text-destructive">
              Algunas fuentes de mercado no respondieron.
            </div>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {data.errors.map((item) => (
                <li key={`${item.endpoint}-${item.message}`}>
                  {item.endpoint}: {item.message}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Section
          title="Cotizaciones"
          subtitle="Buscá por ticker o nombre. No se muestran valores inventados: si el feed no responde, la fila queda vacía."
          bodyClassName="p-0"
        >
          <div className="border-b border-border px-4 py-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por ticker, descripcion o tipo"
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-4 py-3">Ticker</th>
                  <th className="px-4 py-3">Descripcion</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Moneda</th>
                  <th className="px-4 py-3 text-right">Precio actual</th>
                  <th className="px-4 py-3 text-right">Variacion</th>
                  <th className="px-4 py-3">Fuente</th>
                  <th className="px-4 py-3">Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrices.map((row) => (
                  <tr key={row.symbol} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-foreground">{row.symbol}</td>
                    <td className="px-4 py-3">
                      <div className="text-foreground">{row.description}</div>
                      {row.bid != null || row.ask != null ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Bid {formatMoney(row.bid, row.currency)} | Ask{" "}
                          {formatMoney(row.ask, row.currency)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{row.assetClass}</Badge>
                    </td>
                    <td className="px-4 py-3">{row.currency}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(row.currentPrice, row.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          row.pctChange == null
                            ? "text-muted-foreground"
                            : row.pctChange >= 0
                              ? "text-success"
                              : "text-destructive"
                        }
                      >
                        {formatPct(row.pctChange)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.source === "DATA912" ? "data912" : "ArgentinaDatos"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(row.updatedAt)}
                    </td>
                  </tr>
                ))}
                {filteredPrices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No hay cotizaciones para ese filtro.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </AdvisorShell>
  );
}

function statusLabel(status: MarketDataStatus) {
  switch (status) {
    case "live":
      return "Feed live";
    case "partial":
      return "Cobertura parcial";
    case "fallback":
      return "Fallback";
    default:
      return "Sin configurar";
  }
}

function statusBadgeVariant(
  status: MarketDataStatus,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "live":
      return "default";
    case "partial":
      return "secondary";
    default:
      return "outline";
  }
}

function formatMoney(value: number | null | undefined, currency = "ARS") {
  if (value == null) return "N/D";
  const prefix = currency.startsWith("USD") ? "US$ " : "$ ";
  return `${prefix}${value.toLocaleString("es-AR", {
    maximumFractionDigits: currency.startsWith("USD") ? 6 : 4,
  })}`;
}

function formatPct(value: number | null | undefined) {
  if (value == null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "N/D";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
