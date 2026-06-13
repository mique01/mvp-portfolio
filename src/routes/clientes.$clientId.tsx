import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  Landmark,
  Wallet,
} from "lucide-react";
import { AdvisorShell } from "@/components/AdvisorShell";
import { AllocationPie } from "@/components/AllocationPie";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { loadClientDetail } from "@/lib/server/crm-server-functions";
import type { DistributionPoint, HoldingRecord, MarketDataStatus } from "@/lib/wealth-types";

export const Route = createFileRoute("/clientes/$clientId")({
  loader: ({ params }) => loadClientDetail({ data: { clientId: params.clientId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.client.name ?? "Cliente"} | Apex Wealth Hub` }],
  }),
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const data = Route.useLoaderData();
  const recentMovements = data.movements.slice(0, 8);
  const recentImports = data.imports.slice(0, 6);
  const topAssetDistribution = takeTopSlices(data.distributions.byAsset, 6);
  const topCustodianDistribution = takeTopSlices(data.distributions.byCustodian, 6);
  const topAccountDistribution = takeTopSlices(data.distributions.byAccount, 6);
  const estimatedCount = data.holdings.filter((holding) => holding.pnlIsEstimated).length;

  return (
    <AdvisorShell>
      <div className="space-y-6">
        <Link
          to="/clientes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a clientes
        </Link>

        <section className="rounded-md border border-border bg-surface">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{data.client.type}</Badge>
                <Badge variant="secondary">{statusLabel(data.totals.marketDataStatus)}</Badge>
                {estimatedCount > 0 ? (
                  <Badge variant="secondary">{estimatedCount} posiciones con PnL estimado</Badge>
                ) : null}
              </div>
              <div>
                <h1 className="font-display text-4xl tracking-tight text-foreground">
                  {data.client.name}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {data.client.legalName ||
                    data.client.notes ||
                    "Cliente con consolidacion multi-custodio activa."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/imports">Nuevo import</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/movimientos">Ver movimientos</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Valuacion ARS"
              value={formatMoney(data.totals.totalValueArs)}
              hint="Posicion actual = ultimo snapshot + movimientos posteriores"
            />
            <StatCard
              label="Valuacion USD"
              value={formatMoney(data.totals.totalValueUsd, "USD")}
              hint={data.totals.mepRate ? `MEP ${formatCompact(data.totals.mepRate)}` : "Sin FX live"}
            />
            <StatCard
              label="PnL"
              value={formatMoney(data.totals.pnlAmountArs)}
              hint={data.totals.pnlPct != null ? `${data.totals.pnlPct.toFixed(2)}% sobre costo` : "Sin costo suficiente"}
              accent={
                data.totals.pnlAmountArs != null && data.totals.pnlAmountArs >= 0
                  ? "success"
                  : "destructive"
              }
            />
            <StatCard
              label="Cobertura"
              value={`${data.accounts.length} cuentas`}
              hint={`${data.custodians.length} ALyCs / custodios`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ultima actualizacion</span>
                <span className="font-medium text-foreground">
                  {data.totals.pricingUpdatedAt
                    ? formatDateTime(data.totals.pricingUpdatedAt)
                    : "Sin live feed"}
                </span>
              </div>
            </StatCard>
          </div>
        </section>

        <Section
          title="Distribucion consolidada"
          subtitle="Vista simple para entender peso por ALyC, activo y comitente sin bajar a tablas gigantes"
        >
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-md border border-border bg-background p-4">
              <div className="mb-4 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Por ALyC</p>
                  <p className="text-xs text-muted-foreground">Click abajo para ver subdivision</p>
                </div>
              </div>
              <AllocationPie data={topCustodianDistribution} valueFormatter={formatMoney} />
            </div>

            <div className="rounded-md border border-border bg-background p-4">
              <div className="mb-4 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Por activo</p>
                  <p className="text-xs text-muted-foreground">Top posiciones consolidadas</p>
                </div>
              </div>
              <AllocationPie data={topAssetDistribution} valueFormatter={formatMoney} />
            </div>

            <div className="rounded-md border border-border bg-background p-4">
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Por comitente / cuenta</p>
                  <p className="text-xs text-muted-foreground">Donde esta concentrado el portfolio</p>
                </div>
              </div>
              <AllocationPie data={topAccountDistribution} valueFormatter={formatMoney} />
            </div>
          </div>
        </Section>

        <Section
          title="Mapa por ALyC"
          subtitle="Cada ALyC resume valor, PnL y cuentas. Al abrir ves las posiciones de esa subdivision."
        >
          <Accordion type="single" collapsible defaultValue={data.custodians[0]?.name}>
            {data.custodians.map((custodian) => (
              <AccordionItem key={custodian.name} value={custodian.name} className="border-border">
                <AccordionTrigger className="py-4 no-underline hover:no-underline">
                  <div className="grid w-full gap-3 text-left md:grid-cols-[minmax(0,1fr)_130px_130px_90px] md:items-center">
                    <div>
                      <div className="font-medium text-foreground">{custodian.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {custodian.accounts.length} cuentas · {custodian.holdings.length} posiciones
                      </div>
                    </div>
                    <div className="num text-sm font-medium text-foreground">
                      {formatCompact(custodian.totalValueArs)}
                    </div>
                    <div
                      className={`num text-sm font-medium ${
                        (custodian.pnlAmountArs ?? 0) >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatMoney(custodian.pnlAmountArs)}
                    </div>
                    <div className="num text-right text-sm text-muted-foreground">
                      {custodian.pct.toFixed(1)}%
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-1">
                  <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="rounded-md border border-border bg-background p-4">
                      <div className="mb-3 text-sm font-medium text-foreground">
                        Distribucion interna
                      </div>
                      <AllocationPie
                        data={takeTopSlices(custodian.byAsset, 6)}
                        valueFormatter={formatMoney}
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {custodian.accounts.map((account) => (
                        <div
                          key={account.id}
                          className="rounded-md border border-border bg-background p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium text-foreground">{account.name}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {account.number || "Sin numero"} · {account.holdings.length} posiciones
                              </div>
                            </div>
                            <Badge variant="outline">{account.pct.toFixed(1)}%</Badge>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Valuacion</span>
                            <span className="num font-medium text-foreground">
                              {formatMoney(account.totalValueArs)}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">PnL</span>
                            <span
                              className={`num font-medium ${
                                (account.pnlAmountArs ?? 0) >= 0
                                  ? "text-success"
                                  : "text-destructive"
                              }`}
                            >
                              {formatMoney(account.pnlAmountArs)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="min-w-[980px] w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          <th className="px-4 py-3">Activo</th>
                          <th className="px-4 py-3">Cuenta</th>
                          <th className="px-4 py-3 text-right">Cantidad</th>
                          <th className="px-4 py-3 text-right">Precio</th>
                          <th className="px-4 py-3 text-right">Costo</th>
                          <th className="px-4 py-3 text-right">Valuacion</th>
                          <th className="px-4 py-3 text-right">PnL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {custodian.holdings.map((holding) => (
                          <tr key={holding.id} className="border-b border-border/60 last:border-b-0">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-foreground">{holding.symbol}</div>
                                <Badge variant="outline">{holding.assetClass}</Badge>
                                <Badge variant="secondary">{priceSourceLabel(holding.priceSource)}</Badge>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {holding.assetName}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              <div>{holding.accountName}</div>
                              {holding.quantityDelta !== 0 ? (
                                <div className="mt-1 text-xs text-primary">
                                  Ajustada por movimientos: {formatSignedNumber(holding.quantityDelta)}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {holding.quantity.toLocaleString("es-AR")}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatMoney(
                                holding.marketPrice,
                                holding.priceCurrency?.startsWith("USD") ? "USD" : "ARS",
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatMoney(holding.costBasisArs)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatMoney(holding.marketValueArs)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div
                                className={`num font-medium ${
                                  (holding.pnlAmountArs ?? 0) >= 0 ? "text-success" : "text-destructive"
                                }`}
                              >
                                {formatMoney(holding.pnlAmountArs)}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {holding.pnlPct != null ? `${holding.pnlPct.toFixed(2)}%` : "Sin costo"}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>

        <div className="grid gap-4 xl:grid-cols-12">
          <Section
            className="xl:col-span-7"
            title="Movimientos recientes"
            subtitle="Ultimos eventos cargados. La posicion actual solo aplica los posteriores al snapshot."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Activo</th>
                    <th className="px-4 py-3">ALyC</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3 text-right">Flujo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovements.map((movement) => (
                    <tr key={movement.id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3 text-muted-foreground">{movement.tradeDate}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{movement.movementType}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {movement.symbol ?? "Sin activo"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {movement.description ?? "Movimiento sin descripcion"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{movement.custodianName}</td>
                      <td className="px-4 py-3 text-right">
                        {movement.quantity?.toLocaleString("es-AR") ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatMoney(movement.netAmount ?? movement.grossAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            className="xl:col-span-5"
            title="Imports"
            subtitle="Control de los archivos aplicados o pendientes de revision"
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="min-w-[620px] w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="px-4 py-3">Archivo</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Abrir</th>
                  </tr>
                </thead>
                <tbody>
                  {recentImports.map((item) => (
                    <tr key={item.id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{item.filename}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.custodianName ?? item.detectedCustodian ?? "Sin custodio"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{item.reportKind}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.status === "CONFIRMED" ? "default" : "secondary"}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/imports/$importId" params={{ importId: item.id }}>
                            Abrir
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>
    </AdvisorShell>
  );
}

function statusLabel(status: MarketDataStatus) {
  switch (status) {
    case "live":
      return "Precios live";
    case "partial":
      return "Precios parciales";
    case "fallback":
      return "Fallback";
    default:
      return "Sin feed";
  }
}

function priceSourceLabel(source: HoldingRecord["priceSource"]) {
  switch (source) {
    case "LIVE_MARKET":
      return "Data912";
    case "LIVE_FUND":
      return "Fondo live";
    case "CASH":
      return "Cash";
    case "MANUAL":
      return "Manual";
    default:
      return "Import";
  }
}

function takeTopSlices(data: DistributionPoint[], limit: number) {
  const top = data.slice(0, limit);
  const remainder = data.slice(limit);
  if (!remainder.length) return top;

  const remainderValue = remainder.reduce((sum, item) => sum + item.value, 0);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return [
    ...top,
    {
      name: "Otros",
      value: remainderValue,
      pct: total > 0 ? Number(((remainderValue / total) * 100).toFixed(1)) : 0,
    },
  ];
}

function formatMoney(value: number | null | undefined, currency: "ARS" | "USD" = "ARS") {
  if (value == null) return "N/D";
  const prefix = currency === "USD" ? "US$ " : "$ ";
  return `${prefix}${value.toLocaleString("es-AR", {
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  })}`;
}

function formatCompact(value: number | null | undefined) {
  if (value == null) return "N/D";
  return value.toLocaleString("es-AR", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

function formatSignedNumber(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("es-AR", { maximumFractionDigits: 4 })}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
