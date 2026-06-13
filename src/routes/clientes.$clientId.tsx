import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Landmark, Wallet } from "lucide-react";
import { AdvisorShell } from "@/components/AdvisorShell";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadClientDetail } from "@/lib/server/crm-server-functions";

export const Route = createFileRoute("/clientes/$clientId")({
  loader: ({ params }) => loadClientDetail({ data: { clientId: params.clientId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.client.name ?? "Cliente"} | Apex Wealth Hub` }],
  }),
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const data = Route.useLoaderData();

  return (
    <AdvisorShell>
      <div className="space-y-6">
        <Link to="/clientes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver a clientes
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-primary">{data.client.type}</p>
            <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">{data.client.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {data.client.legalName || data.client.notes || "Cliente con consolidación multi-custodio activa."}
            </p>
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

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Valuacion ARS" value={data.totals.totalValueArs.toLocaleString("es-AR")} hint="Portfolio consolidado" />
          <StatCard label="Valuacion USD" value={data.totals.totalValueUsd?.toLocaleString("es-AR") ?? "N/D"} hint="Tipo de cambio de referencia" />
          <StatCard label="PnL" value={data.totals.pnlAmountArs?.toLocaleString("es-AR") ?? "N/D"} hint="Cuando existe costo/PPC" accent={data.totals.pnlAmountArs != null && data.totals.pnlAmountArs >= 0 ? "success" : "destructive"} />
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          <Section className="xl:col-span-8" title="Tenencias consolidadas" subtitle="Detalle por cuenta y custodio" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-4 py-3">Activo</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Custodio</th>
                    <th className="px-4 py-3">Cuenta</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3 text-right">PPC</th>
                    <th className="px-4 py-3 text-right">Valuacion ARS</th>
                    <th className="px-4 py-3 text-right">PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {data.holdings.map((holding) => (
                    <tr key={holding.id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{holding.symbol}</div>
                        <div className="text-xs text-muted-foreground">{holding.assetName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{holding.assetClass}</Badge>
                      </td>
                      <td className="px-4 py-3">{holding.custodianName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{holding.accountName}</td>
                      <td className="px-4 py-3 text-right">{holding.quantity.toLocaleString("es-AR")}</td>
                      <td className="px-4 py-3 text-right">{holding.marketPrice?.toLocaleString("es-AR") ?? "-"}</td>
                      <td className="px-4 py-3 text-right">{holding.averageCost?.toLocaleString("es-AR") ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-medium">{holding.marketValueArs.toLocaleString("es-AR")}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={holding.pnlAmountArs != null && holding.pnlAmountArs >= 0 ? "text-success" : "text-destructive"}>
                          {holding.pnlAmountArs?.toLocaleString("es-AR") ?? "N/D"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section className="xl:col-span-4" title="Distribuciones" subtitle="Composición consolidada">
            <div className="space-y-3">
              {data.distributions.byCustodian.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Landmark className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium text-foreground">{item.value.toLocaleString("es-AR")}</span>
                </div>
              ))}
              {data.distributions.byAssetClass.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium text-foreground">{item.value.toLocaleString("es-AR")}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          <Section className="xl:col-span-7" title="Movimientos" subtitle="Historial cargado por import o edición manual" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Activo</th>
                    <th className="px-4 py-3">Custodio</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movements.map((movement) => (
                    <tr key={movement.id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3 text-muted-foreground">{movement.tradeDate}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{movement.movementType}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{movement.symbol ?? "Sin activo"}</div>
                        <div className="text-xs text-muted-foreground">{movement.description}</div>
                      </td>
                      <td className="px-4 py-3">{movement.custodianName}</td>
                      <td className="px-4 py-3 text-right">{movement.quantity?.toLocaleString("es-AR") ?? "-"}</td>
                      <td className="px-4 py-3 text-right">{movement.netAmount?.toLocaleString("es-AR") ?? movement.grossAmount?.toLocaleString("es-AR") ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section className="xl:col-span-5" title="Historial de imports" subtitle="Batches aplicados o en revisión" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-4 py-3">Archivo</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Abrir</th>
                  </tr>
                </thead>
                <tbody>
                  {data.imports.map((item) => (
                    <tr key={item.id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{item.filename}</div>
                        <div className="text-xs text-muted-foreground">{item.custodianName ?? item.detectedCustodian}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{item.reportKind}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.status === "CONFIRMED" ? "default" : "secondary"}>{item.status}</Badge>
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
